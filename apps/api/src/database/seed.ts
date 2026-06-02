import { DataSource } from 'typeorm';
import { User, UserRole } from '../modules/auth/entities/user.entity';
import { Property } from '../modules/property/entities/property.entity';
import { RoomType } from '../modules/property/entities/room-type.entity';
import { Room } from '../modules/property/entities/room.entity';
import { Guest } from '../modules/guest/entities/guest.entity';
import {
  Booking,
  BookingStatus,
  PaymentStatus as BookingPaymentStatus,
} from '../modules/booking/entities/booking.entity';
import { Invoice, PaymentMethod } from '../modules/booking/entities/invoice.entity';
import { Task, TaskType, TaskStatus } from '../modules/task/entities/task.entity';
import { Review, ReviewStatus } from '../modules/review/entities/review.entity';
import {
  ServiceItem,
  type ServiceCategory,
} from '../modules/booking/entities/service-item.entity';
import { RoomStatus } from '../modules/property/entities/room.entity';
import {
  DailyRate,
  RateSource,
} from '../modules/pricing/entities/daily-rate.entity';
import { InvoiceType } from '../modules/booking/entities/invoice.entity';

const PROPERTY_NAME = 'Mango Hotel & Resort';

const SERVICE_CATALOG: Array<{
  name: string;
  category: ServiceCategory;
  unit: string;
  unitPrice: number;
  isActive?: boolean;
}> = [
  // Ăn uống
  { name: 'Bữa sáng buffet', category: 'FOOD', unit: 'suất', unitPrice: 250_000 },
  { name: 'Set trưa Mango', category: 'FOOD', unit: 'suất', unitPrice: 320_000 },
  { name: 'Set tối hải sản', category: 'FOOD', unit: 'suất', unitPrice: 450_000 },
  { name: 'Room service đêm muộn', category: 'FOOD', unit: 'suất', unitPrice: 180_000 },
  { name: 'Cà phê phin / trà', category: 'FOOD', unit: 'ly', unitPrice: 45_000 },
  { name: 'Suất ăn trẻ em', category: 'FOOD', unit: 'suất', unitPrice: 120_000 },
  { name: 'Bánh sinh nhật (size M)', category: 'FOOD', unit: 'cái', unitPrice: 380_000 },
  // Giặt ủi
  { name: 'Giặt ủi (bộ)', category: 'LAUNDRY', unit: 'bộ', unitPrice: 80_000 },
  { name: 'Giặt khô (áo sơ mi)', category: 'LAUNDRY', unit: 'cái', unitPrice: 35_000 },
  { name: 'Giặt khô (quần âu)', category: 'LAUNDRY', unit: 'cái', unitPrice: 40_000 },
  { name: 'Giặt khô (váy / đầm)', category: 'LAUNDRY', unit: 'cái', unitPrice: 55_000 },
  { name: 'Giặt nhanh 4h', category: 'LAUNDRY', unit: 'bộ', unitPrice: 120_000 },
  { name: 'Ủi riêng', category: 'LAUNDRY', unit: 'cái', unitPrice: 25_000 },
  // Mini bar
  { name: 'Nước suối', category: 'MINIBAR', unit: 'chai', unitPrice: 25_000 },
  { name: 'Nước ngọt có gas', category: 'MINIBAR', unit: 'lon', unitPrice: 30_000 },
  { name: 'Bia local', category: 'MINIBAR', unit: 'chai', unitPrice: 45_000 },
  { name: 'Rượu vang đỏ (ly)', category: 'MINIBAR', unit: 'ly', unitPrice: 95_000 },
  { name: 'Snack mix', category: 'MINIBAR', unit: 'gói', unitPrice: 55_000 },
  { name: 'Hạt macadamia', category: 'MINIBAR', unit: 'gói', unitPrice: 75_000 },
  { name: 'Sô-cô-la / kẹo', category: 'MINIBAR', unit: 'gói', unitPrice: 40_000 },
  // Đưa đón
  { name: 'Đưa đón sân bay (sedan)', category: 'TRANSPORT', unit: 'lượt', unitPrice: 350_000 },
  { name: 'Đưa đón sân bay (SUV 7 chỗ)', category: 'TRANSPORT', unit: 'lượt', unitPrice: 520_000 },
  { name: 'Thuê xe đạp', category: 'TRANSPORT', unit: 'ngày', unitPrice: 120_000 },
  { name: 'Thuê xe máy', category: 'TRANSPORT', unit: 'ngày', unitPrice: 180_000 },
  { name: 'City tour nửa ngày', category: 'TRANSPORT', unit: 'khách', unitPrice: 890_000 },
  { name: 'Gửi xe ô tô', category: 'TRANSPORT', unit: 'đêm', unitPrice: 150_000 },
  // Khác / tiện ích
  { name: 'Spa body massage (60 phút)', category: 'OTHER', unit: 'lần', unitPrice: 650_000 },
  { name: 'Spa body massage (90 phút)', category: 'OTHER', unit: 'lần', unitPrice: 920_000 },
  { name: 'Facial chăm sóc da', category: 'OTHER', unit: 'lần', unitPrice: 480_000 },
  { name: 'Phí muộn check-out', category: 'OTHER', unit: 'giờ', unitPrice: 200_000 },
  { name: 'Giường phụ', category: 'OTHER', unit: 'đêm', unitPrice: 350_000 },
  { name: 'Nôi em bé', category: 'OTHER', unit: 'đêm', unitPrice: 0 },
  { name: 'Phòng họp (2 giờ)', category: 'OTHER', unit: 'gói', unitPrice: 1_200_000 },
  { name: 'Gói trang trí phòng honeymoon', category: 'OTHER', unit: 'gói', unitPrice: 850_000 },
  {
    name: 'Gói picnic bãi biển (mùa thấp điểm)',
    category: 'OTHER',
    unit: 'gói',
    unitPrice: 590_000,
    isActive: false,
  },
];

