export const MUSCLE_GROUPS = [
  'PECHO',
  'ESPALDA',
  'HOMBROS',
  'BICEPS',
  'TRICEPS',
  'PIERNAS',
  'GLUTEOS',
  'CORE',
  'CUERPO_COMPLETO',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface ExerciseRow {
  id: string;
  user_id: string;
  name: string;
  muscle_group: MuscleGroup;
  default_sets: number;
  default_reps: number;
  default_load_kg: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  defaultSets: number;
  defaultReps: number;
  defaultLoadKg: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Datos que el cliente puede enviar (el userId nunca viene del body). */
export interface ExerciseInput {
  name?: unknown;
  muscleGroup?: unknown;
  defaultSets?: unknown;
  defaultReps?: unknown;
  defaultLoadKg?: unknown;
  notes?: unknown;
}
