import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { GoogleAuthService } from './google-auth.service';
import { GOOGLE_USER_EXISTS, type TokenPayload } from '../models';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  async register(email: string, password: string, name?: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    const member = await this.usersService.create({
      email,
      name: name?.trim() || email,
      role: 'cliente',
      passwordHash,
    });
    return this.signToken(member.id, member.email);
  }

  async login(email: string, password: string) {
    const member = await this.usersService.findByEmail(email);
    if (
      !member?.passwordHash ||
      !(await bcrypt.compare(password, member.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.signToken(member.id, member.email);
  }

  async loginWithGoogle(credential: string) {
    const identity = await this.googleAuthService.verify(credential);

    const linked = await this.usersService.findByGoogleId(identity.googleId);
    if (linked) {
      return this.signToken(linked.id, linked.email);
    }

    const byEmail = await this.usersService.findByEmail(identity.email);
    if (byEmail) {
      const member = await this.usersService.linkGoogleId(
        byEmail.id,
        identity.googleId,
      );
      return this.signToken(member.id, member.email);
    }

    const member = await this.usersService.create({
      email: identity.email,
      name: identity.name?.trim() || identity.email,
      role: 'cliente',
      googleId: identity.googleId,
    });
    return this.signToken(member.id, member.email);
  }

  async registerWithGoogle(credential: string) {
    const identity = await this.googleAuthService.verify(credential);

    const existing =
      (await this.usersService.findByGoogleId(identity.googleId)) ??
      (await this.usersService.findByEmail(identity.email));

    if (existing) {
      throw new ConflictException({
        message: 'Este usuario ya existe',
        code: GOOGLE_USER_EXISTS,
      });
    }

    const member = await this.usersService.create({
      email: identity.email,
      name: identity.name?.trim() || identity.email,
      role: 'cliente',
      googleId: identity.googleId,
    });
    return this.signToken(member.id, member.email);
  }

  private signToken(sub: string, email: string) {
    const payload: TokenPayload = { sub, email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
