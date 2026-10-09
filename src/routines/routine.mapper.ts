import type {
  ExerciseRow,
  MuscleGroup,
  RoutineDetail,
  RoutineItemRow,
  RoutineItemView,
  RoutineRow,
  RoutineSummary,
} from '../models';

function toNumber(value: number | string | null): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toRoutineSummary(
  row: RoutineRow,
  exerciseCount: number,
  lastDoneAt: string | null,
): RoutineSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    focusTag: row.focus_tag ?? null,
    intensity: row.intensity,
    estimatedMinutes: row.estimated_minutes,
    scheduledDays: [...(row.scheduled_days ?? [])].sort((a, b) => a - b),
    exerciseCount,
    lastDoneAt,
  };
}

export function toRoutineItemView(
  item: RoutineItemRow,
  exercise: ExerciseRow | undefined,
): RoutineItemView {
  return {
    id: item.id,
    exerciseId: item.exercise_id,
    position: item.position,
    sets: item.sets,
    reps: item.reps,
    loadKg: toNumber(item.load_kg),
    loadNote: item.load_note ?? null,
    exercise: {
      id: exercise?.id ?? item.exercise_id,
      name: exercise?.name ?? 'Ejercicio',
      muscleGroup: (exercise?.muscle_group ?? 'CUERPO_COMPLETO') as MuscleGroup,
    },
  };
}

export function toRoutineDetail(
  summary: RoutineSummary,
  items: RoutineItemView[],
): RoutineDetail {
  return { ...summary, items };
}