async function tableExists(
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
  tableName: string,
): Promise<boolean> {
  const rows = await queryRunner.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [tableName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

interface RoomTypeSeed {
  name: string;
  basePrice: number;
  maxOccupancy: number;
  description: string;
  amenities: string[];
  rooms: { number: string; floor: number }[];
}

const ROOM_TYPES: RoomTypeSeed[] = [
  {
    name: 'Deluxe Sea View',
    basePrice: 2_200_000,
    maxOccupancy: 2,
    description:
      'Phòng 35m² hướng biển, ban công riêng, giường king, bàn làm việc và phòng tắm đứng kèm bồn tắm.',
    amenities: [
      'WiFi tốc độ cao',
      'Ban công hướng biển',
      'Minibar',
      'Bồn tắm & vòi sen',
      'Điều hòa trung tâm',
      'Smart TV 55"',
      'Két an toàn',
      'Dịch vụ phòng 24/7',
    ],
    rooms: [
      { number: '501', floor: 5 },
      { number: '502', floor: 5 },
      { number: '503', floor: 5 },
      { number: '504', floor: 5 },
    ],
  },
  {
    name: 'Superior City View',
    basePrice: 1_650_000,
    maxOccupancy: 2,
    description:
      'Phòng 28m² view thành phố, nội thất hiện đại, giường queen — lựa chọn linh hoạt cho khách công tác.',
    amenities: [
      'WiFi miễn phí',
      'View thành phố',
      'Điều hòa',
      'Smart TV',
      'Minibar',
      'Bàn làm việc',
      'Phòng tắm vòi sen',
    ],
    rooms: [
      { number: '301', floor: 3 },
      { number: '302', floor: 3 },
      { number: '303', floor: 3 },
      { number: '304', floor: 3 },
      { number: '305', floor: 3 },
    ],
  },
  {
    name: 'Standard Twin',
    basePrice: 990_000,
    maxOccupancy: 2,
    description:
      'Phòng tiêu chuẩn 24m² với 2 giường đơn, phù hợp bạn bè hoặc đồng nghiệp đi công tác.',
    amenities: [
      'WiFi miễn phí',
      '2 giường đơn',
      'Điều hòa',
      'TV cáp',
      'Nước uống miễn phí',
      'Phòng tắm riêng',
    ],
    rooms: [
      { number: '201', floor: 2 },
      { number: '202', floor: 2 },
      { number: '203', floor: 2 },
      { number: '204', floor: 2 },
      { number: '205', floor: 2 },
      { number: '206', floor: 2 },
    ],
  },
  {
    name: 'Family Suite',
    basePrice: 3_800_000,
    maxOccupancy: 4,
    description:
      'Suite 55m² gồm phòng khách và phòng ngủ riêng, sofa bed, bếp lạnh — lý tưởng cho gia đình.',
    amenities: [
      'Phòng khách riêng',
      '2 khu vực ngủ',
      'Bếp lạnh',
      'Máy giặt sấy',
      'WiFi & Smart TV',
      'Bồn tắm lớn',
      'Dịch vụ giặt ủi',
    ],
    rooms: [
      { number: '601', floor: 6 },
      { number: '602', floor: 6 },
    ],
  },
  {
    name: 'Premier Ocean Suite',
    basePrice: 5_500_000,
    maxOccupancy: 3,
    description:
      'Suite cao cấp 65m² sát biển, bồn tắm view biển, minibar cao cấp và khu tiếp khách riêng.',
    amenities: [
      'View panorama biển',
      'Bồn tắm view biển',
      'Minibar cao cấp',
      'Hệ thống âm thanh',
      'Smart TV 65"',
      'Dịch vụ butler',
      'WiFi tốc độ cao',
    ],
    rooms: [
      { number: '701', floor: 7 },
      { number: '702', floor: 7 },
    ],
  },
  {
    name: 'Presidential Villa',
    basePrice: 12_000_000,
    maxOccupancy: 6,
    description:
      'Villa riêng 120m² có hồ bơi mini, sân vườn, 2 phòng ngủ và quản gia — đỉnh cao trải nghiệm Mango.',
    amenities: [
      'Hồ bơi riêng',
      'Sân vườn',
      '2 phòng ngủ master',
      'Bếp đầy đủ',
      'Quản gia 24/7',
      'Xe đưa đón riêng',
      'Minibar premium',
    ],
    rooms: [{ number: 'V01', floor: 1 }],
  },
];

async function ensureServiceCatalog(
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
  property: Property,
): Promise<{ added: number; total: number }> {
  if (!(await tableExists(queryRunner, 'service_items'))) {
    return { added: 0, total: 0 };
  }
  let added = 0;
  for (const spec of SERVICE_CATALOG) {
    const exists = await queryRunner.manager.findOne(ServiceItem, {
      where: { propertyId: property.id, name: spec.name },
    });
    if (exists) continue;
    await queryRunner.manager.save(
      queryRunner.manager.create(ServiceItem, {
        propertyId: property.id,
        name: spec.name,
        category: spec.category,
        unit: spec.unit,
        unitPrice: spec.unitPrice,
        currency: 'VND',
        isActive: spec.isActive ?? true,
      }),
    );
    added++;
  }
  const total = await queryRunner.manager.count(ServiceItem, {
    where: { propertyId: property.id },
  });
  return { added, total };
}

/** Trạng thái phòng demo cho Room Board */
const DEMO_ROOM_STATUS: Record<string, RoomStatus> = {
  '501': RoomStatus.OCCUPIED,
  '502': RoomStatus.RESERVED,
  '503': RoomStatus.CLEANING,
  '504': RoomStatus.AVAILABLE,
  '301': RoomStatus.OCCUPIED,
  '302': RoomStatus.RESERVED,
  '303': RoomStatus.MAINTENANCE,
  '304': RoomStatus.AVAILABLE,
  '305': RoomStatus.CLEANING,
  '201': RoomStatus.AVAILABLE,
  '202': RoomStatus.AVAILABLE,
  '203': RoomStatus.CLEANING,
  '204': RoomStatus.RESERVED,
  '205': RoomStatus.AVAILABLE,
  '206': RoomStatus.MAINTENANCE,
  '601': RoomStatus.OCCUPIED,
  '602': RoomStatus.AVAILABLE,
  '701': RoomStatus.RESERVED,
  '702': RoomStatus.OCCUPIED,
  V01: RoomStatus.AVAILABLE,
};

type DemoBookingSpec = {
  guestName: string;
  email: string;
  phone: string;
  roomNumber: string;
  status: BookingStatus;
  checkInDaysFromNow: number;
  nights: number;
  paymentStatus: BookingPaymentStatus;
};

const DEMO_BOOKINGS: DemoBookingSpec[] = [
  {
    guestName: 'Nguyễn Thị Lan',
    email: 'lan.nguyen@example.com',
    phone: '0901000001',
    roomNumber: '301',
    status: BookingStatus.CHECKED_IN,
    checkInDaysFromNow: -1,
    nights: 3,
    paymentStatus: BookingPaymentStatus.PAID,
  },
  {
    guestName: 'Trần Quốc Huy',
    email: 'huy.tran@example.com',
    phone: '0901000002',
    roomNumber: '502',
    status: BookingStatus.CONFIRMED,
    checkInDaysFromNow: 1,
    nights: 2,
    paymentStatus: BookingPaymentStatus.PAID,
  },
  {
    guestName: 'Phạm Minh Châu',
    email: 'chau.pham@example.com',
    phone: '0901000003',
    roomNumber: '204',
    status: BookingStatus.CONFIRMED,
    checkInDaysFromNow: 2,
    nights: 1,
    paymentStatus: BookingPaymentStatus.PAID,
  },
  {
    guestName: 'Lê Hoàng Nam',
    email: 'nam.le@example.com',
    phone: '0901000004',
    roomNumber: '701',
    status: BookingStatus.CONFIRMED,
    checkInDaysFromNow: 3,
    nights: 2,
    paymentStatus: BookingPaymentStatus.PAID,
  },
  {
    guestName: 'Võ Thị Mai',
    email: 'mai.vo@example.com',
    phone: '0901000005',
    roomNumber: '702',
    status: BookingStatus.CHECKED_IN,
    checkInDaysFromNow: 0,
    nights: 4,
    paymentStatus: BookingPaymentStatus.PAID,
  },
  {
    guestName: 'Hoàng Văn Đức',
    email: 'duc.hoang@example.com',
    phone: '0901000006',
    roomNumber: '601',
    status: BookingStatus.CHECKED_IN,
    checkInDaysFromNow: -2,
    nights: 5,
    paymentStatus: BookingPaymentStatus.PAID,
  },
];

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function ensureDailyRates(
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
  property: Property,
): Promise<number> {
  if (!(await tableExists(queryRunner, 'daily_rate'))) return 0;

  const roomTypes = await queryRunner.manager.find(RoomType, {
    where: { propertyId: property.id },
  });
  let added = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const rt of roomTypes) {
    const base = Number(rt.basePrice);
    for (let i = 0; i < 90; i++) {
      const night = addDays(today, i);
      const exists = await queryRunner.manager.findOne(DailyRate, {
        where: { propertyId: property.id, roomTypeId: rt.id, night },
      });
      if (exists) continue;

      const date = new Date(night);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const amount = Math.round(base * (isWeekend ? 1.15 : 1));

      await queryRunner.manager.save(
        queryRunner.manager.create(DailyRate, {
          propertyId: property.id,
          roomTypeId: rt.id,
          night,
          amount,
          currency: 'VND',
          taxIncluded: true,
          minStay: 1,
          closedToArrival: false,
          rateSource: RateSource.MANUAL,
        }),
      );
      added++;
    }
  }
  return added;
}

async function ensureDemoRoomStatuses(
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
  property: Property,
): Promise<number> {
  let updated = 0;
  for (const [roomNumber, status] of Object.entries(DEMO_ROOM_STATUS)) {
    const room = await queryRunner.manager.findOne(Room, {
      where: { propertyId: property.id, roomNumber },
    });
    if (!room || room.status === status) continue;
    room.status = status;
    await queryRunner.manager.save(room);
    updated++;
  }
  return updated;
}

async function ensureDemoBookings(
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
  property: Property,
): Promise<number> {
  let added = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const spec of DEMO_BOOKINGS) {
    const existing = await queryRunner.manager.findOne(Guest, {
      where: { phone: spec.phone },
    });
    if (existing) {
      const hasBooking = await queryRunner.manager.findOne(Booking, {
        where: { guestId: existing.id, propertyId: property.id },
      });
      if (hasBooking) continue;
    }

    const guest =
      existing ||
      (await queryRunner.manager.save(
        queryRunner.manager.create(Guest, {
          fullName: spec.guestName,
          email: spec.email,
          phone: spec.phone,
        }),
      ));

    const room = await queryRunner.manager.findOne(Room, {
      where: { propertyId: property.id, roomNumber: spec.roomNumber },
    });
    if (!room) continue;

    const roomType = await queryRunner.manager.findOne(RoomType, {
      where: { id: room.roomTypeId },
    });

    const checkIn = addDays(today, spec.checkInDaysFromNow);
    const checkOut = addDays(today, spec.checkInDaysFromNow + spec.nights);
    const nights = spec.nights;
    const nightly = Number(roomType?.basePrice ?? 0) || 1_000_000;
    const totalAmount = nightly * nights;

    const assignRoom =
      spec.status === BookingStatus.CHECKED_IN ||
      spec.status === BookingStatus.CONFIRMED;

    const booking = await queryRunner.manager.save(
      queryRunner.manager.create(Booking, {
        propertyId: property.id,
        ...(assignRoom ? { roomId: room.id } : {}),
        roomTypeId: room.roomTypeId,
        guestId: guest.id,
        status: spec.status,
        checkIn,
        checkOut,
        paymentStatus: spec.paymentStatus,
        totalAmount,
      }),
    );

    if (spec.paymentStatus === BookingPaymentStatus.PAID) {
      await queryRunner.manager.save(
        queryRunner.manager.create(Invoice, {
          bookingId: booking.id,
          invoiceType: InvoiceType.DEPOSIT,
          totalAmount,
          paymentStatus: BookingPaymentStatus.PAID,
          paymentMethod: PaymentMethod.VNPAY,
          vnpayTransactionId: `DEMO-${booking.id.slice(0, 8)}`,
          issuedAt: new Date(),
          paidAt: new Date(),
        }),
      );
    }

    if (
      spec.status === BookingStatus.CHECKED_IN ||
      spec.status === BookingStatus.CONFIRMED
    ) {
      const roomStatus =
        spec.status === BookingStatus.CHECKED_IN
          ? RoomStatus.OCCUPIED
          : RoomStatus.RESERVED;
      room.status = roomStatus;
      await queryRunner.manager.save(room);
    }

    added++;
  }

  return added;
}

