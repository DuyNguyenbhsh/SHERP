import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenBlocklistService } from './token-blocklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly blocklist: TokenBlocklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (payload.jti && (await this.blocklist.isRevoked(payload.jti))) {
      throw new UnauthorizedException('Token đã bị thu hồi');
    }
    return {
      userId: payload.sub,
      username: payload.username,
      employeeId: payload.employee_id,
      privileges: payload.privileges,
      contexts: payload.contexts,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
