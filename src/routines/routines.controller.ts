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
import { RoutinesService } from './routines.service';
import type { RoutineInput, TokenPayload } from '../models';

@Controller('api/routines')
@UseGuards(JwtAuthGuard)
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  list(@CurrentUser() user: TokenPayload) {
    return this.routinesService.list(user.sub);
  }

  @Get(':id')
  getOne(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    return this.routinesService.getById(user.sub, id);
  }

  @Post()
  async create(
    @CurrentUser() user: TokenPayload,
    @Body() body: RoutineInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const created = await this.routinesService.create(user.sub, body ?? {});
    response.header('Location', `/api/routines/${created.id}`);
    response.status(201);
    return created;
  }

  @Put(':id')
  update(
    @CurrentUser() user: TokenPayload,
    @Param('id') id: string,
    @Body() body: RoutineInput,
  ) {
    return this.routinesService.update(user.sub, id, body ?? {});
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    return this.routinesService.remove(user.sub, id);
  }
}
