import type {
  ScheduleDay,
  SessionDay,
  WeekDayView,
  WeekProgressView,
  WeekStatus,
} from '../models';

const DAY_MS = 86_400_000;

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const isoDay = result.getDay() === 0 ? 7 : result.getDay();
  result.setDate(result.getDate() - (isoDay - 1));
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isoWeekday(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

export interface WeekComputation {
  week: WeekDayView[];
  weekProgress: WeekProgressView;
}

/**
 * Calcula los 7 días de la semana actual y el progreso.
 * Reglas: DONE si hay sesión terminada, TODAY si es hoy sin completar,
 * PLANNED si está programado y es futuro, REST en cualquier otro caso.
 */
export function computeWeek(
  today: Date,
  schedules: ScheduleDay[],
  sessions: SessionDay[],
): WeekComputation {
  const weekStart = startOfWeek(today);
  const todayOffset = Math.round(
    (new Date(toDateOnly(today)).getTime() -
      new Date(toDateOnly(weekStart)).getTime()) /
      DAY_MS,
  );

  const scheduledMinutes = new Map<number, number>();
  for (const schedule of schedules) {
    for (const day of schedule.scheduledDays) {
      scheduledMinutes.set(
        day,
        (scheduledMinutes.get(day) ?? 0) + schedule.estimatedMinutes,
      );
    }
  }

  const doneMinutes = new Map<string, number>();
  for (const session of sessions) {
    doneMinutes.set(
      session.date,
      (doneMinutes.get(session.date) ?? 0) + session.minutes,
    );
  }

  const week: WeekDayView[] = [];
  let done = 0;
  let planned = 0;

  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(weekStart, offset);
    const dateOnly = toDateOnly(date);
    const weekday = offset + 1;
    const scheduled = scheduledMinutes.has(weekday);
    const scheduledForDay = scheduledMinutes.get(weekday) ?? 0;
    if (scheduled) {
      planned += 1;
    }

    let status: WeekStatus = 'REST';
    let minutes = 0;

    if (doneMinutes.has(dateOnly)) {
      status = 'DONE';
      minutes = doneMinutes.get(dateOnly) ?? 0;
      done += 1;
    } else if (offset === todayOffset) {
      status = scheduled ? 'TODAY' : 'REST';
      minutes = scheduled ? scheduledForDay : 0;
    } else if (offset > todayOffset && scheduled) {
      status = 'PLANNED';
      minutes = scheduledForDay;
    }

    week.push({ date: dateOnly, weekday, status, minutes });
  }

  return { week, weekProgress: { done, planned } };
}
