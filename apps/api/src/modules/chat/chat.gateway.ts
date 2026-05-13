import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';
// A real app would have a WsJwtAuthGuard here instead of the REST JwtAuthGuard

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Real app: Extract JWT from handshake, verify, and join property-specific rooms
    // const token = client.handshake.auth.token;
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_property')
  handleJoinProperty(@MessageBody() propertyId: string, @ConnectedSocket() client: Socket) {
    client.join(`property_${propertyId}`);
    this.logger.log(`Client ${client.id} joined property_${propertyId}`);
    return { event: 'joined', propertyId };
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    // Fake sender ID for mock - real app extracts from JWT verified during connection
    const senderId = client.handshake.auth.userId || 'mock-user-id'; 
    
    try {
      const message = await this.chatService.saveMessage(dto, senderId);
      
      // Emit to the specific thread
      this.server.to(`thread_${dto.threadId}`).emit('new_message', message);
      
      // If we joined a property room, emit there too for staff
      // this.server.to(`property_${propertyId}`).emit('new_property_message', message);
      
      return { event: 'message_sent', data: message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { event: 'error', message: error.message };
    }
  }

  @SubscribeMessage('join_thread')
  handleJoinThread(@MessageBody() threadId: string, @ConnectedSocket() client: Socket) {
    client.join(`thread_${threadId}`);
    this.logger.log(`Client ${client.id} joined thread_${threadId}`);
    return { event: 'joined', threadId };
  }
}
