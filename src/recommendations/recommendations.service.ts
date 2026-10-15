import { Injectable, NotFoundException } from '@nestjs/common';
import { ExercisesService } from '../exercises/exercises.service';
import { RoutinesService } from '../routines/routines.service';
import { UsersService } from '../users/users.service';
import type {
  RecommendationPlan,
  RoutineDetail,
  RoutineItemInput,
} from '../models';
import { catalogFor, findTemplate } from './recommendation.catalog';

const DEFAULT_LEVEL = 'PRINCIPIANTE';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly exercisesService: ExercisesService,
    private readonly routinesService: RoutinesService,
  ) {}

  async forUser(userId: string): Promise<RecommendationPlan> {
    const level = await this.usersService.getExperienceLevel(userId);
    return catalogFor(level ?? DEFAULT_LEVEL);
  }

  async applyTemplate(
    userId: string,
    templateId: string,
  ): Promise<RoutineDetail> {
    const template = findTemplate(templateId);
    if (!template) {
      throw new NotFoundException('La plantilla de rutina no existe.');
    }

    const items: RoutineItemInput[] = [];
    for (const item of template.routine.items) {
      const exercise = await this.exercisesService.ensureByName(userId, {
        name: item.exerciseName,
        muscleGroup: item.muscleGroup,
        defaultSets: item.sets,
        defaultReps: item.reps,
        defaultLoadKg: item.loadKg,
      });
      items.push({
        exerciseId: exercise.id,
        sets: item.sets,
        reps: item.reps,
        loadKg: item.loadKg,
        loadNote: item.loadNote,
      });
    }

    return this.routinesService.create(userId, {
      name: template.routine.name,
      description: template.routine.description,
      focusTag: template.routine.focusTag,
      intensity: template.routine.intensity,
      estimatedMinutes: template.routine.estimatedMinutes,
      scheduledDays: template.routine.scheduledDays,
      items,
    });
  }
}
