import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from '../../booking/entities/booking.entity';
import { User } from '../../auth/entities/user.entity';

export enum TaskType {
  CLEANING = 'CLEANING',
  FOOD = 'FOOD',
  TRANSPORT = 'TRANSPORT',
  OTHER = 'OTHER',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'booking_id' }) bookingId: string;
  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'enum', enum: TaskType })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ name: 'assigned_to', nullable: true }) assignedTo: string;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @Column({ name: 'guest_note', type: 'text', nullable: true })
  guestNote: string;

  @Column({ name: 'staff_report', type: 'text', nullable: true })
  staffReport: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
