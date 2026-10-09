import { NotFoundException } from '@nestjs/common';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function assertUuid(value: string, resource: string): void {
  if (!isUuid(value)) {
    throw new NotFoundException(`${resource} no encontrado.`);
  }
}
