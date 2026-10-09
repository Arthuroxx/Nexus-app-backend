import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest, TokenPayload } from '../models';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;
    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }
    try {
      request.user = this.jwtService.verify<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
    return true;
  }
}
