import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private validateCredentials(body: { email?: string; password?: string }) {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('email y password son requeridos');
    }
    return { email: body.email, password: body.password };
  }

  @Post('login')
  login(@Body() body: { email?: string; password?: string }) {
    const credentials = this.validateCredentials(body);
    return this.authService.login(credentials.email, credentials.password);
  }

  @Post('register')
  register(@Body() body: { email?: string; password?: string; name?: string }) {
    const credentials = this.validateCredentials(body);
    return this.authService.register(
      credentials.email,
      credentials.password,
      body.name,
    );
  }

  @Post('google')
  loginWithGoogle(@Body() body: { credential?: string }) {
    const credential = body?.credential;
    if (!credential) {
      throw new BadRequestException('credential es requerido');
    }
    return this.authService.loginWithGoogle(credential);
  }

  @Post('google/register')
  registerWithGoogle(@Body() body: { credential?: string }) {
    const credential = body?.credential;
    if (!credential) {
      throw new BadRequestException('credential es requerido');
    }
    return this.authService.registerWithGoogle(credential);
  }
}
