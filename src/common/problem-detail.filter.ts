import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

const TITLES: Record<number, string> = {
  400: 'Solicitud inválida',
  401: 'No autorizado',
  403: 'Prohibido',
  404: 'No encontrado',
  409: 'Conflicto',
  500: 'Error interno del servidor',
};

/**
 * Normaliza las respuestas de error al formato Problem Details (RFC 9457).
 * El frontend lee el campo `detail` para mostrar mensajes en español.
 */
@Catch()
export class ProblemDetailFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let detail = TITLES[status] ?? 'Error inesperado';

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        detail = body;
      } else if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        const message = record['message'];
        if (Array.isArray(message)) {
          detail = message.join(' ');
        } else if (typeof message === 'string') {
          detail = message;
        } else if (typeof record['error'] === 'string') {
          detail = record['error'] as string;
        }
      }
    } else {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      type: 'about:blank',
      title: TITLES[status] ?? 'Error',
      status,
      detail,
    });
  }
}
