import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskType, TaskStatus } from './entities/task.entity';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { AuditLog } from '../auth/entities/audit-log.entity';
import { UserRole } from '../auth/entities/user.entity';
import { TaskGateway } from './task.gateway';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private readonly taskGateway: TaskGateway,
  ) {}

  async createTask(dto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepo.create({
      bookingId: dto.bookingId,
      type: dto.type,
      guestNote: dto.guestNote || '',
      status: TaskStatus.PENDING,
    });

    const saved = await this.taskRepo.save(task);
    
    // Load with booking details for websocket property mapping
    const populated = await this.getTask(saved.id);
    this.taskGateway.notifyTaskChange(populated, 'created');
    
    return populated;
  }

  /**
   * List tasks filtered by user role:
   * - Guest: only their booking's tasks (filtered by bookingId externally)
   * - HOUSEKEEPING: only CLEANING tasks
   * - SUPPORT (waiter/service): only FOOD tasks
   * - Admin/PropertyManager/FrontDesk: all tasks
   */
  async listTasks(options?: {
    role?: UserRole;
    bookingId?: string;
    propertyId?: string;
  }) {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.booking', 'booking')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .select([
        'task',
        'booking.id',
        'booking.checkIn',
        'booking.checkOut',
        'booking.status',
        'booking.roomId',
        'booking.propertyId',
        'assignee.id',
        'assignee.fullName',
        'assignee.role',
      ]);

    // Filter by booking (for guest portal)
    if (options?.bookingId) {
      qb.andWhere('task.bookingId = :bookingId', { bookingId: options.bookingId });
    }

    // Filter by property
    if (options?.propertyId) {
      qb.andWhere('booking.propertyId = :propertyId', { propertyId: options.propertyId });
    }

    // Filter by role-specific task types
    if (options?.role === UserRole.HOUSEKEEPING) {
      qb.andWhere('task.type = :type', { type: TaskType.CLEANING });
    } else if (options?.role === UserRole.SUPPORT) {
      qb.andWhere('task.type IN (:...types)', { types: [TaskType.FOOD, TaskType.OTHER] });
    }
    // SUPER_ADMIN, PROPERTY_MANAGER, FRONT_DESK see all tasks

    qb.orderBy('task.created_at', 'DESC');

    return qb.getMany();
  }

  async getTask(id: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['booking', 'assignee'],
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateTask(
    id: string,
    dto: UpdateTaskStatusDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<Task> {
    const task = await this.getTask(id);

    // RBAC: Non-management staff can only update tasks matching their department
    const isManagement = [UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK].includes(actorRole);

    if (!isManagement) {
      if (task.type === TaskType.CLEANING && actorRole !== UserRole.HOUSEKEEPING) {
        throw new ForbiddenException('Only housekeeping staff can handle cleaning tasks');
      }
      if (task.type === TaskType.FOOD && actorRole !== UserRole.SUPPORT) {
        throw new ForbiddenException('Only service staff can handle food tasks');
      }
      if (task.type === TaskType.TRANSPORT) {
        // In Hotel-Manage, SUPPORT role handles transport too (no separate DRIVER role)
        if (actorRole !== UserRole.SUPPORT) {
          throw new ForbiddenException('Only service/transport staff can handle transport tasks');
        }
      }
    }

    const before = { status: task.status, assignedTo: task.assignedTo };

    // Update status
    if (dto.status) {
      task.status = dto.status;
    }

    // Update staff report
    if (dto.staffReport !== undefined) {
      task.staffReport = dto.staffReport;
    }

    // Assignment logic
    if (isManagement && dto.assignedToId !== undefined) {
      // Management can assign to specific staff
      task.assignedTo = dto.assignedToId || (null as any);
    } else if (!isManagement && dto.status === TaskStatus.IN_PROGRESS) {
      // Non-management staff auto-assigns to themselves when claiming
      task.assignedTo = actorId;
    }

    const saved = await this.taskRepo.save(task);

    // Load with full relations for websocket mapping
    const populated = await this.getTask(saved.id);
    this.taskGateway.notifyTaskChange(populated, 'updated');

    // Audit log
    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        action: 'task.update',
        entityType: 'tasks',
        entityId: id,
        before: before as any,
        after: { status: populated.status, assignedTo: populated.assignedTo },
      }),
    );

    return populated;
  }
}
