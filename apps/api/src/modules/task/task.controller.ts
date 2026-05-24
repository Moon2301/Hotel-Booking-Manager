import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new room service request (Guest or Staff)' })
  async createTask(
    @Body() dto: CreateTaskDto,
    @Req() req: Request & { user: { id: string; role: string; type?: string; bookingId?: string } },
  ) {
    // If guest token, override bookingId from token
    if (req.user.type === 'guest' && req.user.bookingId) {
      dto.bookingId = req.user.bookingId;
    }
    return this.taskService.createTask(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List tasks (auto-filtered by role/booking)' })
  async listTasks(
    @Req() req: Request & { user: { id: string; role: string; type?: string; bookingId?: string } },
    @Query('propertyId') propertyId?: string,
  ) {
    if (req.user.type === 'guest') {
      // Guest sees only their booking tasks
      return this.taskService.listTasks({ bookingId: req.user.bookingId });
    }

    // Staff sees tasks filtered by role
    return this.taskService.listTasks({
      role: req.user.role as UserRole,
      propertyId,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get task details by ID' })
  async getTask(@Param('id') id: string) {
    return this.taskService.getTask(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update task status, report, or assignment' })
  async updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @Req() req: Request & { user: { id: string; role: string } },
  ) {
    return this.taskService.updateTask(id, dto, req.user.id, req.user.role as UserRole);
  }
}