async function ensureDemoRoomBoard(
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
  property: Property,
): Promise<{ rates: number; statuses: number; bookings: number }> {
  const rates = await ensureDailyRates(queryRunner, property);
  const statuses = await ensureDemoRoomStatuses(queryRunner, property);
  const bookings = await ensureDemoBookings(queryRunner, property);
  return { rates, statuses, bookings };
}

async function ensureRoomInventory(
  queryRunner: ReturnType<DataSource['createQueryRunner']>,
  property: Property,
) {
  let added = 0;
  for (const spec of ROOM_TYPES) {
    let roomType = await queryRunner.manager.findOne(RoomType, {
      where: { propertyId: property.id, name: spec.name },
    });
    if (!roomType) continue;

    for (const r of spec.rooms) {
      const exists = await queryRunner.manager.findOne(Room, {
        where: { propertyId: property.id, roomNumber: r.number },
      });
      if (exists) continue;
      await queryRunner.manager.save(
        queryRunner.manager.create(Room, {
          propertyId: property.id,
          roomTypeId: roomType.id,
          roomNumber: r.number,
          floor: r.floor,
        }),
      );
      added++;
    }
  }
  return added;
}

export const seedData = async (dataSource: DataSource) => {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const existingCount = await queryRunner.manager.count(RoomType);
    if (existingCount >= ROOM_TYPES.length) {
      const property =
        (await queryRunner.manager.findOne(Property, {
          where: { name: PROPERTY_NAME },
        })) ||
        (await queryRunner.manager.findOne(Property, {}));
      if (property) {
        const addedRooms = await ensureRoomInventory(queryRunner, property);
        const services = await ensureServiceCatalog(queryRunner, property);
        const demo = await ensureDemoRoomBoard(queryRunner, property);
        if (addedRooms > 0) {
          console.log(`✅ Added ${addedRooms} missing physical rooms`);
        }
        if (services.added > 0) {
          console.log(
            `✅ Bảng giá DV — thêm ${services.added} mục (tổng ${services.total})`,
          );
        }
        if (demo.rates > 0 || demo.statuses > 0 || demo.bookings > 0) {
          console.log(
            `✅ Demo room data — ${demo.rates} daily rates, ${demo.statuses} room statuses, ${demo.bookings} bookings`,
          );
        }
        if (
          addedRooms === 0 &&
          services.added === 0 &&
          demo.rates === 0 &&
          demo.statuses === 0 &&
          demo.bookings === 0
        ) {
          console.log(
            `✅ Seed skipped — already have ${existingCount} room types`,
          );
        }
      }
      await queryRunner.commitTransaction();
      return;
    }

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('password123', 10);

    let admin = await queryRunner.manager.findOne(User, {
      where: { email: 'admin@hotel.com' },
    });
    if (!admin) {
      admin = await queryRunner.manager.save(
        queryRunner.manager.create(User, {
          email: 'admin@hotel.com',
          passwordHash,
          fullName: 'System Admin',
          role: UserRole.SUPER_ADMIN,
        }),
      );
    }

    let support = await queryRunner.manager.findOne(User, {
      where: { email: 'guest@example.com' },
    });
    if (!support) {
      support = await queryRunner.manager.save(
        queryRunner.manager.create(User, {
          email: 'guest@example.com',
          passwordHash,
          fullName: 'John Doe',
          role: UserRole.SUPPORT,
        }),
      );
    }

    let property = await queryRunner.manager.findOne(Property, {
      where: { name: PROPERTY_NAME },
    });
    if (!property) {
      const legacy = await queryRunner.manager.findOne(Property, {
        where: { name: 'Grand Luxury Resort' },
      });
      if (legacy) {
        legacy.name = PROPERTY_NAME;
        legacy.address = '123 Võ Nguyên Giáp, Đà Nẵng';
        property = await queryRunner.manager.save(legacy);
      } else {
        property = await queryRunner.manager.save(
          queryRunner.manager.create(Property, {
            name: PROPERTY_NAME,
            address: '123 Võ Nguyên Giáp, Đà Nẵng',
            ianaTimezone: 'Asia/Ho_Chi_Minh',
            holdTtlSeconds: 600,
          }),
        );
      }
    }

    const savedRoomTypes: RoomType[] = [];
    const savedRooms: Room[] = [];

    for (const spec of ROOM_TYPES) {
      const exists = await queryRunner.manager.findOne(RoomType, {
        where: { propertyId: property.id, name: spec.name },
      });
      if (exists) continue;

      const roomType = await queryRunner.manager.save(
        queryRunner.manager.create(RoomType, {
          propertyId: property.id,
          name: spec.name,
          basePrice: spec.basePrice,
          maxOccupancy: spec.maxOccupancy,
          description: spec.description,
          amenities: spec.amenities,
        }),
      );
      savedRoomTypes.push(roomType);

      for (const r of spec.rooms) {
        const room = await queryRunner.manager.save(
          queryRunner.manager.create(Room, {
            propertyId: property.id,
            roomTypeId: roomType.id,
            roomNumber: r.number,
            floor: r.floor,
          }),
        );
        savedRooms.push(room);
      }
    }

    let testGuest = await queryRunner.manager.findOne(Guest, {
      where: { phone: '0912345678' },
    });
    if (!testGuest) {
      testGuest = await queryRunner.manager.save(
        queryRunner.manager.create(Guest, {
          fullName: 'Tran Van Khach',
          email: 'khachhang@example.com',
          phone: '0912345678',
        }),
      );
    }

    const deluxeType =
      savedRoomTypes.find((rt) => rt.name === 'Deluxe Sea View') ||
      (await queryRunner.manager.findOne(RoomType, {
        where: { propertyId: property.id, name: 'Deluxe Sea View' },
      }));

    const deluxeRoom =
      savedRooms.find((r) => r.roomNumber === '501') ||
      (deluxeType
        ? await queryRunner.manager.findOne(Room, {
            where: { propertyId: property.id, roomTypeId: deluxeType.id },
          })
        : null);

    const existingBooking = await queryRunner.manager.findOne(Booking, {
      where: { guestId: testGuest.id },
    });

    if (!existingBooking && deluxeType && deluxeRoom) {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() - 1);
      const checkOut = new Date();
      checkOut.setDate(checkOut.getDate() + 1);

      const booking = await queryRunner.manager.save(
        queryRunner.manager.create(Booking, {
          propertyId: property.id,
          roomId: deluxeRoom.id,
          roomTypeId: deluxeType.id,
          guestId: testGuest.id,
          status: BookingStatus.CHECKED_IN,
          checkIn: checkIn.toISOString().split('T')[0],
          checkOut: checkOut.toISOString().split('T')[0],
          paymentStatus: BookingPaymentStatus.PAID,
          totalAmount: 4_400_000,
        } as any),
      );

      await queryRunner.manager.save(
        queryRunner.manager.create(Invoice, {
          bookingId: booking.id,
          totalAmount: 4_400_000,
          paymentStatus: BookingPaymentStatus.PAID,
          paymentMethod: PaymentMethod.VNPAY,
          vnpayTransactionId: 'VNP123456789',
          issuedAt: new Date(),
          paidAt: new Date(),
        }),
      );

      if (await tableExists(queryRunner, 'tasks')) {
        await queryRunner.manager.save(
          queryRunner.manager.create(Task, {
            bookingId: booking.id,
            type: TaskType.CLEANING,
            status: TaskStatus.PENDING,
            guestNote: 'Vui lòng dọn phòng giúp tôi lúc 10h',
          }),
        );
      }

      if (await tableExists(queryRunner, 'reviews')) {
        await queryRunner.manager.save(
          queryRunner.manager.create(Review, {
            propertyId: property.id,
            bookingId: booking.id,
            guestId: testGuest.id,
            rating: 5,
            content:
              'Khách sạn rất tuyệt vời, phòng sạch, view biển đẹp, nhân viên thân thiện.',
            status: ReviewStatus.PUBLISHED,
          }),
        );
      }
    }

    const extraRooms = await ensureRoomInventory(queryRunner, property);
    const services = await ensureServiceCatalog(queryRunner, property);
    const demo = await ensureDemoRoomBoard(queryRunner, property);

    await queryRunner.commitTransaction();
    console.log(
      `✅ Seeding completed — ${savedRoomTypes.length} room types, ${savedRooms.length + extraRooms} physical rooms, ${services.total} service items (${services.added} new), ${demo.rates} rates, ${demo.bookings} demo bookings`,
    );
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Seeding failed', err);
    throw err;
  } finally {
    await queryRunner.release();
  }
};
