import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { optionalEnv } from '../config/env';
import type { GoogleIdentity } from '../models';

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly client = new OAuth2Client();

  async verify(credential: string): Promise<GoogleIdentity> {
    const clientId = optionalEnv('GOOGLE_CLIENT_ID', '');
    if (!clientId) {
      throw new ServiceUnavailableException(
        'El inicio de sesión con Google no está disponible: define GOOGLE_CLIENT_ID en .env',
      );
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      payload = ticket.getPayload() ?? undefined;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Credencial de Google rechazada: ${message}`);
      throw new UnauthorizedException('La credencial de Google no es válida');
    }

    if (!payload) {
      throw new UnauthorizedException('La credencial de Google no es válida');
    }

    if (!payload.iss || !GOOGLE_ISSUERS.includes(payload.iss)) {
      throw new UnauthorizedException('La credencial de Google no es válida');
    }

    if (!payload.sub) {
      throw new UnauthorizedException(
        'La credencial de Google no incluye un identificador',
      );
    }

    if (!payload.email) {
      throw new UnauthorizedException(
        'La cuenta de Google no tiene correo electrónico',
      );
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException(
        'El correo de la cuenta de Google no está verificado',
      );
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name,
    };
  }
}
