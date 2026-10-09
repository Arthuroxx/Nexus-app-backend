import type { MuscleGroup } from './exercise.model';

export const INTENSITIES = ['BAJA', 'MEDIA', 'ALTA'] as const;

export type Intensity = (typeof INTENSITIES)[number];

export interface RoutineRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  focus_tag: string | null;
  intensity: Intensity;
  estimated_minutes: number;
  scheduled_days: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineItemRow {
  id: string;
  routine_id: string;
  exercise_id: string;
  position: number;
  sets: number;
  reps: number;
  load_kg: number | string | null;
  load_note: string | null;
}

export interface RoutineSummary {
  id: string;
  name: string;
  description: string | null;
  focusTag: string | null;
  intensity: Intensity;
  estimatedMinutes: number;
  scheduledDays: number[];
  exerciseCount: number;
  lastDoneAt: string | null;
}

export interface RoutineItemView {
  id: string;
  exerciseId: string;
  position: number;
  sets: number;
  reps: number;
  loadKg: number | null;
  loadNote: string | null;
  exercise: {
    id: string;
    name: string;
    muscleGroup: MuscleGroup;
  };
}

export interface RoutineDetail extends RoutineSummary {
  items: RoutineItemView[];
}

export interface RoutineItemInput {
  exerciseId?: unknown;
  sets?: unknown;
  reps?: unknown;
  loadKg?: unknown;
  loadNote?: unknown;
}

/** Datos que el cliente puede enviar (el userId nunca viene del body). */
export interface RoutineInput {
  name?: unknown;
  description?: unknown;
  focusTag?: unknown;
  intensity?: unknown;
  estimatedMinutes?: unknown;
  scheduledDays?: unknown;
  items?: unknown;
}
