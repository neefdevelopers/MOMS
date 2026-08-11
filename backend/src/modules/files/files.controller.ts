import { Controller, Get, Post, Param, Body, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService, MulterFile } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('project/:projectId')
  getProjectFiles(@Param('projectId') projectId: string) {
    return this.filesService.getProjectFiles(projectId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: MulterFile,
    @Body() data: { projectId: string; scriptId?: string; graphicRequirementId?: string; folderCategory?: string },
    @CurrentUser('id') uploadedById: string,
  ) {
    return this.filesService.saveFileMetadataAndPhysicalDisk(file, data, uploadedById);
  }
}
