import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Invoice } from './entities/invoice.entity';
import { MailService } from './mail.service';
import { BookingService } from './booking.service';
import { createBookingQrDataUrl } from './booking-qr.util';

@Injectable()
export class BookingConfirmationService {
  private readonly logger = new Logger(BookingConfirmationService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => BookingService))
    private readonly bookingService: BookingService,
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
    if (!booking) {
      this.logger.warn(`Booking ${invoice.bookingId} not found for confirmation email`);
      return;
    }

    await this.bookingService.ensureCheckinTokenForPaidBooking(booking.id);

    if (!booking.guest?.email) {
      this.logger.warn(
        `No guest email for booking ${invoice.bookingId}`,
      );
      return;
    }

    const refreshed = await this.bookingRepo.findOne({
      where: { id: booking.id },
      relations: ['guest', 'roomType', 'property'],
    });
    if (!refreshed) return;

    const bookingCode = await this.bookingService.ensureBookingCode(
      refreshed.id,
    );

    let qrDataUrl = '';
    try {
      qrDataUrl = await createBookingQrDataUrl(bookingCode);
    } catch (err) {
      this.logger.error(`QR generation failed: ${(err as Error).message}`);
    }

    const clientUrl = this.config
      .get<string>('vnpay.clientUrl', 'http://localhost:8080')
      .replace(/\/$/, '');

    await this.mailService.sendBookingConfirmation({
      to: refreshed.guest.email,
      guestName: refreshed.guest.fullName,
      bookingId: refreshed.id,
      bookingCode,
      phone: refreshed.guest.phone,
      checkIn: String(refreshed.checkIn),
      checkOut: String(refreshed.checkOut),
      roomTypeName: refreshed.roomType?.name ?? '—',
      propertyName: refreshed.property?.name ?? 'Mango Hotel & Resort',
      totalAmount: Number(invoice.totalAmount),
      myStayUrl: `${clientUrl}/my-stay`,
      qrDataUrl,
    });
  }
}
