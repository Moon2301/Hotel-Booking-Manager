import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { BookingCharge, BookingChargeStatus } from './entities/booking-charge.entity';
import { ServiceItem } from './entities/service-item.entity';
import { CreateGuestServiceRequestDto } from './dto/guest-charge.dto';

@Injectable()
export class GuestStayService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingCharge)
    private readonly chargeRepo: Repository<BookingCharge>,
    @InjectRepository(ServiceItem)
    private readonly serviceRepo: Repository<ServiceItem>,
  ) {}

  private async getCheckedInBooking(bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        'Dịch vụ phòng chỉ khả dụng sau khi bạn đã check-in tại quầy lễ tân',
      );
    }
    if (!booking.roomId) {
      throw new BadRequestException('Chưa có phòng được gán — liên hệ lễ tân');
    }
    return booking;
  }

  async listServiceCatalog(bookingId: string) {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const items = await this.serviceRepo.find({
      where: { propertyId: booking.propertyId, isActive: true },
      order: { category: 'ASC', name: 'ASC' },
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      currency: item.currency,
    }));
  }

  async listServiceRequests(bookingId: string) {
    const charges = await this.chargeRepo.find({
      where: { bookingId },
      relations: ['serviceItem'],
      order: { createdAt: 'DESC' },
    });

    return charges.map((c) => ({
      id: c.id,
      description: c.description,
      quantity: c.quantity,
      unitPrice: Number(c.unitPrice),
      amount: Number(c.amount),
      currency: c.currency,
      status: c.status,
      serviceName: c.serviceItem?.name ?? null,
      category: c.serviceItem?.category ?? null,
      createdAt: c.createdAt,
    }));
  }

  async createServiceRequest(
    bookingId: string,
    dto: CreateGuestServiceRequestDto,
  ) {
    const booking = await this.getCheckedInBooking(bookingId);

    const item = await this.serviceRepo.findOne({
      where: {
        id: dto.serviceItemId,
        propertyId: booking.propertyId,
        isActive: true,
      },
    });
    if (!item) {
      throw new BadRequestException('Dịch vụ không tồn tại hoặc đã ngừng cung cấp');
    }

    const qty = Number(dto.quantity || 1);
    const unitPrice = Number(item.unitPrice);
    const amount = unitPrice * qty;
    const note = dto.note?.trim();
    let description = item.name;
    if (note) {
      description = `${item.name} — ${note}`;
    }

    const charge = this.chargeRepo.create({
      bookingId,
      roomId: booking.roomId,
      serviceItemId: item.id,
      description,
      quantity: qty,
      unitPrice,
      amount,
      currency: item.currency || 'VND',
      status: BookingChargeStatus.POSTED,
    });

    const saved = await this.chargeRepo.save(charge);
    return {
      id: saved.id,
      description: saved.description,
      quantity: saved.quantity,
      unitPrice: Number(saved.unitPrice),
      amount: Number(saved.amount),
      currency: saved.currency,
      status: saved.status,
      serviceName: item.name,
      category: item.category,
      createdAt: saved.createdAt,
    };
  }
}
