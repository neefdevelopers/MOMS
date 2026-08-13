import { IsUUID, IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateEquipmentRequestDto {
  @IsUUID()
  equipmentId: string;

  @IsUUID()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  purpose: string;

  @IsDateString()
  requiredDate: string;

  @IsDateString()
  expectedReturnDate: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
