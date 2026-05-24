import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GuestService } from './guest.service';
import { UpdateGuestDto, ListGuestsQueryDto } from './dto/guest.dto';
import { Auth } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Guests')
@Controller('guests')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Get()
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all guests with optional search' })
  async listGuests(@Query() query: ListGuestsQueryDto) {
    return this.guestService.listGuests(query);
  }

  @Get(':id')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get guest details by ID' })
  async getGuest(@Param('id') id: string) {
    return this.guestService.getGuest(id);
  }

  @Patch(':id')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update guest information' })
  async updateGuest(@Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.guestService.updateGuest(id, dto);
  }
}
