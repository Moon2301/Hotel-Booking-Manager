import {
  Entity, Column, CreateDateColumn, PrimaryColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryColumn()
  key: string;

  @PrimaryColumn({ name: 'user_id' })
  userId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'request_hash' })
  requestHash: string;

  @Column({ type: 'jsonb', name: 'response_json', nullable: true })
  responseJson: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
