import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { InvoiceService } from './invoice.service';
import { Auth, JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK, UserRole.FINANCE_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all invoices' })
  async listInvoices() {
    return this.invoiceService.listInvoices();
  }

  @Get(':id')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK, UserRole.FINANCE_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice details by ID' })
  async getInvoice(@Param('id') id: string) {
    return this.invoiceService.getInvoice(id);
  }

  @Patch(':id/pay')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FRONT_DESK)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually confirm payment (cash/card at counter)' })
  async confirmManualPayment(
    @Param('id') id: string,
    @Body() body: { method: 'CASH' | 'CARD' },
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.invoiceService.confirmManualPayment(id, body.method, req.user.id);
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice details by Booking ID (Guests / Staff)' })
  async getInvoiceByBooking(
    @Param('bookingId') bookingId: string,
    @Req() req: any,
  ) {
    if (req.user?.type === 'guest' && req.user.bookingId !== bookingId) {
      throw new ForbiddenException('Cannot access other booking invoices');
    }
    const invoice = await this.invoiceService.getInvoiceByBooking(bookingId);
    if (!invoice) throw new NotFoundException('Invoice not found for this booking');
    return invoice;
  }
}
