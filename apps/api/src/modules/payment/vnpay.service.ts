import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  paymentUrl: string;
  apiPublicUrl: string;
  clientUrl: string;
  clientPaymentPath: string;
  mock: boolean;
}

@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);
  private readonly config: VnpayConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      tmnCode: this.configService.get<string>('vnpay.tmnCode', 'R4923J2J'),
      hashSecret: this.configService.get<string>(
        'vnpay.hashSecret',
        'P68JKLG8376RKRTBPWCKDD7XR3OYF4TZ',
      ),
      paymentUrl: this.configService.get<string>(
        'vnpay.paymentUrl',
        'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      ),
      apiPublicUrl: this.configService.get<string>(
        'vnpay.apiPublicUrl',
        'http://localhost:3000',
      ),
      clientUrl: this.configService.get<string>(
        'vnpay.clientUrl',
        'http://localhost:8080',
      ),
      clientPaymentPath: this.configService.get<string>(
        'vnpay.clientPaymentPath',
        '/my-stay',
      ),
      mock: this.configService.get<boolean>('vnpay.mock', false),
    };
  }

  isMockMode(): boolean {
    return this.config.mock;
  }

  createMockPaymentUrl(invoiceId: string): string {
    const base = this.config.apiPublicUrl.replace(/\/$/, '');
    const prefix = this.configService.get<string>('apiPrefix', 'api/v1');
    return `${base}/${prefix}/payment/vnpay/mock-pay?invoiceId=${encodeURIComponent(invoiceId)}`;
  }

  /**
   * URL VNPay redirect về sau khi khách thanh toán (phải trỏ tới API, không phải web client).
   */
  getVnpayReturnUrl(): string {
    const base = this.config.apiPublicUrl.replace(/\/$/, '');
    return `${base}/api/v1/payment/vnpay/vnpay-return`;
  }

  /**
   * Redirect khách về trang My Stay trên web client.
   */
  buildClientRedirect(params: Record<string, string>): string {
    const base = this.config.clientUrl.replace(/\/$/, '');
    const defaultPath = this.config.clientPaymentPath.startsWith('/')
      ? this.config.clientPaymentPath
      : `/${this.config.clientPaymentPath}`;
    const path =
      params.bookingId != null
        ? '/book/confirmation'
        : defaultPath;
    const qs = new URLSearchParams(params).toString();
    return qs ? `${base}${path}?${qs}` : `${base}${path}`;
  }

  /**
   * Generate VNPay payment URL for an invoice
   */
  createPaymentUrl(invoiceId: string, totalAmount: number, ipAddr: string): string {
    if (this.config.mock) {
      this.logger.log(
        `VNPay mock mode — redirect to local mock-pay for invoice ${invoiceId}`,
      );
      return this.createMockPaymentUrl(invoiceId);
    }

    const createDate = this.formatDate(new Date());
    const returnUrl = this.getVnpayReturnUrl();

    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.config.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: `${invoiceId}-${createDate}`,
      vnp_OrderInfo: `Thanh toan hoa don ${invoiceId}`,
      vnp_OrderType: 'other',
      vnp_Amount: totalAmount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    const sortedKeys = Object.keys(vnpParams).sort();
    const signData = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(vnpParams[key]).replace(/%20/g, '+')}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', this.config.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const queryStr = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(vnpParams[key]).replace(/%20/g, '+')}`)
      .join('&');

    return `${this.config.paymentUrl}?${queryStr}&vnp_SecureHash=${signed}`;
  }

  /**
   * Verify VNPay callback signature and extract invoice info
   */
  verifyCallback(query: Record<string, string>): {
    isValid: boolean;
    isSuccess: boolean;
    invoiceId: string;
    vnpayTransactionId: string;
  } {
    const vnpParams = { ...query };
    const secureHash = vnpParams['vnp_SecureHash'];

    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    const sortedKeys = Object.keys(vnpParams).sort();
    const signData = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(vnpParams[key]).replace(/%20/g, '+')}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', this.config.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = secureHash === signed;
    const isSuccess = vnpParams['vnp_ResponseCode'] === '00';
    const txnRef = vnpParams['vnp_TxnRef'] || '';
    const invoiceId = this.parseInvoiceIdFromTxnRef(txnRef);
    const vnpayTransactionId = vnpParams['vnp_TransactionNo'] || '';

    return { isValid, isSuccess, invoiceId, vnpayTransactionId };
  }

  /** vnp_TxnRef = `{uuid}-{yyyyMMddHHmmss}` */
  parseInvoiceIdFromTxnRef(txnRef: string): string {
    const match = txnRef.match(/^(.+)-(\d{14})$/);
    return match ? match[1] : txnRef;
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      date.getFullYear() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }
}
