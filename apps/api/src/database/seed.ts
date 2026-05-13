import { DataSource } from 'typeorm';
import { User, UserRole } from '../modules/auth/entities/user.entity';
import { Property } from '../modules/property/entities/property.entity';
import { RoomType } from '../modules/property/entities/room-type.entity';
import { Room } from '../modules/property/entities/room.entity';
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
      role: UserRole.SUPPORT, // For testing flow, guest is just a user
    });

    await queryRunner.manager.save([admin, guest]);

    // 2. Seed Property
    const property = queryRunner.manager.create(Property, {
      name: 'Grand Luxury Resort',
      address: '123 Vo Nguyen Giap, Da Nang',
      ianaTimezone: 'Asia/Ho_Chi_Minh',
    });
    await queryRunner.manager.save(property);

    // 3. Seed RoomType
    const deluxeRoom = queryRunner.manager.create(RoomType, {
      propertyId: property.id,
      name: 'Deluxe Sea View',
      basePrice: 2000000,
      capacity: 2,
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

    await queryRunner.commitTransaction();
    console.log('✅ Seeding completed successfully');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Seeding failed', err);
  } finally {
    await queryRunner.release();
  }
};
