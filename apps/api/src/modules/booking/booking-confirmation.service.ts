import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { Booking } from './entities/booking.entity';
import { Invoice } from './entities/invoice.entity';
import { MailService } from './mail.service';
import {
  buildBookingQrPayload,
  hashBookingVerificationCode,
} from './booking-token.util';

@Injectable()
export class BookingConfirmationService {
  private readonly logger = new Logger(BookingConfirmationService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async sendPaymentSuccessEmail(invoiceId: string): Promise<void> {
    const secret = this.config.get<string>('booking.qrSecret', '');
    if (!secret) {
      this.logger.warn(
        'BOOKING_QR_SECRET not set — skip confirmation email',
      );
      return;
    }

    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
    });
    if (!invoice) {
      this.logger.warn(`Invoice ${invoiceId} not found for confirmation email`);
      return;
    }

    const booking = await this.bookingRepo.findOne({
      where: { id: invoice.bookingId },
      relations: ['guest', 'roomType', 'property'],
    });
    if (!booking?.guest?.email) {
      this.logger.warn(
        `No guest email for booking ${invoice.bookingId}`,
      );
      return;
    }

    const verificationCode = hashBookingVerificationCode(
      booking.id,
      secret,
    );
    const qrPayload = buildBookingQrPayload(booking.id, secret);

    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 260,
        margin: 2,
      });
    } catch (err) {
      this.logger.error(`QR generation failed: ${(err as Error).message}`);
    }

    const clientUrl = this.config
      .get<string>('vnpay.clientUrl', 'http://localhost:8080')
      .replace(/\/$/, '');

    await this.mailService.sendBookingConfirmation({
      to: booking.guest.email,
      guestName: booking.guest.fullName,
      bookingId: booking.id,
      phone: booking.guest.phone,
      verificationCode,
      checkIn: String(booking.checkIn),
      checkOut: String(booking.checkOut),
      roomTypeName: booking.roomType?.name ?? '—',
      propertyName: booking.property?.name ?? 'Mango Hotel & Resort',
      totalAmount: Number(invoice.totalAmount),
      myStayUrl: `${clientUrl}/my-stay`,
      qrDataUrl,
    });
  }
}
