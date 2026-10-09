import { Injectable, NotFoundException } from '@nestjs/common';
import { getSupabase } from '../supabase/supabase-client';
import { assertUuid } from '../common/uuid';
import {
  ValidationErrors,
  readDayArray,
  readEnum,
  readInt,
  readNumber,
  readString,
} from '../common/validation';
import type { QueryResult } from '../models';
import {
  INTENSITIES,
  type ExerciseRow,
  type Intensity,
  type RoutineDetail,
  type RoutineInput,
  type RoutineItemInput,
  type RoutineItemRow,
  type RoutineRow,
  type RoutineSummary,
} from '../models';
import { toRoutineDetail, toRoutineItemView, toRoutineSummary } from './routine.mapper';
import { isUuid } from '../common/uuid';

const ROUTINE_COLUMNS =
  'id, user_id, name, description, focus_tag, intensity, estimated_minutes, scheduled_days, created_at, updated_at';
const ITEM_COLUMNS =
  'id, routine_id, exercise_id, position, sets, reps, load_kg, load_note';
const EXERCISE_COLUMNS =
  'id, user_id, name, muscle_group, default_sets, default_reps, default_load_kg, notes, created_at, updated_at';

interface NormalizedItem {
  exerciseId: string;
  sets: number;
  reps: number;
  loadKg: number | null;
  loadNote: string | null;
}

interface NormalizedRoutine {
  name: string;
  description: string | null;
  focusTag: string | null;
  intensity: Intensity;
  estimatedMinutes: number;
  scheduledDays: number[];
  items: NormalizedItem[];
}

@Injectable()
export class RoutinesService {
  private get supabase() {
    return getSupabase();
  }

  normalizeInput(input: RoutineInput): NormalizedRoutine {
    const errors = new ValidationErrors();

    const name = readString(errors, input.name, 'El nombre', {
      required: true,
      max: 60,
    });
    const description = readString(errors, input.description, 'La descripción', {
      max: 120,
    });
    const focusTag = readString(errors, input.focusTag, 'La etiqueta de enfoque', {
      max: 20,
    });
    const intensity = readEnum(
      errors,
      input.intensity,
      'La intensidad',
      INTENSITIES,
      'MEDIA',
    );
    const estimatedMinutes = readInt(
      errors,
      input.estimatedMinutes,
      'La duración estimada',
      { min: 5, max: 240, fallback: 45 },
    );
    const scheduledDays = readDayArray(errors, input.scheduledDays);

    const items = this.normalizeItems(errors, input.items);

    errors.throwIfInvalid();

    return {
      name: name as string,
      description,
      focusTag,
      intensity: intensity as Intensity,
      estimatedMinutes: estimatedMinutes as number,
      scheduledDays,
      items,
    };
  }

  private normalizeItems(
    errors: ValidationErrors,
    rawItems: unknown,
  ): NormalizedItem[] {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      errors.add('Una rutina debe tener al menos 1 ejercicio.');
      return [];
    }

