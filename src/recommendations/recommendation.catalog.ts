import {
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_LABELS,
  type ExperienceLevel,
  type Intensity,
  type MuscleGroup,
  type RecommendedItem,
  type RecommendedRoutine,
  type RecommendationGuideline,
  type RecommendationPlan,
} from '../models';

/**
 * Programas de entrenamiento basados en evidencia.
 *
 * Referencias principales:
 * - Schoenfeld, Ogborn & Krieger (2017), J Sports Sci: relación dosis-respuesta
 *   entre volumen semanal y hipertrofia; ≥10 series/músculo/semana maximizan
 *   ganancias en la mayoría de personas.
 * - Schoenfeld, Ogborn & Krieger (2016), Sports Med: entrenar cada músculo
 *   ~2 veces por semana es superior a 1 vez cuando el volumen es equivalente.
 * - Schoenfeld & Grgic (2018), Strength Cond J: guías de volumen (10+ series),
 *   noveles 1-3 series de 8-12 reps a 70-85% 1RM; avanzados 3-6 series de
 *   1-12 reps a 70-100% 1RM.
 * - ACSM Position Stand: noveles 2-3 días/semana full-body; intermedios
 *   (~6 meses) 4 días/semana torso/pierna; avanzados 4-6 días/semana split.
 * - Proximidad al fallo: la mayoría del trabajo termina a RIR 1-3 (Schoenfeld).
 */

function item(
  exerciseName: string,
  muscleGroup: MuscleGroup,
  sets: number,
  repsRange: string,
): RecommendedItem {
  return {
    exerciseName,
    muscleGroup,
    sets,
    reps: Number.parseInt(repsRange, 10),
    repsRange,
    loadKg: null,
    loadNote: null,
  };
}

interface RoutineBlueprint {
  id: string;
  name: string;
  description: string;
  focusTag: string;
  intensity: Intensity;
  estimatedMinutes: number;
  scheduledDays: number[];
  items: RecommendedItem[];
}

interface PlanBlueprint {
  title: string;
  summary: string;
  weeklyFrequency: number;
  defaultLoadNote: string;
  guidelines: RecommendationGuideline[];
  routines: RoutineBlueprint[];
}

