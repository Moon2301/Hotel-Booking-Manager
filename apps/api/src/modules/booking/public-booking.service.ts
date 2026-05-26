import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { BookingService } from './booking.service';
import { InvoiceService } from './invoice.service';
import { InvoiceType } from './entities/invoice.entity';
import { GuestService } from '../guest/guest.service';
import { VnpayService } from '../payment/vnpay.service';
import { Property } from '../property/entities/property.entity';
import { RoomType } from '../property/entities/room-type.entity';
import { User } from '../auth/entities/user.entity';
import { DailyRate } from '../pricing/entities/daily-rate.entity';
import { Booking } from './entities/booking.entity';
import {
  CreateHoldDto,
  AvailabilityQueryDto,
} from './dto/booking.dto';
import { PublicCheckoutDto, PublicQuoteQueryDto } from './dto/public-booking.dto';

@Injectable()
export class PublicBookingService {
  constructor(
    private readonly bookingService: BookingService,
    private readonly guestService: GuestService,
    private readonly invoiceService: InvoiceService,
    private readonly vnpayService: VnpayService,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(RoomType)
    private readonly roomTypeRepo: Repository<RoomType>,
    @InjectRepository(DailyRate)
    private readonly dailyRateRepo: Repository<DailyRate>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getCatalog() {
    const properties = await this.propertyRepo.find({
      order: { createdAt: 'ASC' },
    });

    const catalog = await Promise.all(
      properties.map(async (property) => {
        const roomTypes = await this.roomTypeRepo.find({
          where: { propertyId: property.id },
          order: { basePrice: 'ASC' },
        });
        return {
          id: property.id,
          name: property.name,
          address: property.address,
          holdTtlSeconds: property.holdTtlSeconds,
          roomTypes: roomTypes.map((rt) => ({
            id: rt.id,
            name: rt.name,
            basePrice: Number(rt.basePrice),
            maxOccupancy: rt.maxOccupancy,
            description: rt.description,
            amenities: rt.amenities,
          })),
        };
      }),
    );

    return { properties: catalog };
  }

  checkAvailability(query: AvailabilityQueryDto) {
    return this.bookingService.checkAvailability(query);
  }

  async getQuote(query: PublicQuoteQueryDto) {
    const { propertyId, roomTypeId, checkIn, checkOut } = query;
    const roomType = await this.roomTypeRepo.findOne({
      where: { id: roomTypeId, propertyId },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    const nights = this.bookingService.generateNightDatesPublic(
      checkIn,
      checkOut,
    );
    if (nights.length === 0) {
      return { nights: [], totalAmount: 0, currency: 'VND' };
    }

    let totalAmount = 0;
    const nightly: { night: string; amount: number }[] = [];

    for (const night of nights) {
      const rate = await this.dailyRateRepo.findOne({
        where: { propertyId, roomTypeId, night },
      });
      const amount = rate ? Number(rate.amount) : Number(roomType.basePrice);
      nightly.push({ night, amount });
      totalAmount += amount;
    }

    return {
      nights: nightly,
      totalAmount,
      currency: 'VND',
      roomTypeName: roomType.name,
    };
  }

  createHold(dto: CreateHoldDto) {
    return this.bookingService.createHold(dto);
  }

  async checkout(dto: PublicCheckoutDto, ipAddr: string) {
    const guest = await this.guestService.findOrCreate({
      fullName: dto.fullName.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone.trim(),
    });

    const idempotencyKey = `public-hold-${dto.holdId}`;
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ holdId: dto.holdId, guestId: guest.id }))
      .digest('hex');

    const systemUser = await this.userRepo.findOne({
      where: { email: 'admin@hotel.com' },
    });
    if (!systemUser) {
      throw new NotFoundException('System user not configured for public booking');
    }

    const booking = await this.bookingService.createBooking(
      idempotencyKey,
      { holdId: dto.holdId, guestId: guest.id },
      requestHash,
      systemUser.id,
    );

    const invoice = await this.invoiceService.createInvoice(
      booking.id,
      Number(booking.totalAmount),
      InvoiceType.DEPOSIT,
    );

    const paymentUrl = this.vnpayService.createPaymentUrl(
      invoice.id,
      Number(invoice.totalAmount),
      ipAddr,
    );

    const full = await this.bookingRepo.findOne({
      where: { id: booking.id },
      relations: ['roomType', 'property'],
    });

    return {
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.status,
        totalAmount: Number(booking.totalAmount),
        propertyName: full?.property?.name,
        roomTypeName: full?.roomType?.name,
      },
      guest: {
        fullName: guest.fullName,
        email: guest.email,
        phone: guest.phone,
      },
      invoice: {
        id: invoice.id,
        totalAmount: Number(invoice.totalAmount),
        paymentStatus: invoice.paymentStatus,
      },
      paymentUrl,
    };
  }

  async getConfirmation(bookingId: string, phone: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['guest', 'roomType', 'property'],
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const normalizedPhone = phone.trim();
    if (booking.guest.phone !== normalizedPhone) {
      throw new ForbiddenException('Phone number does not match this booking');
    }

    const invoice = await this.invoiceService.getInvoiceByBooking(bookingId);

    return {
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmount: Number(booking.totalAmount),
      },
      guest: {
        fullName: booking.guest.fullName,
        email: booking.guest.email,
        phone: booking.guest.phone,
      },
      roomType: booking.roomType
        ? { id: booking.roomType.id, name: booking.roomType.name }
        : null,
      property: booking.property
        ? {
            id: booking.property.id,
            name: booking.property.name,
            address: booking.property.address,
          }
        : null,
      invoice: invoice
        ? {
            id: invoice.id,
            totalAmount: Number(invoice.totalAmount),
            paymentStatus: invoice.paymentStatus,
            paidAt: invoice.paidAt,
          }
        : null,
    };
  }
}
