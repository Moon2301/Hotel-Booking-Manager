import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class GuestOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user?.type !== 'guest' || !user.bookingId) {
      throw new ForbiddenException('Yêu cầu phiên khách (My Stay)');
    }
    return true;
  }
}
