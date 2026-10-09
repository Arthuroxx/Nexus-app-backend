import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { optionalEnv } from '../config/env';
import {
  MEMBERSHIP_PRICE,
  SubscriptionsService,
} from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import type {
  CheckoutRequest,
  MercadoPagoNotification,
  PaymentReference,
  Transaction,
} from '../models';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  private readonly client: MercadoPagoConfig;
  private readonly preference: Preference;
  private readonly payment: Payment;
  private transactions: Transaction[] = [];

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usersService: UsersService,
  ) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN no está definido (ver .env)');
    }
    this.client = new MercadoPagoConfig({ accessToken });
    this.preference = new Preference(this.client);
    this.payment = new Payment(this.client);
  }

  async checkout(request: CheckoutRequest) {
    const member = await this.resolveMember(request);
    const email = member.email;

    if (
      typeof request.amount === 'number' &&
      request.amount !== MEMBERSHIP_PRICE
    ) {
      this.logger.warn(
        `Amount ${request.amount} ignorado: el precio de la suscripción es ${MEMBERSHIP_PRICE}`,
      );
    }

    try {
      const baseUrl = this.baseUrl;
      const frontendUrl = this.frontendUrl;
      const canAutoReturn = this.isPubliclyReachable(frontendUrl);
      const result = await this.preference.create({
        body: {
          items: [
            {
              id: 'nexus-subscription',
              title: 'Suscripción Nexus Training (30 días)',
              quantity: 1,
              unit_price: MEMBERSHIP_PRICE,
              currency_id: 'COP',
            },
          ],
          payer: { email },
          external_reference: member.id,
          metadata: { user_id: member.id },
          notification_url: `${baseUrl}/payments/webhook`,
          back_urls: {
            success: `${frontendUrl}/inicio?pago=aprobado`,
            pending: `${frontendUrl}/inicio?pago=pendiente`,
            failure: `${frontendUrl}/inicio?pago=fallido`,
          },
          ...(canAutoReturn ? { auto_return: 'approved' as const } : {}),
          statement_descriptor: 'NEXUS-TRAIN',
        },
      });

      if (!result.sandbox_init_point) {
        this.logger.error(
          'Mercado Pago no devolvió sandbox_init_point: la credencial NO es de prueba. ' +
            'Se aborta el checkout para no cobrar dinero real.',
        );
        throw new BadRequestException(
          'Las credenciales de Mercado Pago no son de prueba. Configura un token de sandbox.',
        );
      }

      return {
        init_point: result.sandbox_init_point,
        preference_id: result.id,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Mercado Pago checkout failed: ${message}`);
      throw new BadGatewayException(
        `Error en pasarela Mercado Pago: ${message}`,
      );
    }
  }

  async webhook(notification: MercadoPagoNotification) {
    const paymentId = this.extractPaymentId(notification);
    if (!paymentId || (notification?.type && notification.type !== 'payment')) {
      const reason = `Notificación ignorada. Se espera { "type": "payment", "data": { "id": <paymentId> } }. Recibido: ${JSON.stringify(notification)}`;
      this.logger.warn(reason);
      return { received: true, processed: false, reason };
    }

    const result = await this.payment
      .get({ id: paymentId })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `No se pudo consultar el pago ${paymentId}: ${message}`,
        );
        throw new BadGatewayException(
          `Mercado Pago no devolvió el pago ${paymentId}: ${message}`,
        );
      });

    const transaction: Transaction = {
      id: String(this.transactions.length + 1),
      paymentId: result.id,
      email: result.payer?.email,
      amount: result.transaction_amount,
      currency: result.currency_id ?? 'COP',
      status: result.status,
      createdAt: new Date(),
    };
    this.transactions.push(transaction);
    this.logger.log(`Payment ${result.id} -> ${result.status}`);

    if (result.status !== 'approved') {
      const reason = `El pago ${result.id} está en estado ${result.status}, no se activa la suscripción`;
      return { received: true, processed: false, reason, transaction };
    }

    const userId = await this.resolveUserId(result);
    if (!userId) {
      const reason = `Pago ${result.id} aprobado sin usuario asociado (faltan metadata.user_id, external_reference y un email registrado)`;
      this.logger.warn(reason);
      return { received: true, processed: false, reason, transaction };
    }

    const subscription = await this.subscriptionsService.activate(
      userId,
      String(result.id),
    );
    return { received: true, processed: true, transaction, subscription };
  }

  async reconcile(userId: string, paymentId: string) {
    if (!/^\d+$/.test(paymentId ?? '')) {
      throw new BadRequestException(
        'Se requiere un "paymentId" numérico válido de Mercado Pago',
      );
    }

    const payment = await this.payment
      .get({ id: paymentId })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `No se pudo consultar el pago ${paymentId}: ${message}`,
        );
        throw new BadGatewayException(
          `Mercado Pago no devolvió el pago ${paymentId}: ${message}`,
        );
      });

    if (payment.status !== 'approved') {
      const reason = `El pago ${paymentId} está en estado ${payment.status}, no se activa la suscripción`;
      this.logger.log(reason);
      return {
        received: true,
        processed: false,
        reason,
        status: payment.status,
      };
    }

    const paidUserId = this.paidUserId(payment);
    if (paidUserId !== userId) {
      this.logger.warn(
        `Reconcile rechazado: el pago ${paymentId} pertenece a ${paidUserId ?? 'un usuario desconocido'} y fue solicitado por ${userId}`,
      );
      throw new ForbiddenException('Ese pago no pertenece a tu cuenta');
    }

    if (
      payment.transaction_amount !== undefined &&
      payment.transaction_amount !== MEMBERSHIP_PRICE
    ) {
        throw new BadRequestException(
          `El monto del pago no corresponde a la suscripción (${MEMBERSHIP_PRICE})`,
        );
    }

    const subscription = await this.subscriptionsService.activate(
      userId,
      String(payment.id),
    );
    this.logger.log(`Payment ${paymentId} reconciled for user ${userId}`);
    return { received: true, processed: true, subscription };
  }

  private paidUserId(payment: PaymentReference) {
    const metadataUserId = payment.metadata?.['user_id'];
    if (typeof metadataUserId === 'string' && metadataUserId) {
      return metadataUserId;
    }
    return payment.external_reference ?? null;
  }

  async simulate(request: CheckoutRequest) {
    if (process.env.MP_ALLOW_SIMULATION !== 'true') {
      throw new ForbiddenException(
        'Simulación deshabilitada: define MP_ALLOW_SIMULATION=true en .env',
      );
    }

    const member = await this.resolveMember(request);
    const paymentId = `sim-${Date.now()}`;
    const transaction: Transaction = {
      id: String(this.transactions.length + 1),
      paymentId,
      email: member.email,
      amount: MEMBERSHIP_PRICE,
      currency: 'COP',
      status: 'approved',
      createdAt: new Date(),
    };
    this.transactions.push(transaction);

    const subscription = await this.subscriptionsService.activate(
      member.id,
      paymentId,
    );
    this.logger.log(`Simulated payment ${paymentId} for user ${member.id}`);
    return { received: true, simulated: true, transaction, subscription };
  }

  getTransactions() {
    return this.transactions;
  }

  private extractPaymentId(notification: MercadoPagoNotification) {
    const candidates = [
      notification?.data?.id,
      notification?.data?.payment_id,
      notification?.id,
    ];
    const found = candidates.find(
      (value) => value !== undefined && value !== null && `${value}`.length > 0,
    );
    return found === undefined ? undefined : String(found);
  }

  private async resolveMember(request: CheckoutRequest) {
    const userId = request.userId ?? request.id;
    if (userId) {
      return this.usersService.findById(userId);
    }
    if (request.email) {
      const member = await this.usersService.findByEmail(request.email);
      if (!member) {
        throw new NotFoundException(
          `No se encontró un usuario con el email ${request.email}`,
        );
      }
      return member;
    }
    throw new BadRequestException(
      'Se requiere "userId" (o "id") o "email" para generar el pago',
    );
  }

  private async resolveUserId(payment: PaymentReference) {
    const metadataUserId = payment.metadata?.['user_id'];
    if (typeof metadataUserId === 'string' && metadataUserId) {
      return metadataUserId;
    }
    if (payment.external_reference) {
      return payment.external_reference;
    }
    const email = payment.payer?.email;
    if (!email) return null;
    const member = await this.usersService.findByEmail(email);
    return member?.id ?? null;
  }

  private get baseUrl() {
    return process.env.APP_URL ?? 'http://localhost:3000';
  }

  private get frontendUrl() {
    return optionalEnv('FRONTEND_URL', 'http://localhost:4200').replace(
      /\/+$/,
      '',
    );
  }

  private isPubliclyReachable(url: string) {
    return !/(localhost|127\.0\.0\.1|0\.0\.0\.0|\.local|:\d+)/i.test(url);
  }
}
