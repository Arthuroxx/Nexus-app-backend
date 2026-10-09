import type { Exercise, ExerciseRow } from '../models';

function toNumber(value: number | string | null): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    defaultSets: row.default_sets,
    defaultReps: row.default_reps,
    defaultLoadKg: toNumber(row.default_load_kg),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
