import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatThread } from './entities/chat-thread.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../auth/entities/user.entity';
import { Guest } from '../guest/entities/guest.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatThread, ChatMessage, User, Guest]),
    AuthModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
