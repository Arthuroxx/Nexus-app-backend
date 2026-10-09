import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import type { AuthenticatedRequest } from '../models';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('Se requiere un usuario autenticado');
    }

    const member = await this.usersService.findById(userId);
    if (member.role !== 'admin') {
      throw new ForbiddenException('Se requieren permisos de administrador');
    }

    return true;
  }
}
