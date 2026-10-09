import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, TokenPayload } from '../models';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TokenPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
