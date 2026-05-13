import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, Unique,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('device_tokens')
@Unique(['userId', 'deviceId'])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column({ name: 'user_id' }) userId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'device_id' }) deviceId: string;
  @Column({ name: 'expo_token' }) expoToken: string;
  
  @Column({ default: 'ios' }) platform: string;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
