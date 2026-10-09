import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { getSupabase } from '../supabase/supabase-client';

jest.mock('../supabase/supabase-client', () => ({ getSupabase: jest.fn() }));

const getSupabaseMock = getSupabase as jest.Mock;

function makeQuery(result: unknown): any {
  const query: any = {};
  const chain = () => query;
  for (const method of [
    'select',
    'eq',
    'neq',
    'in',
    'order',
    'limit',
    'update',
    'insert',
    'delete',
    'upsert',
    'not',
    'gte',
    'lte',
  ]) {
    query[method] = jest.fn(chain);
  }
  query.maybeSingle = jest.fn(() => Promise.resolve(result));
  query.single = jest.fn(() => Promise.resolve(result));
  query.then = (onFulfilled: (value: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return query;
}

function useTables(tables: Record<string, unknown>): void {
  getSupabaseMock.mockReturnValue({
    from: jest.fn((table: string) => makeQuery(tables[table])),
  });
}

const exerciseRow = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: 'user-1',
  name: 'Press banca',
  muscle_group: 'PECHO',
  default_sets: 4,
  default_reps: 8,
  default_load_kg: 60,
  notes: null,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
};

describe('ExercisesService', () => {
  const service = new ExercisesService();

  describe('normalizeInput', () => {
    it('exige el nombre', () => {
      expect(() =>
        service.normalizeInput({ muscleGroup: 'PECHO' }),
      ).toThrow(BadRequestException);
    });

    it('rechaza un grupo muscular inválido', () => {
      expect(() =>
        service.normalizeInput({ name: 'Press', muscleGroup: 'BRAZOS' }),
      ).toThrow(BadRequestException);
    });

    it('rechaza series fuera de rango', () => {
      expect(() =>
        service.normalizeInput({ name: 'Press', muscleGroup: 'PECHO', defaultSets: 30 }),
      ).toThrow(BadRequestException);
    });

    it('normaliza una entrada válida con carga nula', () => {
      const result = service.normalizeInput({
        name: '  Dominadas ',
        muscleGroup: 'ESPALDA',
        defaultSets: 3,
        defaultReps: 10,
        defaultLoadKg: '',
      });
      expect(result.name).toBe('Dominadas');
      expect(result.defaultLoadKg).toBeNull();
    });
  });

  describe('getById', () => {
    it('responde 404 cuando el ejercicio no existe o es de otro usuario', async () => {
      useTables({ exercises: { data: null, error: null } });
      await expect(service.getById('user-1', exerciseRow.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('responde 409 cuando el nombre ya existe para el usuario', async () => {
      useTables({
        exercises: { data: null, error: { code: '23505', message: 'duplicado' } },
      });
      await expect(
        service.create('user-1', { name: 'Press', muscleGroup: 'PECHO' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('responde 409 con las rutinas que usan el ejercicio', async () => {
      useTables({
        exercises: { data: exerciseRow, error: null },
        routine_items: {
          data: [
            { routines: { name: 'Tren superior' } },
            { routines: { name: 'Cuerpo completo' } },
          ],
          error: null,
        },
      });

      const error = await service
        .remove('user-1', exerciseRow.id)
        .catch((caught: unknown) => caught as ConflictException);

      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).message).toContain('Tren superior');
      expect((error as ConflictException).message).toContain('Cuerpo completo');
    });
  });
});
