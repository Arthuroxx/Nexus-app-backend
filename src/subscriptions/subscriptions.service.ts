import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { getSupabase } from '../supabase/supabase-client';
import { UsersService } from '../users/users.service';
import { MEMBERSHIP_DAYS, SUBSCRIPTION_COLUMNS } from './subscription.entity';
import type {
  GrantMembershipRequest,
  QueryResult,
  Subscription,
  SubscriptionStatusRow,
  SubscriptionStatusView,
} from '../models';

export const MEMBERSHIP_PRICE = 80_000;
export const SUBSCRIPTION_PRICE = 80_000;

const DAY_IN_MS = 86_400_000;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly usersService: UsersService) {}

  private get supabase() {
    return getSupabase();
  }

  async activate(userId: string, paymentId: string, days?: number) {
    const startDate = new Date();
    const endDate = this.addDays(startDate, days ?? MEMBERSHIP_DAYS);

    const result = (await this.supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          status: 'ACTIVE',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_id: paymentId,
        },
        { onConflict: 'user_id' },
      )
      .select(SUBSCRIPTION_COLUMNS)
      .single()) as QueryResult<Subscription>;
    this.assertNoError(result);

    this.logger.log(
      `Subscription ACTIVE for user ${userId} until ${endDate.toISOString()} (payment ${paymentId})`,
    );
    return this.toView(result.data);
  }

  async getStatusForUser(userId: string) {
    const result = (await this.findByUserId(
      userId,
    )) as QueryResult<Subscription | null>;
    this.assertNoError(result);

    const row = result.data;
    if (!row) {
      return this.toView({
        status: 'EXPIRED',
        start_date: null,
        end_date: null,
        payment_id: null,
      });
    }

    const view = this.toView(row);
    if (row.status === 'ACTIVE' && view.status === 'Inactive') {
      await this.expire(row.id);
    }
    return view;
  }

  async renew(userId: string, days?: number) {
    const view = await this.extend(userId, days ?? MEMBERSHIP_DAYS);
    this.logger.log(
      `Subscription renewed for user ${userId} until ${view.endDate}`,
    );
    return view;
  }

  async grant(userId: string, days: number = MEMBERSHIP_DAYS) {
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new BadRequestException('"days" debe ser un entero entre 1 y 365');
    }

    const view = await this.extend(userId, days);
    this.logger.log(
      `Subscription granted to user ${userId}: +${days} days until ${view.endDate} (no payment)`,
    );
    return view;
  }

  async grantForAdmin(request: GrantMembershipRequest) {
    const userId = request.userId ?? (await this.resolveUserId(request.email));
    if (!userId) {
      throw new BadRequestException(
        'Se requiere "userId" o "email" para otorgar la suscripción',
      );
    }

    return this.grant(userId, request.days ?? MEMBERSHIP_DAYS);
  }

  private async extend(userId: string, days: number) {
    const found = (await this.findByUserId(
      userId,
    )) as QueryResult<Subscription | null>;
    this.assertNoError(found);

    const current = found.data;
    const now = new Date();
    const currentEndDate = current?.end_date ?? null;
    const base = this.isFuture(currentEndDate) ? new Date(currentEndDate) : now;
    const endDate = this.addDays(base, days);

    const result = (await this.supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          status: 'ACTIVE',
          start_date: current?.start_date ?? now.toISOString(),
          end_date: endDate.toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select(SUBSCRIPTION_COLUMNS)
      .single()) as QueryResult<Subscription>;
    this.assertNoError(result);

    return this.toView(result.data);
  }

  private async resolveUserId(email: string | undefined) {
    if (!email) {
      return undefined;
    }
    const member = await this.usersService.findByEmail(email);
    if (!member) {
      throw new NotFoundException(
        `No se encontró un usuario con el email ${email}`,
      );
    }
    return member.id;
  }

  private findByUserId(userId: string) {
    return this.supabase
      .from('subscriptions')
      .select(SUBSCRIPTION_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();
  }

  private assertNoError(result: QueryResult<unknown>) {
    if (!result.error) return;

    const { code, message } = result.error;
    this.logger.error(`Supabase error ${code}: ${message}`);

    if (code === '42501') {
      throw new InternalServerErrorException(
        'La tabla subscriptions tiene RLS activo: ejecuta "alter table public.subscriptions disable row level security;" en Supabase',
      );
    }
    if (code === '42P10') {
      throw new InternalServerErrorException(
        'Falta el índice único en user_id: ejecuta "create unique index if not exists subscriptions_user_id_key on public.subscriptions (user_id);" en Supabase',
      );
    }
    throw new InternalServerErrorException(
      `Error de base de datos: ${message}`,
    );
  }

  private async expire(id: string) {
    const result = (await this.supabase
      .from('subscriptions')
      .update({ status: 'EXPIRED' })
      .eq('id', id)) as QueryResult<unknown>;
    if (result.error) {
      this.logger.warn(`Could not mark subscription ${id} as EXPIRED`);
    }
  }

  private toView(row: SubscriptionStatusRow): SubscriptionStatusView {
    const endDate = row.end_date;
    const active =
      row.status === 'ACTIVE' &&
      !!endDate &&
      new Date(endDate).getTime() > Date.now();
    return {
      price: MEMBERSHIP_PRICE,
      status: active ? 'Active' : 'Inactive',
      startDate: row.start_date,
      endDate: row.end_date,
      daysRemaining:
        active && endDate
          ? Math.ceil((new Date(endDate).getTime() - Date.now()) / DAY_IN_MS)
          : 0,
      paymentId: row.payment_id,
    };
  }

  private isFuture(date: string | null): date is string {
    return !!date && new Date(date).getTime() > Date.now();
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
