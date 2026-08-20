import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdvancedSearchDto } from './dto/advanced-search.dto';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') query: string,
    @Query('module') moduleKey: string,
    @CurrentUser() user: any,
  ) {
    if (moduleKey && moduleKey.trim().length > 0) {
      return this.searchService.searchModule(moduleKey, query, user);
    }
    return this.searchService.searchAll(query, user);
  }

  @Post('advanced')
  searchAdvancedPost(
    @Body() dto: AdvancedSearchDto,
    @CurrentUser() user: any,
  ) {
    return this.searchService.advancedSearch(dto, user);
  }

  @Get('advanced')
  searchAdvancedGet(
    @Query() dto: AdvancedSearchDto,
    @CurrentUser() user: any,
  ) {
    return this.searchService.advancedSearch(dto, user);
  }

  // ── User-Private Saved Filters ─────────────────────────────────────────────

  @Get('saved-filters')
  getSavedFilters(@CurrentUser() user: any) {
    return this.searchService.getSavedFilters(user.id);
  }

  @Post('saved-filters')
  saveFilter(
    @Body() dto: { name: string; module?: string; icon?: string; filters: any },
    @CurrentUser() user: any,
  ) {
    return this.searchService.saveFilter(user.id, dto);
  }

  @Delete('saved-filters/:id')
  deleteSavedFilter(
    @Param('id') filterId: string,
    @CurrentUser() user: any,
  ) {
    return this.searchService.deleteSavedFilter(user.id, filterId);
  }
}
