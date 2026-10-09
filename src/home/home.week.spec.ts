import { addDays, computeWeek, startOfWeek, toDateOnly } from './home.week';

describe('computeWeek', () => {
  // Jueves 8 de octubre de 2026.
  const today = new Date(2026, 9, 8, 12, 0, 0);

  it('marca DONE, TODAY y REST según la sesión y el calendario', () => {
    const schedules = [{ scheduledDays: [1, 3, 4], estimatedMinutes: 45 }];
    const sessions = [
      { date: toDateOnly(addDays(startOfWeek(today), 0)), minutes: 40 },
    ];

    const { week, weekProgress } = computeWeek(today, schedules, sessions);

    expect(week[0].status).toBe('DONE');
    expect(week[0].minutes).toBe(40);
    expect(week[2].status).toBe('REST');
    expect(week[3].status).toBe('TODAY');
    expect(week[3].minutes).toBe(45);
    expect(week[4].status).toBe('REST');
    expect(weekProgress).toEqual({ done: 1, planned: 3 });
  });

  it('marca REST cuando un día programado ya pasó sin sesión', () => {
    const schedules = [{ scheduledDays: [3, 4], estimatedMinutes: 30 }];
    const { week } = computeWeek(today, schedules, []);
    expect(week[2].status).toBe('REST');
    expect(week[3].status).toBe('TODAY');
  });

  it('devuelve todo REST sin rutinas', () => {
    const { week, weekProgress } = computeWeek(today, [], []);
    expect(week.every((day) => day.status === 'REST')).toBe(true);
    expect(weekProgress).toEqual({ done: 0, planned: 0 });
  });
});