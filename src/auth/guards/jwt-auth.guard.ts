import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { config } from '../../config/config.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      console.warn('GUARD: No token found');
      throw new UnauthorizedException('Authentication token missing');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: config.JWT_SECRET,
      });

      console.log(
        'GUARD: Token verified. User ID from payload:',
        payload.id || payload.sub,
      );

      // Attach full payload to request
      request['user'] = payload;
    } catch (error: any) {
      console.error('GUARD: JWT Error:', error.message);

      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }

  private extractToken(request: Request): string | undefined {
    // 1. Check cookies
    if (request.cookies?.['access_token']) {
      return request.cookies['access_token'];
    }

    // 2. Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer') {
        return token;
      }
    }

    return undefined;
  }
}
