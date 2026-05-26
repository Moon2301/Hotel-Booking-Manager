import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { Auth } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';
import { Booking } from './entities/booking.entity';
import { BookingCharge, BookingChargeStatus } from './entities/booking-charge.entity';
import { ServiceItem } from './entities/service-item.entity';
import { CreateBookingChargeDto } from './dto/charge.dto';

@ApiTags('Booking Charges')
@Controller('bookings/:bookingId/charges')
export class BookingChargesController {
  constructor(
    @InjectRepository(BookingCharge)
    private readonly chargeRepo: Repository<BookingCharge>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(ServiceItem)
    private readonly serviceRepo: Repository<ServiceItem>,
  ) {}

  @Get()
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPPORT,
    UserRole.HOUSEKEEPING,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List posted charges for a booking (room folio)' })
  async list(@Param('bookingId') bookingId: string) {
    return this.chargeRepo.find({
      where: { bookingId } as any,
      order: { createdAt: 'DESC' } as any,
    });
  }

  @Post()
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.SUPPORT,
    UserRole.HOUSEKEEPING,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a charge to room (booking)' })
  async create(
    @Param('bookingId') bookingId: string,
    @Body() dto: CreateBookingChargeDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new BadRequestException('Booking not found');
    if (!booking.roomId) throw new BadRequestException('Booking has no room assigned');

    let unitPrice = dto.unitPrice ?? 0;
    let description = dto.description || null;
    let serviceItemId: string | null = null;

    if (dto.serviceItemId) {
      const item = await this.serviceRepo.findOne({
        where: { id: dto.serviceItemId, propertyId: booking.propertyId } as any,
      });
      if (!item) throw new BadRequestException('Service item not found');
      serviceItemId = item.id;
      unitPrice = Number(item.unitPrice);
      description = description || item.name;
    }

    if (!dto.serviceItemId && unitPrice <= 0) {
      throw new BadRequestException('unitPrice is required for custom charge');
    }

    const qty = Number(dto.quantity || 1);
    const amount = Number(unitPrice) * qty;

    const charge = this.chargeRepo.create({
      bookingId,
      roomId: booking.roomId,
      serviceItemId: serviceItemId as any,
      description: description as any,
      quantity: qty,
      unitPrice: unitPrice as any,
      amount: amount as any,
      currency: 'VND',
      status: BookingChargeStatus.POSTED,
      createdBy: req.user.id,
    });

    return this.chargeRepo.save(charge);
  }

  @Patch(':chargeId/void')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Void a posted charge' })
  async voidCharge(
    @Param('bookingId') bookingId: string,
    @Param('chargeId') chargeId: string,
  ) {
    const charge = await this.chargeRepo.findOne({
      where: { id: chargeId, bookingId } as any,
    });
    if (!charge) return null;
    charge.status = BookingChargeStatus.VOID;
    return this.chargeRepo.save(charge);
  }
}

