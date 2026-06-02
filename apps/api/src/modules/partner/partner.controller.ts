import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';
import { PartnerService } from './partner.service';
import {
  CreateReferralPartnerDto,
  UpdateReferralPartnerDto,
} from './dto/partner.dto';

@ApiTags('Referral Partners')
@Controller('partners')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get()
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FINANCE_READ,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List referral partners with stats and referral URLs' })
  list() {
    return this.partnerService.list();
  }

  @Get('commissions')
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FINANCE_READ,
  )
  @ApiBearerAuth()
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiOperation({ summary: 'List partner commissions' })
  listCommissions(@Query('partnerId') partnerId?: string) {
    return this.partnerService.listCommissions(partnerId);
  }

  @Get(':id')
  @Auth(
    UserRole.SUPER_ADMIN,
    UserRole.PROPERTY_MANAGER,
    UserRole.FINANCE_READ,
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one referral partner' })
  get(@Param('id') id: string) {
    return this.partnerService.get(id);
  }

  @Post()
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create referral partner' })
  create(@Body() dto: CreateReferralPartnerDto) {
    return this.partnerService.create(dto);
  }

  @Patch(':id')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update referral partner' })
  update(@Param('id') id: string, @Body() dto: UpdateReferralPartnerDto) {
    return this.partnerService.update(id, dto);
  }

  @Post('commissions/:id/paid-out')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark partner commission as paid out to partner' })
  markPaidOut(@Param('id') id: string) {
    return this.partnerService.markCommissionPaidOut(id);
  }
}