    return rawItems.map((raw, index) => {
      const item = (raw ?? {}) as RoutineItemInput;
      const position = index + 1;
      const exerciseRaw = readString(
        errors,
        item.exerciseId,
        `El ejercicio de la fila ${position}`,
        { required: true },
      );
      if (exerciseRaw && !isUuid(exerciseRaw)) {
        errors.add(`El ejercicio de la fila ${position} no es válido.`);
      }
      const sets = readInt(errors, item.sets, `Las series de la fila ${position}`, {
        min: 1,
        max: 20,
        required: true,
      });
      const reps = readInt(
        errors,
        item.reps,
        `Las repeticiones de la fila ${position}`,
        { min: 1, max: 100, required: true },
      );
      const loadKg = readNumber(
        errors,
        item.loadKg,
        `La carga de la fila ${position}`,
        { min: 0 },
      );
      const loadNote = readString(
        errors,
        item.loadNote,
        `La nota de carga de la fila ${position}`,
        { max: 30 },
      );

      return {
        exerciseId: exerciseRaw ?? '',
        sets: sets ?? 0,
        reps: reps ?? 0,
        loadKg,
        loadNote,
      };
    });
  }

  async list(userId: string): Promise<RoutineSummary[]> {
    const routinesResult = (await this.supabase
      .from('routines')
      .select(ROUTINE_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })) as QueryResult<
      RoutineRow[] | null
    >;
    if (routinesResult.error) throw routinesResult.error;

    const rows = routinesResult.data ?? [];
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.id);
    const [counts, lastDone] = await Promise.all([
      this.countItems(ids),
      this.lastDoneMap(userId, ids),
    ]);

    return rows.map((row) =>
      toRoutineSummary(row, counts.get(row.id) ?? 0, lastDone.get(row.id) ?? null),
    );
  }

  async getById(userId: string, id: string): Promise<RoutineDetail> {
    const row = await this.getRoutineRow(userId, id);
    const items = await this.loadItems(row.id);
    const exercises = await this.loadOwnedExercises(
      userId,
      items.map((item) => item.exercise_id),
    );
    const views = items.map((item) =>
      toRoutineItemView(item, exercises.get(item.exercise_id)),
    );
    const lastDone = await this.lastDoneMap(userId, [row.id]);
    const summary = toRoutineSummary(
      row,
      views.length,
      lastDone.get(row.id) ?? null,
    );
    return toRoutineDetail(summary, views);
  }

  async create(userId: string, input: RoutineInput): Promise<RoutineDetail> {
    const data = this.normalizeInput(input);
    const exercises = await this.loadOwnedExercises(
      userId,
      data.items.map((item) => item.exerciseId),
    );

    const created = (await this.supabase
      .from('routines')
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description,
        focus_tag: data.focusTag,
        intensity: data.intensity,
        estimated_minutes: data.estimatedMinutes,
        scheduled_days: data.scheduledDays,
      })
      .select(ROUTINE_COLUMNS)
      .single()) as QueryResult<RoutineRow>;
    if (created.error) throw created.error;

    const items = await this.replaceItems(created.data.id, data.items);
    const views = items.map((item) =>
      toRoutineItemView(item, exercises.get(item.exercise_id)),
    );
    return toRoutineDetail(toRoutineSummary(created.data, views.length, null), views);
  }

  async update(
    userId: string,
    id: string,
    input: RoutineInput,
  ): Promise<RoutineDetail> {
    await this.getRoutineRow(userId, id);
    const data = this.normalizeInput(input);
    const exercises = await this.loadOwnedExercises(
      userId,
      data.items.map((item) => item.exerciseId),
    );

    const updated = (await this.supabase
      .from('routines')
      .update({
        name: data.name,
        description: data.description,
        focus_tag: data.focusTag,
        intensity: data.intensity,
        estimated_minutes: data.estimatedMinutes,
        scheduled_days: data.scheduledDays,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(ROUTINE_COLUMNS)
      .maybeSingle()) as QueryResult<RoutineRow | null>;
    if (updated.error) throw updated.error;
    if (!updated.data) {
      throw new NotFoundException('La rutina no existe o no es tuya.');
    }

    const deleteResult = (await this.supabase
      .from('routine_items')
      .delete()
      .eq('routine_id', id)) as QueryResult<unknown>;
    if (deleteResult.error) throw deleteResult.error;

    const items = await this.replaceItems(id, data.items);
    const views = items.map((item) =>
      toRoutineItemView(item, exercises.get(item.exercise_id)),
    );
    return toRoutineDetail(
      toRoutineSummary(updated.data, views.length, null),
      views,
    );
  }

  async remove(userId: string, id: string): Promise<void> {
    assertUuid(id, 'La rutina');
    const result = (await this.supabase
      .from('routines')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()) as QueryResult<{ id: string } | null>;
    if (result.error) throw result.error;
    if (!result.data) {
      throw new NotFoundException('La rutina no existe o no es tuya.');
    }
  }

  private async getRoutineRow(userId: string, id: string): Promise<RoutineRow> {
    assertUuid(id, 'La rutina');
    const result = (await this.supabase
      .from('routines')
      .select(ROUTINE_COLUMNS)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()) as QueryResult<RoutineRow | null>;
    if (result.error) throw result.error;
    if (!result.data) {
      throw new NotFoundException('La rutina no existe o no es tuya.');
    }
    return result.data;
  }

  private async loadItems(routineId: string): Promise<RoutineItemRow[]> {
    const result = (await this.supabase
      .from('routine_items')
      .select(ITEM_COLUMNS)
      .eq('routine_id', routineId)
      .order('position', { ascending: true })) as QueryResult<
      RoutineItemRow[] | null
    >;
    if (result.error) throw result.error;
    return result.data ?? [];
  }

  private async replaceItems(
    routineId: string,
    items: NormalizedItem[],
  ): Promise<RoutineItemRow[]> {
    const payload = items.map((item, index) => ({
      routine_id: routineId,
      exercise_id: item.exerciseId,
      position: index + 1,
      sets: item.sets,
      reps: item.reps,
      load_kg: item.loadKg,
      load_note: item.loadNote,
    }));

    const result = (await this.supabase
      .from('routine_items')
      .insert(payload)
      .select(ITEM_COLUMNS)) as QueryResult<RoutineItemRow[] | null>;
    if (result.error) throw result.error;
    return [...(result.data ?? [])].sort((a, b) => a.position - b.position);
  }

  private async loadOwnedExercises(
    userId: string,
    ids: string[],
  ): Promise<Map<string, ExerciseRow>> {
    const unique = [...new Set(ids.filter((id) => id.length > 0))];
    if (unique.length === 0) {
      return new Map();
    }
    const result = (await this.supabase
      .from('exercises')
      .select(EXERCISE_COLUMNS)
      .eq('user_id', userId)
      .in('id', unique)) as QueryResult<ExerciseRow[] | null>;
    if (result.error) throw result.error;

    const map = new Map<string, ExerciseRow>();
    for (const row of result.data ?? []) {
      map.set(row.id, row);
    }
    if (map.size < unique.length) {
      throw new NotFoundException('Uno de los ejercicios no existe o no es tuyo.');
    }
    return map;
  }

  private async countItems(routineIds: string[]): Promise<Map<string, number>> {
    const result = (await this.supabase
      .from('routine_items')
      .select('routine_id')
      .in('routine_id', routineIds)) as QueryResult<
      { routine_id: string }[] | null
    >;
    if (result.error) throw result.error;

    const counts = new Map<string, number>();
    for (const row of result.data ?? []) {
      counts.set(row.routine_id, (counts.get(row.routine_id) ?? 0) + 1);
    }
    return counts;
  }

  private async lastDoneMap(
    userId: string,
    routineIds: string[],
  ): Promise<Map<string, string>> {
    const result = (await this.supabase
      .from('workout_sessions')
      .select('routine_id, finished_at')
      .eq('user_id', userId)
      .in('routine_id', routineIds)
      .not('finished_at', 'is', null)) as QueryResult<
      { routine_id: string | null; finished_at: string | null }[] | null
    >;
    if (result.error) throw result.error;

    const map = new Map<string, string>();
    for (const row of result.data ?? []) {
      if (!row.routine_id || !row.finished_at) continue;
      const current = map.get(row.routine_id);
      if (!current || row.finished_at > current) {
        map.set(row.routine_id, row.finished_at);
      }
    }
    return map;
  }
}
