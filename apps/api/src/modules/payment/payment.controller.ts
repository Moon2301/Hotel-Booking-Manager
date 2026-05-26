import { Controller, Post, Body, Headers, UnauthorizedException, UseGuards, Req, HttpCode, HttpStatus, Get, Param, Query, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { VnpayService } from './vnpay.service';
import { InvoiceService } from '../booking/invoice.service';
import { ReconciliationService } from './reconciliation.service';
import { CreatePaymentIntentDto, PaymentWebhookDto } from './dto/payment.dto';
import { JwtAuthGuard, Auth } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';
import { BookingConfirmationService } from '../booking/booking-confirmation.service';

@ApiTags('Payments')
@Controller()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly vnpayService: VnpayService,
    private readonly invoiceService: InvoiceService,
    private readonly reconciliationService: ReconciliationService,
    private readonly bookingConfirmationService: BookingConfirmationService,
  ) {}

  private async finalizeVnpaySuccess(
    invoiceId: string,
    vnpayTransactionId: string,
    res: Response,
  ) {
    const invoice = await this.invoiceService.confirmVnpayPayment(
      invoiceId,
      vnpayTransactionId,
    );

    this.bookingConfirmationService
      .sendPaymentSuccessEmail(invoice.id)
      .catch((err) =>
        this.logger.error(`Confirmation email failed: ${err.message}`),
      );

    return res.redirect(
      this.vnpayService.buildClientRedirect({
        payment: 'success',
        bookingId: invoice.bookingId,
      }),
    );
  }

  @Get('reconciliation-tickets')
  @Auth(UserRole.SUPER_ADMIN, UserRole.FINANCE_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment reconciliation tickets' })
  getReconciliationTickets(@Query('propertyId') propertyId?: string) {
    return this.reconciliationService.getTickets(propertyId);
  }

  @Post('payments/intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment intent' })
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentService.createIntent(dto);
  }

  @Get('payments')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER, UserRole.FINANCE_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment transactions history' })
  @ApiQuery({ name: 'bookingId', required: false })
  getPayments(@Query('bookingId') bookingId?: string) {
    return this.paymentService.getPayments(bookingId);
  }

  @Post('payments/:id/refund')
  @Auth(UserRole.SUPER_ADMIN, UserRole.PROPERTY_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a mock refund for a transaction' })
  refundPayment(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.paymentService.refundPayment(id, req.user.id);
  }

  @Post('webhooks/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payment gateway webhook endpoint' })
  @ApiHeader({ name: 'x-signature', required: true })
  handleWebhook(
    @Headers('x-signature') signature: string,
    @Body() dto: PaymentWebhookDto,
    @Req() req: Request,
  ) {
    const rawPayload = JSON.stringify(dto); 
    
    const isValid = this.paymentService.verifyWebhookSignature(rawPayload, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return this.paymentService.handleWebhook(dto, rawPayload);
  }

  // ─── VNPay ────────────────────────────────────────────────────────────────

  @Post('payment/vnpay/create-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create VNPay payment URL for an invoice' })
  async createVnpayUrl(
    @Body() body: { invoiceId: string },
    @Req() req: Request,
  ) {
    const invoice = await this.invoiceService.getInvoice(body.invoiceId);
    const ipAddr = req.ip || req.headers['x-forwarded-for'] as string || '127.0.0.1';
    const paymentUrl = this.vnpayService.createPaymentUrl(
      invoice.id,
      Number(invoice.totalAmount),
      ipAddr,
    );
    return { paymentUrl };
  }

  @Get('payment/vnpay/vnpay-return')
  @ApiOperation({ summary: 'VNPay payment callback/return handler' })
  async vnpayReturn(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = this.vnpayService.verifyCallback(query);

    if (!result.isValid) {
      return res.redirect(
        this.vnpayService.buildClientRedirect({
          payment: 'error',
          reason: 'invalid_signature',
        }),
      );
    }

    if (!result.isSuccess) {
      return res.redirect(
        this.vnpayService.buildClientRedirect({ payment: 'failed' }),
      );
    }

    try {
      return await this.finalizeVnpaySuccess(
        result.invoiceId,
        result.vnpayTransactionId,
        res,
      );
    } catch {
      return res.redirect(
        this.vnpayService.buildClientRedirect({
          payment: 'error',
          reason: 'server_error',
        }),
      );
    }
  }

  @Get('payment/vnpay/mock-pay')
  @ApiOperation({
    summary: 'Dev mock VNPay — xác nhận thanh toán không qua cổng VNPay',
  })
  async vnpayMockPay(
    @Query('invoiceId') invoiceId: string,
    @Res() res: Response,
  ) {
    if (!this.vnpayService.isMockMode()) {
      return res.status(404).send('VNPay mock is disabled');
    }
    if (!invoiceId) {
      return res.redirect(
        this.vnpayService.buildClientRedirect({
          payment: 'error',
          reason: 'missing_invoice',
        }),
      );
    }

    try {
      return await this.finalizeVnpaySuccess(
        invoiceId,
        `MOCK-${Date.now()}`,
        res,
      );
    } catch {
      return res.redirect(
        this.vnpayService.buildClientRedirect({
          payment: 'error',
          reason: 'server_error',
        }),
      );
    }
  }
}
