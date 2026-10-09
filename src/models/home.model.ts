import type { RoutineDetail } from './routine.model';

export type WeekStatus = 'DONE' | 'TODAY' | 'PLANNED' | 'REST';

export interface WeekDayView {
  /** Fecha ISO (yyyy-mm-dd). */
  date: string;
  /** Dia ISO: 1 = lunes ... 7 = domingo. */
  weekday: number;
  status: WeekStatus;
  minutes: number;
}

export interface WeekProgressView {
  done: number;
  planned: number;
}

export interface HomeStatsView {
  weekVolumeKg: number;
  weekActiveMinutes: number;
  personalRecordsThisMonth: number;
}

export interface HomeView {
  todayWorkout: RoutineDetail | null;
  week: WeekDayView[];
  weekProgress: WeekProgressView;
  streakWeeks: number;
  stats: HomeStatsView;
}

export interface MeView {
  id: string;
  displayName: string;
}

export interface WorkoutSessionRow {
  id: string;
  user_id: string;
  routine_id: string | null;
  started_at: string;
  finished_at: string | null;
  duration_minutes: number | null;
  total_volume_kg: number | string | null;
}

export interface ScheduleDay {
  scheduledDays: number[];
  estimatedMinutes: number;
}

export interface SessionDay {
  /** Fecha (yyyy-mm-dd) del `finished_at`. */
  date: string;
  minutes: number;
}
