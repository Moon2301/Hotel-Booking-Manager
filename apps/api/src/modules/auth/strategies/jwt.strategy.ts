import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;       // user/guest id
  email?: string;    // staff only
  role?: string;     // staff only
  tokenVersion?: number; // staff only
  type?: 'guest';    // guest only
  bookingId?: string; // guest only
  guestId?: string;  // guest only
  phone?: string;    // guest only
  fullName?: string; // staff only
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'guest') {
      return {
        id: payload.sub,
        type: 'guest',
        bookingId: payload.bookingId,
        guestId: payload.guestId,
        phone: payload.phone,
      };
    }

    return {
      id: payload.sub,
      type: 'staff',
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion,
    };
  }
}

