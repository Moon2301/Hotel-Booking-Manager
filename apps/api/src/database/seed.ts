import { DataSource } from 'typeorm';
import { User, UserRole } from '../modules/auth/entities/user.entity';
import { Property } from '../modules/property/entities/property.entity';
import { RoomType } from '../modules/property/entities/room-type.entity';
import { Room } from '../modules/property/entities/room.entity';
import { Guest } from '../modules/guest/entities/guest.entity';
import { Booking, BookingStatus, PaymentStatus as BookingPaymentStatus } from '../modules/booking/entities/booking.entity';
import { Invoice, PaymentMethod } from '../modules/booking/entities/invoice.entity';
import { Task, TaskType, TaskStatus } from '../modules/task/entities/task.entity';
import { Review, ReviewStatus } from '../modules/review/entities/review.entity';
import * as bcrypt from 'bcrypt';

export const seedData = async (dataSource: DataSource) => {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Seed Users
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const admin = queryRunner.manager.create(User, {
      email: 'admin@hotel.com',
      passwordHash,
      fullName: 'System Admin',
      role: UserRole.SUPER_ADMIN,
    });
    
    const guest = queryRunner.manager.create(User, {
      email: 'guest@example.com',
      passwordHash,
      fullName: 'John Doe',
      role: UserRole.SUPPORT,
    });

    await queryRunner.manager.save([admin, guest]);

    // 2. Seed Property
    const property = queryRunner.manager.create(Property, {
      name: 'Grand Luxury Resort',
      address: '123 Vo Nguyen Giap, Da Nang',
      ianaTimezone: 'Asia/Ho_Chi_Minh',
      holdTtlSeconds: 600,
    });
    await queryRunner.manager.save(property);

    // 3. Seed RoomType
    const deluxeRoom = queryRunner.manager.create(RoomType, {
      propertyId: property.id,
      name: 'Deluxe Sea View',
      basePrice: 2000000,
      maxOccupancy: 2,
    });
    await queryRunner.manager.save(deluxeRoom);

    // 4. Seed Physical Room
    const room101 = queryRunner.manager.create(Room, {
      propertyId: property.id,
      roomTypeId: deluxeRoom.id,
      roomNumber: '101',
      floor: 1,
    });
    await queryRunner.manager.save(room101);

    // 5. Seed Guest
    const testGuest = queryRunner.manager.create(Guest, {
      fullName: 'Tran Van Khach',
      email: 'khachhang@example.com',
      phone: '0912345678',
    });
    await queryRunner.manager.save(testGuest);

    // 6. Seed Booking
    const booking = queryRunner.manager.create(Booking, {
      propertyId: property.id,
      roomId: room101.id,
      roomTypeId: deluxeRoom.id,
      guestId: testGuest.id,
      status: BookingStatus.CHECKED_IN,
      checkIn: new Date(Date.now() - 86400000).toISOString().split('T')[0], // format as string
      checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0], // format as string
      paymentStatus: BookingPaymentStatus.PAID,
    } as any);
    await queryRunner.manager.save(booking);

    // 7. Seed Invoice
    const invoice = queryRunner.manager.create(Invoice, {
      bookingId: booking.id,
      totalAmount: 2000000,
      paymentStatus: BookingPaymentStatus.PAID,
      paymentMethod: PaymentMethod.VNPAY,
      vnpayTransactionId: 'VNP123456789',
      issuedAt: new Date(Date.now() - 86400000),
      paidAt: new Date(Date.now() - 86400000),
    });
    await queryRunner.manager.save(invoice);

    // 8. Seed Task
    const task = queryRunner.manager.create(Task, {
      bookingId: booking.id,
      type: TaskType.CLEANING,
      status: TaskStatus.PENDING,
      guestNote: 'Vui lòng dọn phòng giúp tôi lúc 10h',
    });
    await queryRunner.manager.save(task);

    // 9. Seed Review
    const review = queryRunner.manager.create(Review, {
      propertyId: property.id,
      bookingId: booking.id,
      guestId: testGuest.id,
      rating: 5,
      content: 'Khách sạn rất tuyệt vời, phòng ốc sạch sẽ, nhân viên thân thiện.',
      status: ReviewStatus.PUBLISHED,
    });
    await queryRunner.manager.save(review);

    await queryRunner.commitTransaction();
    console.log('✅ Seeding completed successfully with corrected entity fields');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Seeding failed', err);
  } finally {
    await queryRunner.release();
  }
};
