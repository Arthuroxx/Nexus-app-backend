import { Injectable } from '@nestjs/common';
import { getSupabase } from '../supabase/supabase-client';
import { UsersService } from '../users/users.service';
import { RoutinesService } from '../routines/routines.service';
import { assertUuid } from '../common/uuid';
import type { QueryResult } from '../models';
import type {
  HomeView,
  MeView,
  ScheduleDay,
  SessionDay,
  WorkoutSessionRow,
} from '../models';
import { addDays, computeWeek, startOfWeek, toDateOnly } from './home.week';

const STREAK_WEEKS_TO_SCAN = 52;

@Injectable()
export class HomeService {
  constructor(
    private readonly usersService: UsersService,
    private readonly routinesService: RoutinesService,
  ) {}

  private get supabase() {
    return getSupabase();
  }

  async getMe(userId: string): Promise<MeView> {
    assertUuid(userId, 'El usuario');
    const user = await this.usersService.findById(userId);
    return { id: user.id, displayName: user.name || 'Atleta' };
  }

  async getHome(userId: string): Promise<HomeView> {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const rangeStart = addDays(weekStart, -7 * STREAK_WEEKS_TO_SCAN);

    const routines = await this.routinesService.list(userId);
    const sessions = await this.loadSessions(userId, rangeStart);

    const schedules: ScheduleDay[] = routines.map((routine) => ({
      scheduledDays: routine.scheduledDays,
      estimatedMinutes: routine.estimatedMinutes,
    }));

    const todayWeekday = today.getDay() === 0 ? 7 : today.getDay();
    const currentSessions: SessionDay[] = sessions
      .filter((session) => session.date >= toDateOnly(weekStart))
      .map((session) => ({ date: session.date, minutes: session.minutes }));

    const { week, weekProgress } = computeWeek(today, schedules, currentSessions);

    const todayRoutine = routines.find((routine) =>
      routine.scheduledDays.includes(todayWeekday),
    );
    const todayWorkout = todayRoutine
      ? await this.routinesService.getById(userId, todayRoutine.id)
      : null;

    const currentWeekSessions = sessions.filter(
      (session) => session.date >= toDateOnly(weekStart),
    );

    // TODO: calcular récords personales del mes cuando exista el flujo de registrar entrenamientos.
    const stats = {
      weekVolumeKg: this.round(currentWeekSessions.reduce((sum, s) => sum + s.volumeKg, 0)),
      weekActiveMinutes: currentWeekSessions.reduce((sum, s) => sum + s.minutes, 0),
      personalRecordsThisMonth: 0,
    };

    const streakWeeks = this.computeStreak(
      weekStart,
      schedules,
      sessions,
      weekProgress,
    );

    return { todayWorkout, week, weekProgress, streakWeeks, stats };
  }

  private async loadSessions(
    userId: string,
    rangeStart: Date,
  ): Promise<(SessionDay & { volumeKg: number })[]> {
    const result = (await this.supabase
      .from('workout_sessions')
      .select('finished_at, duration_minutes, total_volume_kg')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .gte('finished_at', rangeStart.toISOString())) as QueryResult<
      Pick<
        WorkoutSessionRow,
        'finished_at' | 'duration_minutes' | 'total_volume_kg'
      >[] | null
    >;
    if (result.error) throw result.error;

    return (result.data ?? [])
      .filter((row) => !!row.finished_at)
      .map((row) => {
        const finished = new Date(row.finished_at as string);
        return {
          date: toDateOnly(finished),
          minutes: row.duration_minutes ?? 0,
          volumeKg: this.toNumber(row.total_volume_kg),
        };
      });
  }

  private computeStreak(
    weekStart: Date,
    schedules: ScheduleDay[],
    sessions: (SessionDay & { volumeKg: number })[],
    current: { done: number; planned: number },
  ): number {
    const plannedPerWeek = new Set(
      schedules.flatMap((schedule) => schedule.scheduledDays),
    ).size;
    if (plannedPerWeek === 0) {
      return 0;
    }

    const doneByDate = new Set(sessions.map((session) => session.date));
    const countInWeek = (start: Date): number => {
      let count = 0;
      for (let offset = 0; offset < 7; offset++) {
        if (doneByDate.has(toDateOnly(addDays(start, offset)))) {
          count += 1;
        }
      }
      return count;
    };

    let streak = 0;
    if (current.planned > 0 && current.done >= current.planned) {
      streak = 1;
    }

    for (let back = 1; back <= STREAK_WEEKS_TO_SCAN; back++) {
      const start = addDays(weekStart, -7 * back);
      if (countInWeek(start) >= plannedPerWeek) {
        streak += 1;
      } else {
        break;
      }
    }

    return streak;
  }

  private toNumber(value: number | string | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
