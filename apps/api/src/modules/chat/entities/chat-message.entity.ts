import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ChatThread } from './chat-thread.entity';
import { User, UserRole } from '../../auth/entities/user.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column({ name: 'thread_id' }) threadId: string;
  @ManyToOne(() => ChatThread, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thread_id' })
  thread: ChatThread;

  @Column({ name: 'sender_id' }) senderId: string;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'sender_role' }) senderRole: string;
  @Column({ type: 'text' }) content: string;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' }) sentAt: Date;
}
