import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExercisesService } from './exercises.service';
import type { ExerciseInput, TokenPayload } from '../models';

@Controller('api/exercises')
@UseGuards(JwtAuthGuard)
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  list(@CurrentUser() user: TokenPayload) {
    return this.exercisesService.list(user.sub);
  }

  @Get(':id')
  getOne(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    return this.exercisesService.getById(user.sub, id);
  }

  @Post()
  async create(
    @CurrentUser() user: TokenPayload,
    @Body() body: ExerciseInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const created = await this.exercisesService.create(user.sub, body ?? {});
    response.header('Location', `/api/exercises/${created.id}`);
    response.status(201);
    return created;
  }

  @Put(':id')
  update(
    @CurrentUser() user: TokenPayload,
    @Param('id') id: string,
    @Body() body: ExerciseInput,
  ) {
    return this.exercisesService.update(user.sub, id, body ?? {});
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    return this.exercisesService.remove(user.sub, id);
  }
}
