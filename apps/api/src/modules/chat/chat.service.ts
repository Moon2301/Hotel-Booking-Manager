import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatThread } from './entities/chat-thread.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { CreateThreadDto, SendMessageDto } from './dto/chat.dto';
import { User } from '../auth/entities/user.entity';
import { Guest } from '../guest/entities/guest.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatThread) private threadRepo: Repository<ChatThread>,
    @InjectRepository(ChatMessage) private messageRepo: Repository<ChatMessage>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Guest) private guestRepo: Repository<Guest>,
  ) {}

  async createThread(dto: CreateThreadDto, guestId: string) {
    const thread = this.threadRepo.create({
      propertyId: dto.propertyId,
      bookingId: dto.bookingId,
      guestId,
    });
    return this.threadRepo.save(thread);
  }

  async getThreads(propertyId: string) {
    return this.threadRepo.find({ where: { propertyId }, order: { updatedAt: 'DESC' } });
  }

  async getMessages(threadId: string) {
    return this.messageRepo.find({ where: { threadId }, order: { sentAt: 'ASC' } });
  }

  async saveMessage(dto: SendMessageDto, senderId: string) {
    const thread = await this.threadRepo.findOne({ where: { id: dto.threadId } });
    if (!thread) throw new NotFoundException('Thread not found');

    let senderRole = 'GUEST';
    const user = await this.userRepo.findOne({ where: { id: senderId } });
    if (user) {
      senderRole = user.role;
    } else {
      const guest = await this.guestRepo.findOne({ where: { id: senderId } });
      if (!guest) {
        throw new UnauthorizedException('Sender not found');
      }
    }

    const message = this.messageRepo.create({
      threadId: dto.threadId,
      senderId,
      senderRole,
      content: dto.content,
    });

    const saved = await this.messageRepo.save(message);

    // Update thread's updatedAt
    thread.updatedAt = new Date();
    await this.threadRepo.save(thread);

    return saved;
  }
}
