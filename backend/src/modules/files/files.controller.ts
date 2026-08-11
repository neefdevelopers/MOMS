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

  @Post()
  createDeliverable(
    @Body()
    data: {
      projectId: string;
      fileName: string;
      deliverableType: string;
      scriptId?: string;
      graphicRequirementId?: string;
      fileSize?: number;
      fileType?: string;
      storagePath?: string;
    },
    @CurrentUser('id') uploadedById: string,
  ) {
    return this.filesService.createDeliverableMetadata(data, uploadedById);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: MulterFile,
    @Body() data: { projectId: string; scriptId?: string; graphicRequirementId?: string; folderCategory?: string; attachmentCategory?: string },
    @CurrentUser('id') uploadedById: string,
  ) {
    return this.filesService.saveFileMetadataAndPhysicalDisk(file, data, uploadedById);
  }
}
