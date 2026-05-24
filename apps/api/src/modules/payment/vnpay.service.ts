import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface VnpayConfig {
  tmnCode: string;
  hashSecret: string;
  paymentUrl: string;
  apiUrl: string;
  clientUrl: string;
}

@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);
  private readonly config: VnpayConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      tmnCode: this.configService.get<string>('vnpay.tmnCode', 'R4923J2J'),
      hashSecret: this.configService.get<string>('vnpay.hashSecret', 'P68JKLG8376RKRTBPWCKDD7XR3OYF4TZ'),
      paymentUrl: this.configService.get<string>('vnpay.paymentUrl', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
      apiUrl: this.configService.get<string>('API_URL', 'http://localhost:3000'),
      clientUrl: this.configService.get<string>('CLIENT_URL', 'http://localhost:8080'),
    };
  }

  /**
   * Generate VNPay payment URL for an invoice
   */
  createPaymentUrl(invoiceId: string, totalAmount: number, ipAddr: string): string {
    const createDate = this.formatDate(new Date());
    const returnUrl = `${this.config.apiUrl}/api/v1/payment/vnpay/vnpay-return`;

    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.config.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: `${invoiceId}-${createDate}`,
      vnp_OrderInfo: `Thanh toan hoa don ${invoiceId} tai Mango Hotel`,
      vnp_OrderType: 'other',
      vnp_Amount: totalAmount * 100, // VNPay requires amount in smallest unit
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    // Sort params alphabetically
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

    // Sort and sign
    const sortedKeys = Object.keys(vnpParams).sort();
    const signData = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(vnpParams[key]).replace(/%20/g, '+')}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', this.config.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = secureHash === signed;
    const isSuccess = vnpParams['vnp_ResponseCode'] === '00';
    const txnRef = vnpParams['vnp_TxnRef'] || '';
    const invoiceId = txnRef.split('-')[0];
    const vnpayTransactionId = vnpParams['vnp_TransactionNo'] || '';

    return { isValid, isSuccess, invoiceId, vnpayTransactionId };
  }

  getClientUrl(): string {
    return this.config.clientUrl;
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
