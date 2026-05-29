import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Room } from '../property/entities/room.entity';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
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
      });
    }

    return data;
  }
}
