import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Guest } from './entities/guest.entity';
import { CreateGuestDto, UpdateGuestDto, ListGuestsQueryDto } from './dto/guest.dto';

@Injectable()
export class GuestService {
  constructor(
    @InjectRepository(Guest) private guestRepo: Repository<Guest>,
  ) {}

  async findOrCreate(dto: CreateGuestDto): Promise<Guest> {
    // Try to find existing guest by email + phone
    let guest = await this.guestRepo.findOne({
      where: { email: dto.email, phone: dto.phone },
    });

    if (guest) {
      // Update fullName if changed
      if (dto.fullName && dto.fullName !== guest.fullName) {
        guest.fullName = dto.fullName;
        guest = await this.guestRepo.save(guest);
      }
      return guest;
    }

    // Create new guest
    const newGuest = this.guestRepo.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      cccdHash: dto.cccd ? this.hashCccd(dto.cccd) : undefined,
    });

    return this.guestRepo.save(newGuest);
  }

  async listGuests(query: ListGuestsQueryDto) {
    const { search, page = 1, limit = 20 } = query;

    const qb = this.guestRepo.createQueryBuilder('guest');

    if (search) {
      qb.andWhere(
        '(guest.full_name ILIKE :search OR guest.email ILIKE :search OR guest.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('guest.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGuest(id: string): Promise<Guest> {
    const guest = await this.guestRepo.findOne({ where: { id } });
    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async updateGuest(id: string, dto: UpdateGuestDto): Promise<Guest> {
    const guest = await this.getGuest(id);
    Object.assign(guest, dto);
    return this.guestRepo.save(guest);
  }

  async findByPhone(phone: string): Promise<Guest | null> {
    return this.guestRepo.findOne({ where: { phone } });
  }

  private hashCccd(cccd: string): string {
    return crypto.createHash('sha256').update(cccd).digest('hex');
  }
}
