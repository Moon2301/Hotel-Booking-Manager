import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType, TaskStatus } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: 'uuid-of-booking' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({ enum: TaskType, example: TaskType.CLEANING })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiPropertyOptional({ example: 'Dọn phòng lúc 10h sáng' })
  @IsOptional()
  @IsString()
  guestNote?: string;
}

export class UpdateTaskStatusDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 'Đã dọn xong phòng, bổ sung 2 chai nước' })
  @IsOptional()
  @IsString()
  staffReport?: string;

  @ApiPropertyOptional({ example: 'uuid-of-staff', description: 'Admin/Receptionist can assign to specific staff' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
