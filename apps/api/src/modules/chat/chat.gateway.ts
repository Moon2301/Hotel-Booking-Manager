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
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
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

      // Attach user to client for later use
      client.data.user = payload;
      this.logger.log(`Client connected and verified: ${client.id} (User: ${payload.sub})`);
    } catch (error) {
      this.logger.error(`Connection rejected: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_property')
  handleJoinProperty(@MessageBody() propertyId: string, @ConnectedSocket() client: Socket) {
    // Only allow joining if authorized
    if (!client.data.user) throw new WsException('Unauthorized');
    
    client.join(`property_${propertyId}`);
    this.logger.log(`Client ${client.id} joined property_${propertyId}`);
    return { event: 'joined', propertyId };
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    if (!client.data.user) throw new WsException('Unauthorized');
    const senderId = client.data.user.sub;
    
    try {
      const message = await this.chatService.saveMessage(dto, senderId);
      this.server.to(`thread_${dto.threadId}`).emit('new_message', message);
      return { event: 'message_sent', data: message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { event: 'error', message: error.message };
    }
  }

  @SubscribeMessage('join_thread')
  handleJoinThread(@MessageBody() threadId: string, @ConnectedSocket() client: Socket) {
    if (!client.data.user) throw new WsException('Unauthorized');
    client.join(`thread_${threadId}`);
    this.logger.log(`Client ${client.id} joined thread_${threadId}`);
    return { event: 'joined', threadId };
  }
}
