import type { MuscleGroup } from './exercise.model';
import type { ExperienceLevel } from './experience.model';
import type { Intensity } from './routine.model';

export interface RecommendedItem {
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: number;
  repsRange: string;
  loadKg: number | null;
  loadNote: string | null;
}

export interface RecommendedRoutine {
  id: string;
  name: string;
  description: string;
  focusTag: string;
  intensity: Intensity;
  estimatedMinutes: number;
  scheduledDays: number[];
  items: RecommendedItem[];
}

export interface RecommendationGuideline {
  label: string;
  value: string;
  note: string;
}

export interface RecommendationPlan {
  level: ExperienceLevel;
  levelLabel: string;
  title: string;
  summary: string;
  weeklyFrequency: number;
  guidelines: RecommendationGuideline[];
  routines: RecommendedRoutine[];
}
