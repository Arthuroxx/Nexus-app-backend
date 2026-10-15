import type { ExperienceLevel } from './experience.model';
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

export interface LastWorkoutView {
  /** Identificador de la sesión de entrenamiento. */
  sessionId: string;
  /** Rutina realizada, o null si fue un entrenamiento libre. */
  routineId: string | null;
  /** Nombre de la rutina o `Entrenamiento libre`. */
  name: string;
  /** Fecha ISO del `finished_at`. */
  finishedAt: string;
  /** Duración total en minutos. */
  durationMinutes: number;
  /** Volumen total levantado en kg. */
  volumeKg: number;
}

export interface HomeView {
  todayWorkout: RoutineDetail | null;
  lastWorkout: LastWorkoutView | null;
  week: WeekDayView[];
  weekProgress: WeekProgressView;
  streakWeeks: number;
  stats: HomeStatsView;
}

export interface MeView {
  id: string;
  displayName: string;
  experienceLevel: ExperienceLevel | null;
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
