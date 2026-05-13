import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export class RegisterTokenDto {
  @ApiProperty()
  @IsString()
  deviceId: string;

  @ApiProperty()
  @IsString()
  expoToken: string;

  @ApiProperty({ enum: Platform, default: Platform.IOS })
  @IsEnum(Platform)
  @IsOptional()
  platform?: Platform;
}

export class RevokeTokenDto {
  @ApiProperty()
  @IsString()
  deviceId: string;
}
