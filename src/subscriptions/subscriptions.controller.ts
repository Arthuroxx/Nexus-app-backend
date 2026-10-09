import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import type { GrantMembershipRequest, TokenPayload } from '../models';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('status')
  getStatus(@CurrentUser() user: TokenPayload) {
    return this.subscriptionsService.getStatusForUser(user.sub);
  }

  @Post('renew')
  renew(@CurrentUser() user: TokenPayload) {
    return this.subscriptionsService.renew(user.sub);
  }

  @Post('grant')
  @UseGuards(AdminGuard)
  grant(@Body() body: GrantMembershipRequest) {
    return this.subscriptionsService.grantForAdmin(body ?? {});
  }
}
