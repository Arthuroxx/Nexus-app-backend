import { EXPERIENCE_LEVELS } from '../models';
import { catalogFor, findTemplate } from './recommendation.catalog';

describe('recommendation catalog', () => {
  it('devuelve un plan completo para cada nivel', () => {
    for (const level of EXPERIENCE_LEVELS) {
      const plan = catalogFor(level);
      expect(plan.level).toBe(level);
      expect(plan.title).toBeTruthy();
      expect(plan.summary).toBeTruthy();
      expect(plan.weeklyFrequency).toBeGreaterThan(0);
      expect(plan.guidelines.length).toBeGreaterThan(0);
      expect(plan.routines.length).toBeGreaterThan(0);

      for (const routine of plan.routines) {
        expect(routine.name).toBeTruthy();
        expect(routine.description.length).toBeLessThanOrEqual(120);
        expect(routine.items.length).toBeGreaterThan(0);
      }
    }
  });

  it('respeta las guías por nivel: más frecuencia cuanto más avanzado', () => {
    expect(catalogFor('PRINCIPIANTE').weeklyFrequency).toBeLessThanOrEqual(3);
    expect(catalogFor('INTERMEDIO').weeklyFrequency).toBe(4);
    expect(catalogFor('AVANZADO').weeklyFrequency).toBeGreaterThanOrEqual(5);
  });

  it('cubre todos los grupos musculares relevantes en cada nivel', () => {
    for (const level of EXPERIENCE_LEVELS) {
      const muscles = new Set(
        catalogFor(level).routines.flatMap((routine) =>
          routine.items.map((item) => item.muscleGroup),
        ),
      );
      for (const expected of [
        'PECHO',
        'ESPALDA',
        'HOMBROS',
        'BICEPS',
        'TRICEPS',
        'ANTEBRAZOS',
        'PIERNAS',
      ]) {
        expect(muscles).toContain(expected);
      }
    }
  });

  it('guarda cargas prescritas dentro de los límites de la base de datos', () => {
    for (const level of EXPERIENCE_LEVELS) {
      for (const routine of catalogFor(level).routines) {
        for (const item of routine.items) {
          expect(item.loadNote).toBeTruthy();
          expect(String(item.loadNote).length).toBeLessThanOrEqual(30);
          expect(item.sets).toBeGreaterThanOrEqual(1);
          expect(item.sets).toBeLessThanOrEqual(20);
          expect(item.reps).toBeGreaterThanOrEqual(1);
          expect(item.reps).toBeLessThanOrEqual(100);
          expect(item.repsRange).toMatch(/^\d+-\d+$/);
        }
      }
    }
  });

  it('encuentra una plantilla por su id', () => {
    const found = findTemplate('principiante-fullbody-a');
    expect(found?.level).toBe('PRINCIPIANTE');
    expect(found?.routine.name).toBe('Full-body A');
  });

  it('devuelve null cuando la plantilla no existe', () => {
    expect(findTemplate('plantilla-inexistente')).toBeNull();
  });
});
