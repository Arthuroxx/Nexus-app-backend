import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HomeService } from './home.service';
import type { TokenPayload } from '../models';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('me')
  me(@CurrentUser() user: TokenPayload) {
    return this.homeService.getMe(user.sub);
  }

  @Get('home')
  home(@CurrentUser() user: TokenPayload) {
    return this.homeService.getHome(user.sub);
  }
}
