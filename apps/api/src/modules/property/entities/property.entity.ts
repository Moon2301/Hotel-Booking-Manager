import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ name: 'iana_timezone', default: 'UTC' }) ianaTimezone: string;
  @Column({ nullable: true }) address: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) email: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'jsonb', nullable: true, default: [] }) images: string[];
  @Column({ name: 'hold_ttl_seconds', default: 600 }) holdTtlSeconds: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
