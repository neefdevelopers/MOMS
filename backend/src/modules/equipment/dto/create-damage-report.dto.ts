import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateDamageReportDto {
  @IsString()
  @IsNotEmpty()
  equipmentId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  severity: string; // LOW, MEDIUM, HIGH, CRITICAL

  @IsString()
  @IsOptional()
  repairNotes?: string;
}