const PLANS: Record<ExperienceLevel, PlanBlueprint> = {
  PRINCIPIANTE: {
    title: 'Full-body 3 días/semana',
    summary:
      'Con poca experiencia el cuerpo responde mejor al cuerpo completo 3 veces por semana: más práctica de los movimientos básicos, técnica sólida y ~10 series efectivas por músculo para empezar a ganar fuerza y masa.',
    weeklyFrequency: 3,
    defaultLoadNote: 'RIR 2-3 · descanso 90-120 s',
    guidelines: [
      {
        label: 'Volumen',
        value: '~9-10 series/músculo',
        note: '2-3 series por ejercicio: el mínimo eficaz para hipertrofia.',
      },
      {
        label: 'Frecuencia',
        value: '2-3× por músculo',
        note: 'Cuerpo completo lunes, miércoles y viernes.',
      },
      {
        label: 'Intensidad',
        value: 'RIR 2-3',
        note: '≈65-75% 1RM; termina 2-3 repeticiones antes del fallo.',
      },
      {
        label: 'Repeticiones',
        value: '8-12',
        note: 'Excéntrico controlado de ~2 s y rango completo.',
      },
      {
        label: 'Descanso',
        value: '90-120 s',
        note: 'Entre series de ejercicios compuestos.',
      },
    ],
    routines: [
      {
        id: 'principiante-fullbody-a',
        name: 'Full-body A',
        description:
          'Sesión full-body con foco en técnica y básicos. Descansa 90-120 s entre series.',
        focusTag: 'Full-body',
        intensity: 'BAJA',
        estimatedMinutes: 50,
        scheduledDays: [1],
        items: [
          item('Sentadilla con barra', 'PIERNAS', 3, '8-12'),
          item('Press de banca', 'PECHO', 3, '8-12'),
          item('Remo con barra', 'ESPALDA', 3, '8-12'),
          item('Curl con mancuernas', 'BICEPS', 3, '10-12'),
          item('Extensión de tríceps en polea', 'TRICEPS', 3, '10-12'),
        ],
      },
      {
        id: 'principiante-fullbody-b',
        name: 'Full-body B',
        description:
          'Segunda sesión full-body: empuje, tirón y accesorios. Un día distinto para sumar variedad.',
        focusTag: 'Full-body',
        intensity: 'BAJA',
        estimatedMinutes: 50,
        scheduledDays: [3],
        items: [
          item('Peso muerto rumano', 'PIERNAS', 3, '8-12'),
          item('Press militar con mancuernas', 'HOMBROS', 3, '8-12'),
          item('Jalón al pecho', 'ESPALDA', 3, '8-12'),
          item('Elevaciones laterales', 'HOMBROS', 3, '12-15'),
          item('Curl martillo', 'BICEPS', 3, '10-12'),
          item('Curl de muñeca con barra', 'ANTEBRAZOS', 3, '12-15'),
        ],
      },
      {
        id: 'principiante-fullbody-c',
        name: 'Full-body C',
        description:
          'Tercera sesión full-body: variantes y aislamientos para completar el volumen semanal.',
        focusTag: 'Full-body',
        intensity: 'BAJA',
        estimatedMinutes: 50,
        scheduledDays: [5],
        items: [
          item('Prensa de piernas', 'PIERNAS', 3, '10-12'),
          item('Press inclinado con mancuernas', 'PECHO', 3, '8-12'),
          item('Remo con mancuerna a una mano', 'ESPALDA', 3, '10-12'),
          item('Fondos en banco', 'TRICEPS', 3, '10-12'),
          item('Elevación de talones de pie', 'PIERNAS', 3, '12-15'),
        ],
      },
    ],
  },

  INTERMEDIO: {
    title: 'Torso/Pierna 4 días/semana',
    summary:
      'Con ~6 meses de experiencia un split torso/pierna 4 días permite subir el volumen a 12-16 series por músculo y seguir entrenando cada zona 2 veces por semana, la frecuencia asociada a mejores ganancias.',
    weeklyFrequency: 4,
    defaultLoadNote: 'RIR 1-2 · descanso 2-3 min',
    guidelines: [
      {
        label: 'Volumen',
        value: '12-16 series/músculo',
        note: 'Reparte el volumen en 2 sesiones por zona.',
      },
      {
        label: 'Frecuencia',
        value: '2× por músculo',
        note: 'Split torso/pierna, 4 días por semana.',
      },
      {
        label: 'Intensidad',
        value: 'RIR 1-2',
        note: '≈70-80% 1RM; sube peso al alcanzar el tope del rango.',
      },
      {
        label: 'Repeticiones',
        value: '6-12 · 10-15',
        note: 'Compuestos 6-12; aislamientos 10-15.',
      },
      {
        label: 'Descanso',
        value: '2-3 min',
        note: 'En los movimientos principales.',
      },
    ],
    routines: [
      {
        id: 'intermedio-torso-a',
        name: 'Torso A',
        description:
          'Empuje y tirón horizontal. Compuestos con 2-3 min de descanso y RIR 1-2.',
        focusTag: 'Torso',
        intensity: 'MEDIA',
        estimatedMinutes: 65,
        scheduledDays: [1],
        items: [
          item('Press de banca', 'PECHO', 4, '6-10'),
          item('Remo con barra', 'ESPALDA', 4, '6-10'),
          item('Press militar con barra', 'HOMBROS', 3, '8-12'),
          item('Jalón al pecho', 'ESPALDA', 3, '10-12'),
          item('Curl con barra', 'BICEPS', 3, '10-12'),
          item('Extensión de tríceps en polea', 'TRICEPS', 3, '10-12'),
        ],
      },
      {
        id: 'intermedio-pierna-a',
        name: 'Pierna A',
        description:
          'Dominante de rodilla con accesorios. Descanso 2-3 min en la sentadilla.',
        focusTag: 'Pierna',
        intensity: 'MEDIA',
        estimatedMinutes: 60,
        scheduledDays: [2],
        items: [
          item('Sentadilla con barra', 'PIERNAS', 4, '6-10'),
          item('Peso muerto rumano', 'PIERNAS', 3, '8-12'),
          item('Prensa de piernas', 'PIERNAS', 3, '10-12'),
          item('Curl femoral tumbado', 'PIERNAS', 3, '10-12'),
          item('Elevación de talones de pie', 'PIERNAS', 3, '12-15'),
        ],
      },
      {
        id: 'intermedio-torso-b',
        name: 'Torso B',
        description:
          'Empuje inclinado, tirón vertical y hombro posterior para equilibrar el torso.',
        focusTag: 'Torso',
        intensity: 'MEDIA',
        estimatedMinutes: 65,
        scheduledDays: [4],
        items: [
          item('Press inclinado con mancuernas', 'PECHO', 4, '8-12'),
          item('Dominadas', 'ESPALDA', 4, '6-10'),
          item('Remo con mancuerna a una mano', 'ESPALDA', 3, '10-12'),
          item('Elevaciones laterales', 'HOMBROS', 3, '12-15'),
          item('Face pull', 'HOMBROS', 3, '12-15'),
          item('Curl martillo', 'BICEPS', 3, '10-12'),
          item('Extensión de tríceps sobre la cabeza', 'TRICEPS', 3, '10-12'),
        ],
      },
      {
        id: 'intermedio-pierna-b',
        name: 'Pierna B',
        description:
          'Dominante de cadera (peso muerto) y trabajo unilateral para completar la semana.',
        focusTag: 'Pierna',
        intensity: 'MEDIA',
        estimatedMinutes: 60,
        scheduledDays: [5],
        items: [
          item('Peso muerto', 'PIERNAS', 4, '5-8'),
          item('Prensa de piernas', 'PIERNAS', 3, '10-12'),
          item('Zancadas con mancuernas', 'PIERNAS', 3, '10-12'),
          item('Curl femoral tumbado', 'PIERNAS', 3, '10-12'),
          item('Elevación de talones sentado', 'PIERNAS', 3, '12-15'),
          item('Curl de muñeca con barra', 'ANTEBRAZOS', 3, '12-15'),
        ],
      },
    ],
  },

  AVANZADO: {
    title: 'Push/Pull/Legs 6 días/semana',
    summary:
      'El nivel avanzado necesita más volumen (16-20+ series por músculo) manteniendo cada zona 2 veces por semana. Un split push/pull/legs repetido dos veces lo consigue, con trabajo a RIR 0-2 y progresión planificada.',
    weeklyFrequency: 6,
    defaultLoadNote: 'RIR 0-2 · descanso 2-3 min',
    guidelines: [
      {
        label: 'Volumen',
        value: '16-20+ series/músculo',
        note: 'Más volumen solo aporta si sigues progresando.',
      },
      {
        label: 'Frecuencia',
        value: '2× por músculo',
        note: 'Push/Pull/Legs repetido dos veces por semana.',
      },
      {
        label: 'Intensidad',
        value: 'RIR 0-2',
        note: '≈75-85% 1RM en los movimientos compuestos.',
      },
      {
        label: 'Repeticiones',
        value: '5-12 · 12-20',
        note: 'Compuestos pesados 5-12; aislamientos 12-20.',
      },
      {
        label: 'Descanso',
        value: '2-3 min',
        note: 'En los movimientos principales.',
      },
      {
        label: 'Progresión',
        value: 'Doble progresión',
        note: 'Sube repeticiones y luego carga; descarga cada 4-6 semanas.',
      },
    ],
    routines: [
      {
        id: 'avanzado-empuje',
        name: 'Push',
        description: 'Empuje: pecho, hombro y tríceps. Volumen alto a RIR 0-2.',
        focusTag: 'Empuje',
        intensity: 'ALTA',
        estimatedMinutes: 75,
        scheduledDays: [1, 4],
        items: [
          item('Press de banca', 'PECHO', 4, '5-8'),
          item('Press inclinado con mancuernas', 'PECHO', 4, '8-12'),
          item('Press militar con barra', 'HOMBROS', 4, '6-10'),
          item('Elevaciones laterales', 'HOMBROS', 4, '12-15'),
          item('Aperturas en polea', 'PECHO', 3, '12-15'),
          item('Extensión de tríceps en polea', 'TRICEPS', 4, '10-12'),
          item('Press francés', 'TRICEPS', 3, '10-12'),
        ],
      },
      {
        id: 'avanzado-tiron',
        name: 'Pull',
        description:
          'Tirón: espalda, bíceps y deltoides posterior. Mezcla cargas y RIR 0-2.',
        focusTag: 'Tirón',
        intensity: 'ALTA',
        estimatedMinutes: 70,
        scheduledDays: [2],
        items: [
          item('Dominadas', 'ESPALDA', 4, '6-10'),
          item('Remo con barra', 'ESPALDA', 4, '6-10'),
          item('Remo con mancuerna a una mano', 'ESPALDA', 3, '10-12'),
          item('Face pull', 'HOMBROS', 3, '15-20'),
          item('Curl con barra', 'BICEPS', 4, '8-12'),
          item('Curl inclinado con mancuernas', 'BICEPS', 3, '10-12'),
          item('Curl de muñeca con barra', 'ANTEBRAZOS', 3, '12-15'),
        ],
      },
      {
        id: 'avanzado-pierna',
        name: 'Legs',
        description:
          'Pierna completo: cuádriceps, femoral, glúteo y gemelo con volumen alto.',
        focusTag: 'Pierna',
        intensity: 'ALTA',
        estimatedMinutes: 75,
        scheduledDays: [3, 6],
        items: [
          item('Sentadilla con barra', 'PIERNAS', 4, '5-8'),
          item('Peso muerto rumano', 'PIERNAS', 4, '6-10'),
          item('Prensa de piernas', 'PIERNAS', 4, '10-12'),
          item('Extensión de cuádriceps', 'PIERNAS', 3, '12-15'),
          item('Curl femoral tumbado', 'PIERNAS', 4, '10-12'),
          item('Elevación de talones de pie', 'PIERNAS', 4, '12-15'),
          item('Elevación de piernas colgado', 'CORE', 3, '12-15'),
        ],
      },
    ],
  },
};

function finalize(
  level: ExperienceLevel,
  blueprint: PlanBlueprint,
): RecommendationPlan {
  return {
    level,
    levelLabel: EXPERIENCE_LEVEL_LABELS[level],
    title: blueprint.title,
    summary: blueprint.summary,
    weeklyFrequency: blueprint.weeklyFrequency,
    guidelines: blueprint.guidelines,
    routines: blueprint.routines.map((routine) => ({
      ...routine,
      items: routine.items.map((item) => ({
        ...item,
        loadNote: item.loadNote ?? blueprint.defaultLoadNote,
      })),
    })),
  };
}

export function catalogFor(level: ExperienceLevel): RecommendationPlan {
  return finalize(level, PLANS[level]);
}

export function findTemplate(
  templateId: string,
): { level: ExperienceLevel; routine: RecommendedRoutine } | null {
  for (const level of EXPERIENCE_LEVELS) {
    const routine = catalogFor(level).routines.find(
      (item) => item.id === templateId,
    );
    if (routine) {
      return { level, routine };
    }
  }
  return null;
}
