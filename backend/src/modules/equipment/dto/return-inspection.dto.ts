import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class ReturnInspectionDto {
  @IsString()
  @IsOptional()
  returnedById?: string;

  @IsString()
  @IsOptional()
  returnedByName?: string;

  @IsString()
  @IsNotEmpty()
  condition: string; // e.g. Good, Fair, Damaged, Needs Repair

  @IsBoolean()
  @IsOptional()
  hasPhysicalDamage?: boolean;

  @IsString()
  @IsOptional()
  physicalDamageNotes?: string;

  @IsBoolean()
  @IsOptional()
  hasMissingAccessories?: boolean;

  @IsString()
  @IsOptional()
  missingAccessoriesNotes?: string;

  @IsString()
  @IsOptional()
  functionalCondition?: string; // FULLY_FUNCTIONAL, PARTIALLY_FUNCTIONAL, NON_FUNCTIONAL

  @IsString()
  @IsOptional()
  cleaningStatus?: string; // CLEAN, NEEDS_CLEANING, REQUIRES_DEEP_CLEAN

  @IsString()
  @IsOptional()
  remarks?: string;
}
