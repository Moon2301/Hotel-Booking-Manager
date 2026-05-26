import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Task } from './entities/task.entity';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tasks',
})
export class TaskGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TaskGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        throw new WsException('Unauthorized: No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('jwt.accessSecret'),
      });

      // Attach user information to client
      client.data.user = payload;

      if (payload.type === 'guest') {
        if (payload.bookingId) {
          client.join(`booking_${payload.bookingId}`);
        }
      } else {
        client.join('staff');
      }

      this.logger.log(
        `Client connected to /tasks: ${client.id} (User: ${payload.sub}, Type: ${payload.type || 'staff'})`,
      );
    } catch (error) {
      this.logger.error(`Connection to /tasks rejected: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from /tasks: ${client.id}`);
  }

  @SubscribeMessage('join_property')
  handleJoinProperty(@MessageBody() propertyId: string, @ConnectedSocket() client: Socket) {
    if (!client.data.user) throw new WsException('Unauthorized');
    client.join(`property_${propertyId}`);
    this.logger.log(`Client ${client.id} joined property_${propertyId} in /tasks namespace`);
    return { event: 'joined', propertyId };
  }

  @SubscribeMessage('join_booking')
  handleJoinBooking(@MessageBody() bookingId: string, @ConnectedSocket() client: Socket) {
    if (!client.data.user) throw new WsException('Unauthorized');
    client.join(`booking_${bookingId}`);
    this.logger.log(`Client ${client.id} joined booking_${bookingId} in /tasks namespace`);
    return { event: 'joined', bookingId };
  }

  /**
   * Send notification to staff and guest rooms when a task changes
   */
  notifyTaskChange(task: Task, eventType: 'created' | 'updated') {
    if (!this.server) {
      this.logger.warn('WebSocket server is not initialized yet');
      return;
    }

    const payload = {
      event: eventType,
      task: {
        id: task.id,
        bookingId: task.bookingId,
        type: task.type,
        status: task.status,
        assignedTo: task.assignedTo,
        guestNote: task.guestNote,
        staffReport: task.staffReport,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        booking: task.booking
          ? {
              id: task.booking.id,
              propertyId: task.booking.propertyId,
              roomId: task.booking.roomId,
              room: task.booking.room
                ? { roomNumber: task.booking.room.roomNumber }
                : undefined,
            }
          : undefined,
      },
    };

    // Guest portal (My Stay)
    this.server.to(`booking_${task.bookingId}`).emit('task_changed', payload);

    // All connected staff (admin dashboard)
    this.server.to('staff').emit('task_changed', payload);

    // Property-scoped staff (optional fine-grained filter)
    if (task.booking?.propertyId) {
      this.server
        .to(`property_${task.booking.propertyId}`)
        .emit('task_changed', payload);
    }
  }
}
