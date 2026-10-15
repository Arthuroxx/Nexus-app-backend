import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getSupabase } from '../supabase/supabase-client';
import { assertUuid } from '../common/uuid';
import {
  ValidationErrors,
  readEnum,
  readInt,
  readNumber,
  readString,
} from '../common/validation';
import type { QueryResult } from '../models';
import {
  MUSCLE_GROUPS,
  type Exercise,
  type ExerciseInput,
  type ExerciseRow,
  type MuscleGroup,
} from '../models';
import { toExercise } from './exercise.mapper';

const EXERCISE_COLUMNS =
  'id, user_id, name, muscle_group, default_sets, default_reps, default_load_kg, notes, created_at, updated_at';

const UNIQUE_VIOLATION = '23505';

interface NormalizedExercise {
  name: string;
  muscleGroup: MuscleGroup;
  defaultSets: number;
  defaultReps: number;
  defaultLoadKg: number | null;
  notes: string | null;
}

@Injectable()
export class ExercisesService {
  private get supabase() {
    return getSupabase();
  }

  normalizeInput(input: ExerciseInput): NormalizedExercise {
    const errors = new ValidationErrors();

    const name = readString(errors, input.name, 'El nombre', {
      required: true,
      max: 60,
    });
    const muscleGroup = readEnum(
      errors,
      input.muscleGroup,
      'El grupo muscular',
      MUSCLE_GROUPS,
    );
    const defaultSets = readInt(errors, input.defaultSets, 'Las series', {
      min: 1,
      max: 20,
      fallback: 3,
    });
    const defaultReps = readInt(errors, input.defaultReps, 'Las repeticiones', {
      min: 1,
      max: 100,
      fallback: 10,
    });
    const defaultLoadKg = readNumber(
      errors,
      input.defaultLoadKg,
      'La carga por defecto',
      { min: 0 },
    );
    const notes = readString(errors, input.notes, 'La nota', { max: 120 });

    errors.throwIfInvalid();

    return {
      name: name as string,
      muscleGroup: muscleGroup as MuscleGroup,
      defaultSets: defaultSets as number,
      defaultReps: defaultReps as number,
      defaultLoadKg,
      notes,
    };
  }

  async list(userId: string): Promise<Exercise[]> {
    const result = (await this.supabase
      .from('exercises')
      .select(EXERCISE_COLUMNS)
      .eq('user_id', userId)
      .order('name', { ascending: true })) as QueryResult<ExerciseRow[] | null>;
    if (result.error) throw result.error;
    return (result.data ?? []).map(toExercise);
  }

  async getById(userId: string, id: string): Promise<Exercise> {
    assertUuid(id, 'El ejercicio');
    const result = (await this.supabase
      .from('exercises')
      .select(EXERCISE_COLUMNS)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()) as QueryResult<ExerciseRow | null>;
    if (result.error) throw result.error;
    if (!result.data) {
      throw new NotFoundException('El ejercicio no existe o no es tuyo.');
    }
    return toExercise(result.data);
  }

  async findByName(userId: string, name: string): Promise<Exercise | null> {
    const normalized = name.trim();
    if (normalized.length === 0) {
      return null;
    }
    const result = (await this.supabase
      .from('exercises')
      .select(EXERCISE_COLUMNS)
      .eq('user_id', userId)
      .ilike('name', normalized)
      .maybeSingle()) as QueryResult<ExerciseRow | null>;
    if (result.error) throw result.error;
    return result.data ? toExercise(result.data) : null;
  }

  async ensureByName(
    userId: string,
    data: {
      name: string;
      muscleGroup: MuscleGroup;
      defaultSets: number;
      defaultReps: number;
      defaultLoadKg: number | null;
    },
  ): Promise<Exercise> {
    const existing = await this.findByName(userId, data.name);
    if (existing) {
      return existing;
    }

    try {
      return await this.create(userId, data);
    } catch (error) {
      const existingAgain = await this.findByName(userId, data.name);
      if (existingAgain) {
        return existingAgain;
      }
      throw error;
    }
  }

  async create(userId: string, input: ExerciseInput): Promise<Exercise> {
    const data = this.normalizeInput(input);
    const result = (await this.supabase
      .from('exercises')
      .insert({
        user_id: userId,
        name: data.name,
        muscle_group: data.muscleGroup,
        default_sets: data.defaultSets,
        default_reps: data.defaultReps,
        default_load_kg: data.defaultLoadKg,
        notes: data.notes,
      })
      .select(EXERCISE_COLUMNS)
      .single()) as QueryResult<ExerciseRow>;
    if (result.error) {
      this.handleWriteError(result.error);
    }
    return toExercise(result.data);
  }

  async update(
    userId: string,
    id: string,
    input: ExerciseInput,
  ): Promise<Exercise> {
    assertUuid(id, 'El ejercicio');
    const data = this.normalizeInput(input);
    const result = (await this.supabase
      .from('exercises')
      .update({
        name: data.name,
        muscle_group: data.muscleGroup,
        default_sets: data.defaultSets,
        default_reps: data.defaultReps,
        default_load_kg: data.defaultLoadKg,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(EXERCISE_COLUMNS)
      .maybeSingle()) as QueryResult<ExerciseRow | null>;
    if (result.error) {
      this.handleWriteError(result.error);
    }
    if (!result.data) {
      throw new NotFoundException('El ejercicio no existe o no es tuyo.');
    }
    return toExercise(result.data);
  }

  async remove(userId: string, id: string): Promise<void> {
    const exercise = await this.getById(userId, id);
    const routineNames = await this.findRoutinesUsing(userId, exercise.id);
    if (routineNames.length > 0) {
      throw new ConflictException(
        `Este ejercicio está en las rutinas: ${routineNames.join(', ')}. Quítalo de ellas primero.`,
      );
    }

    const result = (await this.supabase
      .from('exercises')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)) as QueryResult<unknown>;
    if (result.error) throw result.error;
  }

  private async findRoutinesUsing(
    userId: string,
    exerciseId: string,
  ): Promise<string[]> {
    const result = (await this.supabase
      .from('routine_items')
      .select('routines!inner(name, user_id)')
      .eq('exercise_id', exerciseId)
      .eq('routines.user_id', userId)) as QueryResult<
      { routines: { name: string } | { name: string }[] }[] | null
    >;
    if (result.error) throw result.error;

    const names = new Set<string>();
    for (const row of result.data ?? []) {
      const routine = row.routines;
      if (Array.isArray(routine)) {
        routine.forEach((item) => names.add(item.name));
      } else if (routine) {
        names.add(routine.name);
      }
    }
    return [...names];
  }

  private handleWriteError(error: { code?: string; message: string }): never {
    if (error.code === UNIQUE_VIOLATION) {
      throw new ConflictException('Ya tienes un ejercicio con ese nombre.');
    }
    throw error;
  }
}
