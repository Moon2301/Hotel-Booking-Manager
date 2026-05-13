import { Controller, Get, Post, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { CreateThreadDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('threads')
  @ApiOperation({ summary: 'Create a new chat thread' })
  createThread(@Body() dto: CreateThreadDto, @Req() req: Request & { user: { id: string } }) {
    return this.chatService.createThread(dto, req.user.id);
  }

  @Get('threads')
  @ApiOperation({ summary: 'List chat threads for a property' })
  @ApiQuery({ name: 'property_id', required: true })
  getThreads(@Query('property_id') propertyId: string) {
    return this.chatService.getThreads(propertyId);
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'Get messages for a thread' })
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }
}
