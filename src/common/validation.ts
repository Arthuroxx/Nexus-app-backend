import { BadRequestException } from '@nestjs/common';

/**
 * Acumula errores de validacion en espanol y los convierte en un 400.
 * Se usa en lugar de un ORM/Bean-Validation porque el proyecto ya valida
 * manualmente en los servicios (ver UsersService/AuthController).
 */
export class ValidationErrors {
  private readonly messages: string[] = [];

  add(message: string): void {
    this.messages.push(message);
  }

  get hasErrors(): boolean {
    return this.messages.length > 0;
  }

  throwIfInvalid(): void {
    if (this.hasErrors) {
      throw new BadRequestException(this.messages.join(' '));
    }
  }
}

export function readString(
  errors: ValidationErrors,
  value: unknown,
  label: string,
  options: { required?: boolean; max?: number; trim?: boolean } = {},
): string | null {
  const { required = false, max, trim = true } = options;
  if (value === undefined || value === null || value === '') {
    if (required) {
      errors.add(`${label} es obligatorio.`);
    }
    return null;
  }
  if (typeof value !== 'string') {
    errors.add(`${label} debe ser texto.`);
    return null;
  }
  const result = trim ? value.trim() : value;
  if (required && result.length === 0) {
    errors.add(`${label} es obligatorio.`);
    return null;
  }
  if (max !== undefined && result.length > max) {
    errors.add(`${label} no puede superar ${max} caracteres.`);
    return null;
  }
  return result.length === 0 ? null : result;
}

export function readInt(
  errors: ValidationErrors,
  value: unknown,
  label: string,
  options: { min?: number; max?: number; required?: boolean; fallback?: number } = {},
): number | null {
  const { min, max, required = false, fallback } = options;
  if (value === undefined || value === null || value === '') {
    if (required) {
      errors.add(`${label} es obligatorio.`);
    }
    return fallback ?? null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    errors.add(`${label} debe ser un número entero.`);
    return null;
  }
  if (min !== undefined && parsed < min) {
    errors.add(`${label} debe ser como mínimo ${min}.`);
    return null;
  }
  if (max !== undefined && parsed > max) {
    errors.add(`${label} debe ser como máximo ${max}.`);
    return null;
  }
  return parsed;
}

export function readNumber(
  errors: ValidationErrors,
  value: unknown,
  label: string,
  options: { min?: number; required?: boolean } = {},
): number | null {
  const { min, required = false } = options;
  if (value === undefined || value === null || value === '') {
    if (required) {
      errors.add(`${label} es obligatorio.`);
    }
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    errors.add(`${label} debe ser un número.`);
    return null;
  }
  if (min !== undefined && parsed < min) {
    errors.add(`${label} debe ser como mínimo ${min}.`);
    return null;
  }
  return parsed;
}

export function readEnum<T extends string>(
  errors: ValidationErrors,
  value: unknown,
  label: string,
  allowed: readonly T[],
  fallback?: T,
): T | null {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }
    errors.add(`${label} es obligatorio.`);
    return null;
  }
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    errors.add(`${label} debe ser uno de: ${allowed.join(', ')}.`);
    return null;
  }
  return value as T;
}

export function readDayArray(errors: ValidationErrors, value: unknown): number[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    errors.add('Los días programados no son válidos.');
    return [];
  }
  const days = new Set<number>();
  for (const raw of value) {
    const day = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      errors.add('Los días programados deben estar entre lunes (1) y domingo (7).');
      return [];
    }
    days.add(day);
  }
  return [...days].sort((a, b) => a - b);
}
