import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

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

/** Web Admin BFF stores the access token in an httpOnly cookie. */
function jwtFromCookie(req: Request): string | null {
  const token = req.cookies?.access_token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        jwtFromCookie,
      ]),
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

