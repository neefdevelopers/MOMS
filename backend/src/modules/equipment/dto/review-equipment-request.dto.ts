import { IsString, IsIn, IsOptional } from 'class-validator';

export class ReviewEquipmentRequestDto {
  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
