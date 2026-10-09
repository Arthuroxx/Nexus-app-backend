import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoutinesService } from './routines.service';
import { getSupabase } from '../supabase/supabase-client';

jest.mock('../supabase/supabase-client', () => ({ getSupabase: jest.fn() }));

const getSupabaseMock = getSupabase as jest.Mock;

const EXERCISE_ID = '22222222-2222-2222-2222-222222222222';

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

const validItem = {
  exerciseId: EXERCISE_ID,
  sets: 4,
  reps: 8,
  loadKg: 60,
  loadNote: null,
};

describe('RoutinesService', () => {
  const service = new RoutinesService();

  describe('normalizeInput', () => {
    it('exige el nombre', () => {
      expect(() =>
        service.normalizeInput({ items: [validItem] }),
      ).toThrow(BadRequestException);
    });

    it('exige al menos un ejercicio', () => {
      expect(() =>
        service.normalizeInput({ name: 'Tren superior', items: [] }),
      ).toThrow(BadRequestException);
    });

    it('rechaza una intensidad inválida', () => {
      expect(() =>
        service.normalizeInput({
          name: 'Tren superior',
          intensity: 'EXTREMA',
          items: [validItem],
        }),
      ).toThrow(BadRequestException);
    });

    it('rechaza días programados fuera de rango', () => {
      expect(() =>
        service.normalizeInput({
          name: 'Tren superior',
          scheduledDays: [1, 9],
          items: [validItem],
        }),
      ).toThrow(BadRequestException);
    });

    it('normaliza una entrada válida', () => {
      const result = service.normalizeInput({
        name: ' Tren superior ',
        intensity: 'ALTA',
        estimatedMinutes: 60,
        scheduledDays: [3, 1, 3],
        items: [validItem],
      });
      expect(result.name).toBe('Tren superior');
      expect(result.intensity).toBe('ALTA');
      expect(result.scheduledDays).toEqual([1, 3]);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('responde 404 cuando la rutina es de otro usuario', async () => {
      useTables({ routines: { data: null, error: null } });
      await expect(
        service.getById('user-1', EXERCISE_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('responde 404 cuando un ejercicio no pertenece al usuario', async () => {
      useTables({ exercises: { data: [], error: null } });
      await expect(
        service.create('user-1', {
          name: 'Tren superior',
          items: [validItem],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
