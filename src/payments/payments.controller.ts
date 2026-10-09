import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import type {
  CheckoutRequest,
  MercadoPagoNotification,
  ReconcileRequest,
  TokenPayload,
} from '../models';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: TokenPayload, @Body() body: CheckoutRequest) {
    return this.paymentsService.checkout({ ...(body ?? {}), userId: user.sub });
  }

  @Post('reconcile')
  @UseGuards(JwtAuthGuard)
  reconcile(@CurrentUser() user: TokenPayload, @Body() body: ReconcileRequest) {
    return this.paymentsService.reconcile(user.sub, body?.paymentId ?? '');
  }

  @Post('webhook')
  webhook(@Body() body: MercadoPagoNotification) {
    return this.paymentsService.webhook(body ?? {});
  }

  @Post('simulate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  simulate(@CurrentUser() user: TokenPayload, @Body() body: CheckoutRequest) {
    return this.paymentsService.simulate({ ...(body ?? {}), userId: user.sub });
  }
}
