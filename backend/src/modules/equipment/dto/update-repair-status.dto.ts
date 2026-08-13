import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateRepairStatusDto {
  @IsString()
  @IsNotEmpty()
  repairStatus: string; // PENDING, IN_REPAIR, REPAIRED, UNREPAIRABLE

  @IsString()
  @IsOptional()
  repairNotes?: string;
}
