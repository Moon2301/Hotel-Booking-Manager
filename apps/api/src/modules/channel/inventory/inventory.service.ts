import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { InventoryCalendar } from '../entities/inventory-calendar.entity';
import { Room } from '../../property/entities/room.entity';
import { RoomType } from '../../property/entities/room-type.entity';
import {
  Booking,
  BookingStatus,
} from '../../booking/entities/booking.entity';
import { BookingHold } from '../../booking/entities/booking-hold.entity';

export interface InventoryAvailabilityRow {
  roomTypeId: string;
  roomTypeName: string;
  available: number;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryCalendar)
    private readonly calendarRepo: Repository<InventoryCalendar>,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomType)
    private readonly roomTypeRepo: Repository<RoomType>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingHold)
    private readonly holdRepo: Repository<BookingHold>,
  ) {}

  /** Stay nights: from check-in through night before checkout (checkout date exclusive). */
  stayNightsFromRange(checkIn: string, checkOutExclusive: string): string[] {
    const nights: string[] = [];
    let cursor = checkIn;
    while (cursor < checkOutExclusive) {
      nights.push(cursor);
      cursor = this.addDays(cursor, 1);
    }
    return nights;
  }

  addDays(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  availableOnRow(row: InventoryCalendar): number {
    if (row.stopSell) return 0;
    return Math.max(0, row.totalAllotment - row.sold - row.held);
  }

  async computeAvailabilitySummary(
    propertyId: string,
    from: string,
    to: string,
    em: EntityManager,
  ): Promise<InventoryAvailabilityRow[]> {
    const nights = this.stayNightsFromRange(from, to);
    if (!nights.length) return [];

    const roomTypes = await em.find(RoomType, { where: { propertyId } });
    const results: InventoryAvailabilityRow[] = [];

    for (const rt of roomTypes) {
      let minAvailable = Number.MAX_SAFE_INTEGER;
      for (const night of nights) {
        const row = await this.getOrCreateRow(
          em,
          propertyId,
          rt.id,
          night,
          false,
        );
        const avail = this.availableOnRow(row);
        if (avail < minAvailable) minAvailable = avail;
      }
      results.push({
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        available:
          minAvailable === Number.MAX_SAFE_INTEGER ? 0 : minAvailable,
      });
    }

    return results;
  }

  /** Per-night availability for calendar UI (inclusive date range). */
  async computeDailyAvailabilityCalendar(
    propertyId: string,
    from: string,
    to: string,
    em: EntityManager,
  ): Promise<{
    from: string;
    to: string;
    calendars: Record<string, { date: string; available: number }[]>;
  }> {
    if (from > to) {
      return { from, to, calendars: {} };
    }

    const dates: string[] = [];
    let cursor = from;
    while (cursor <= to) {
      dates.push(cursor);
      cursor = this.addDays(cursor, 1);
      if (dates.length > 120) break;
    }

    const roomTypes = await em.find(RoomType, { where: { propertyId } });
    const calendars: Record<string, { date: string; available: number }[]> = {};

    for (const rt of roomTypes) {
      const days: { date: string; available: number }[] = [];
      for (const date of dates) {
        const row = await this.getOrCreateRow(
          em,
          propertyId,
          rt.id,
          date,
          false,
        );
        days.push({ date, available: this.availableOnRow(row) });
      }
      calendars[rt.id] = days;
    }

    return { from, to: dates[dates.length - 1] ?? to, calendars };
  }

  async assertCanReserve(
    propertyId: string,
    roomTypeId: string,
    nights: string[],
    em: EntityManager,
    units = 1,
  ): Promise<void> {
    if (!nights.length) {
      throw new ConflictException({
        code: 'ROOM_UNAVAILABLE',
        message: 'No nights selected',
      });
    }

    for (const night of nights) {
      const row = await this.getOrCreateRow(
        em,
        propertyId,
        roomTypeId,
        night,
        true,
      );
      if (this.availableOnRow(row) < units) {
        throw new ConflictException({
          code: 'ROOM_UNAVAILABLE',
          message: 'No rooms available for the selected dates',
        });
      }
    }
  }

  async adjustHeld(
    propertyId: string,
    roomTypeId: string,
    nights: string[],
    delta: number,
    em: EntityManager,
  ): Promise<void> {
    for (const night of nights) {
      const row = await this.getOrCreateRow(
        em,
        propertyId,
        roomTypeId,
        night,
        true,
      );
      row.held = Math.max(0, row.held + delta);
      if (row.held > row.totalAllotment - row.sold) {
        throw new ConflictException({
          code: 'INVENTORY_HELD_OVERFLOW',
          message: 'Hold exceeds available inventory',
        });
      }
      await em.save(row);
    }
  }

  async adjustSold(
    propertyId: string,
    roomTypeId: string,
    nights: string[],
    delta: number,
    em: EntityManager,
  ): Promise<void> {
    for (const night of nights) {
      const row = await this.getOrCreateRow(
        em,
        propertyId,
        roomTypeId,
        night,
        true,
      );
      row.sold = Math.max(0, row.sold + delta);
      if (row.sold + row.held > row.totalAllotment) {
        throw new ConflictException({
          code: 'INVENTORY_SOLD_OVERFLOW',
          message: 'Sold units exceed allotment',
        });
      }
      await em.save(row);
    }
  }

  async transferHoldToSold(
    propertyId: string,
    roomTypeId: string,
    nights: string[],
    em: EntityManager,
  ): Promise<void> {
    for (const night of nights) {
      const row = await this.getOrCreateRow(
        em,
        propertyId,
        roomTypeId,
        night,
        true,
      );
      if (row.held < 1) {
        throw new ConflictException({
          code: 'INVENTORY_HOLD_MISSING',
          message: 'No held inventory to convert',
        });
      }
      row.held -= 1;
      row.sold += 1;
      await em.save(row);
    }
  }

  /** Rebuild calendar sold/held from bookings and active holds (dev / migration). */
  async rebuildProperty(propertyId: string): Promise<{ rows: number }> {
    const roomTypes = await this.roomTypeRepo.find({ where: { propertyId } });
    let rows = 0;

    for (const rt of roomTypes) {
      const totalAllotment = await this.roomRepo.count({
        where: { propertyId, roomTypeId: rt.id },
      });

      const bookings = await this.bookingRepo.find({
        where: {
          propertyId,
          roomTypeId: rt.id,
          status: In([
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.CHECKED_OUT,
          ]),
        },
      });

      const holds = await this.holdRepo
        .createQueryBuilder('h')
        .where('h.property_id = :propertyId', { propertyId })
        .andWhere('h.room_type_id = :roomTypeId', { roomTypeId: rt.id })
        .andWhere('h.released_at IS NULL')
        .andWhere('h.booking_id IS NULL')
        .andWhere('h.expires_at > :now', { now: new Date() })
        .getMany();

      const nightSold = new Map<string, number>();
      const nightHeld = new Map<string, number>();

      for (const b of bookings) {
        const nights = this.stayNightsFromRange(b.checkIn, b.checkOut);
        for (const n of nights) {
          nightSold.set(n, (nightSold.get(n) ?? 0) + 1);
        }
      }

      for (const h of holds) {
        for (const raw of h.nights) {
          const n = String(raw).slice(0, 10);
          nightHeld.set(n, (nightHeld.get(n) ?? 0) + 1);
        }
      }

      const allNights = new Set([...nightSold.keys(), ...nightHeld.keys()]);

      for (const night of allNights) {
        let row = await this.calendarRepo.findOne({
          where: { propertyId, roomTypeId: rt.id, night },
        });
        if (!row) {
          row = this.calendarRepo.create({
            propertyId,
            roomTypeId: rt.id,
            night,
            totalAllotment,
            sold: 0,
            held: 0,
          });
        } else {
          row.totalAllotment = totalAllotment;
        }
        row.sold = nightSold.get(night) ?? 0;
        row.held = nightHeld.get(night) ?? 0;
        await this.calendarRepo.save(row);
        rows++;
      }
    }

    this.logger.log(`Rebuilt inventory for property ${propertyId}: ${rows} rows`);
    return { rows };
  }

  async rebuildAll(): Promise<void> {
    const properties = await this.roomTypeRepo
      .createQueryBuilder('rt')
      .select('DISTINCT rt.property_id', 'propertyId')
      .getRawMany<{ propertyId: string }>();

    for (const { propertyId } of properties) {
      if (propertyId) await this.rebuildProperty(propertyId);
    }
  }

  private async getOrCreateRow(
    em: EntityManager,
    propertyId: string,
    roomTypeId: string,
    night: string,
    lock: boolean,
  ): Promise<InventoryCalendar> {
    const existing = await em.findOne(InventoryCalendar, {
      where: { propertyId, roomTypeId, night },
      lock: lock ? { mode: 'pessimistic_write' } : undefined,
    });
    if (existing) {
      const total = await em.count(Room, { where: { propertyId, roomTypeId } });
      if (existing.totalAllotment !== total) {
        existing.totalAllotment = total;
        await em.save(existing);
      }
      return existing;
    }

    const totalAllotment = await em.count(Room, {
      where: { propertyId, roomTypeId },
    });
    if (!totalAllotment) {
      throw new NotFoundException(
        `No rooms configured for room type ${roomTypeId}`,
      );
    }

    const row = em.create(InventoryCalendar, {
      propertyId,
      roomTypeId,
      night,
      totalAllotment,
      sold: 0,
      held: 0,
      stopSell: false,
      minStay: 1,
      closedToArrival: false,
    });
    return em.save(row);
  }
}
