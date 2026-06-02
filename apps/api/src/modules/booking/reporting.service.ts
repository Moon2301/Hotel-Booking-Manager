import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Room } from '../property/entities/room.entity';
import {
  BookingCharge,
  BookingChargeStatus,
} from './entities/booking-charge.entity';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(BookingCharge)
    private chargeRepo: Repository<BookingCharge>,
  ) {}

  /**
   * Generates ADR and Occupancy for a given date range
   */
  async getPerformanceMetrics(propertyId: string, startDate: string, endDate: string) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Get total rooms for property
    const totalRooms = await this.roomRepo.count({
      where: { propertyId },
    });

    const totalAvailableRoomNights = totalRooms * (days || 1);

    // Get bookings overlapping this period
    const qb = this.bookingRepo.createQueryBuilder('booking')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('booking.status IN (:...statuses)', { 
        statuses: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT] 
      })
      .andWhere('booking.checkIn <= :end', { end: endDate })
      .andWhere('booking.checkOut >= :start', { start: startDate });

    const bookings = await qb.getMany();

    let totalRevenue = 0;
    let occupiedRoomNights = 0;

    for (const b of bookings) {
      // Calculate overlap days
      const bStart = new Date(b.checkIn).getTime() < start.getTime() ? start : new Date(b.checkIn);
      const bEnd = new Date(b.checkOut).getTime() > end.getTime() ? end : new Date(b.checkOut);
      
      const overlapDays = Math.max(0, Math.round((bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24)));
      
      occupiedRoomNights += overlapDays;

      // Approximate daily revenue (TotalAmount / total stay days) * overlap days
      const bTotalDays = Math.max(1, Math.round((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
      const dailyRate = (Number(b.totalAmount) || 0) / bTotalDays;
      totalRevenue += dailyRate * overlapDays;
    }

    const occupancyRate = totalAvailableRoomNights > 0 
      ? (occupiedRoomNights / totalAvailableRoomNights) * 100 
      : 0;
      
    const adr = occupiedRoomNights > 0 
      ? totalRevenue / occupiedRoomNights 
      : 0;

    const revPAR = totalAvailableRoomNights > 0 
      ? totalRevenue / totalAvailableRoomNights 
      : 0;

    return {
      period: { start: startDate, end: endDate, days: days || 1 },
      metrics: {
        totalRooms,
        totalAvailableRoomNights,
        occupiedRoomNights,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        totalRevenue: Math.round(totalRevenue),
        adr: Math.round(adr),
        revPAR: Math.round(revPAR),
      }
    };
  }

  /**
   * Generates daily chart data for Recharts.
   * Uses a batch approach (2 DB queries total) instead of N queries per day to avoid N+1.
   */
  async getDailyChartData(propertyId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1 query: all bookings overlapping the range
    const bookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT],
      })
      .andWhere('booking.checkIn <= :end', { end: endDate })
      .andWhere('booking.checkOut >= :start', { start: startDate })
      .getMany();

    // 1 query: total rooms in property
    const totalRooms = await this.roomRepo.count({ where: { propertyId } });

    // Compute metrics per-day in-memory — no extra DB calls per day
    const data: any[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

      let occupiedRoomNights = 0;
      let totalRevenue = 0;

      for (const b of bookings) {
        const bCheckIn = new Date(b.checkIn);
        const bCheckOut = new Date(b.checkOut);

        // Booking overlaps this calendar day
        if (bCheckIn <= dayEnd && bCheckOut > dayStart) {
          occupiedRoomNights += 1;
          const bTotalDays = Math.max(
            1,
            Math.round((bCheckOut.getTime() - bCheckIn.getTime()) / (1000 * 60 * 60 * 24)),
          );
          totalRevenue += (Number(b.totalAmount) || 0) / bTotalDays;
        }
      }

      const occupancyRate =
        totalRooms > 0 ? (occupiedRoomNights / totalRooms) * 100 : 0;
      const adr = occupiedRoomNights > 0 ? totalRevenue / occupiedRoomNights : 0;

      data.push({
        date: dateStr,
        adr: Math.round(adr),
        occupancy: Math.round(occupancyRate * 100) / 100,
        revenue: Math.round(totalRevenue),
        roomsBooked: occupiedRoomNights,
      });
    }

    return data;
  }

  /**
   * Room-nights per room type for a single calendar day (pie chart).
   */
  async getRoomTypeMixForDate(propertyId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const bookings = await this.bookingRepo.find({
      where: {
        propertyId,
        status: In([
          BookingStatus.CONFIRMED,
          BookingStatus.CHECKED_IN,
          BookingStatus.CHECKED_OUT,
        ]),
      },
      relations: ['roomType'],
    });

    const counts = new Map<
      string,
      { roomTypeId: string; roomTypeName: string; roomsBooked: number }
    >();

    for (const b of bookings) {
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      if (checkOut <= dayStart || checkIn > dayEnd) continue;

      const name = b.roomType?.name ?? 'Khác';
      const key = b.roomTypeId;
      const prev = counts.get(key) ?? {
        roomTypeId: key,
        roomTypeName: name,
        roomsBooked: 0,
      };
      prev.roomsBooked += 1;
      counts.set(key, prev);
    }

    const items = Array.from(counts.values());
    const total = items.reduce((s, i) => s + i.roomsBooked, 0);

    return {
      date,
      totalRoomsBooked: total,
      items: items.map((i) => ({
        ...i,
        sharePercent:
          total > 0
            ? Math.round((i.roomsBooked / total) * 1000) / 10
            : 0,
      })),
    };
  }

  /**
   * Revenue breakdown for one calendar day (drill-down from daily chart).
   */
  async getDailyRevenueDetail(propertyId: string, date: string) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    const bookings = await this.bookingRepo.find({
      where: {
        propertyId,
        status: In([
          BookingStatus.CONFIRMED,
          BookingStatus.CHECKED_IN,
          BookingStatus.CHECKED_OUT,
        ]),
      },
      relations: ['roomType'],
    });

    const byRoomType = new Map<
      string,
      {
        roomTypeId: string;
        roomTypeName: string;
        roomsBooked: number;
        roomRevenue: number;
      }
    >();

    let roomRevenueTotal = 0;
    let roomsBookedTotal = 0;

    for (const b of bookings) {
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      if (checkOut <= start || checkIn > end) continue;

      const bStart =
        checkIn.getTime() < start.getTime() ? start : checkIn;
      const bEnd =
        checkOut.getTime() > end.getTime() ? end : checkOut;
      const overlapDays = Math.max(
        0,
        Math.round(
          (bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      if (overlapDays <= 0) continue;

      const stayDays = Math.max(
        1,
        Math.round(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      const dailyRate = (Number(b.totalAmount) || 0) / stayDays;
      const dayRevenue = dailyRate * overlapDays;

      roomRevenueTotal += dayRevenue;
      roomsBookedTotal += overlapDays;

      const name = b.roomType?.name ?? 'Khác';
      const key = b.roomTypeId;
      const prev = byRoomType.get(key) ?? {
        roomTypeId: key,
        roomTypeName: name,
        roomsBooked: 0,
        roomRevenue: 0,
      };
      prev.roomsBooked += overlapDays;
      prev.roomRevenue += dayRevenue;
      byRoomType.set(key, prev);
    }

    const roomTypeRows = Array.from(byRoomType.values())
      .map((row) => ({
        ...row,
        roomRevenue: Math.round(row.roomRevenue),
        sharePercent:
          roomRevenueTotal > 0
            ? Math.round((row.roomRevenue / roomRevenueTotal) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.roomRevenue - a.roomRevenue);

    const charges = await this.chargeRepo
      .createQueryBuilder('charge')
      .innerJoin('charge.booking', 'booking')
      .where('booking.propertyId = :propertyId', { propertyId })
      .andWhere('charge.status = :status', {
        status: BookingChargeStatus.POSTED,
      })
      .andWhere('charge.createdAt BETWEEN :start AND :end', { start, end })
      .orderBy('charge.createdAt', 'DESC')
      .getMany();

    const serviceRevenue = charges.reduce(
      (s, c) => s + Number(c.amount),
      0,
    );

    return {
      date,
      summary: {
        totalRevenue: Math.round(roomRevenueTotal + serviceRevenue),
        roomRevenue: Math.round(roomRevenueTotal),
        serviceRevenue: Math.round(serviceRevenue),
        roomsBooked: roomsBookedTotal,
      },
      byRoomType: roomTypeRows,
      serviceCharges: charges.map((c) => ({
        id: c.id,
        description: c.description,
        quantity: c.quantity,
        amount: Number(c.amount),
        createdAt: c.createdAt,
      })),
    };
  }
}
