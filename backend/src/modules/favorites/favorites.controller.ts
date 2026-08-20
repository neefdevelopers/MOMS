import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FavoritesService, ToggleFavoriteDto } from './favorites.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  getUserFavorites(@Request() req: any, @Query('entityType') entityType?: string) {
    return this.favoritesService.getUserFavorites(req.user.id, entityType);
  }

  @Get('check')
  isFavorite(
    @Request() req: any,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.favoritesService.isFavorite(req.user.id, entityType, entityId);
  }

  @Post('toggle')
  toggleFavorite(@Request() req: any, @Body() dto: ToggleFavoriteDto) {
    return this.favoritesService.toggleFavorite(req.user.id, dto);
  }

  @Delete(':id')
  removeFavorite(@Request() req: any, @Param('id') id: string) {
    return this.favoritesService.removeFavorite(req.user.id, id);
  }
}
