import { Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';
import type { TokenPayload } from '../models';

@Controller('api/recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  list(@CurrentUser() user: TokenPayload) {
    return this.recommendationsService.forUser(user.sub);
  }

  @Post(':id/apply')
  async apply(
    @CurrentUser() user: TokenPayload,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const created = await this.recommendationsService.applyTemplate(
      user.sub,
      id,
    );
    response.header('Location', `/api/routines/${created.id}`);
    response.status(201);
    return created;
  }
}
