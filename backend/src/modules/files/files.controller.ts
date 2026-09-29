import { Controller, Get, Post, Delete, Param, Body, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
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
      graphicRequirementId?: string;
      fileSize?: number;
      fileType?: string;
      storagePath?: string;
    },
    @CurrentUser() user: any,
  ) {
    const uploadedById = user?.id || user?.sub || user;
    const userRole = user?.role;
    return this.filesService.createDeliverableMetadata(data, uploadedById, userRole);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: MulterFile,
    @Body() data: { projectId: string; graphicRequirementId?: string; folderCategory?: string; attachmentCategory?: string },
    @CurrentUser() user: any,
  ) {
    return this.filesService.saveFileMetadataAndPhysicalDisk(file, data, user);
  }

  /**
   * Add or remove a clip code on an uploaded script document.
   * Open to all roles so everyone can SEE codes; the service restricts the write to staff
   * assigned to the parent project and returns 403 for everyone else.
   */
  @Post(':id/clip-codes')
  updateFileClipCode(
    @Param('id') id: string,
    @Body() data: { action?: 'add' | 'remove'; code?: string; description?: string },
    @CurrentUser() user: any,
  ) {
    const action = data?.action === 'remove' ? 'remove' : 'add';
    return this.filesService.updateFileClipCode(id, action, data || {}, user);
  }

  @Delete(':id')
  deleteFile(@Param('id') id: string, @CurrentUser() user: any) {
    return this.filesService.deleteFile(id, user);
  }
}
