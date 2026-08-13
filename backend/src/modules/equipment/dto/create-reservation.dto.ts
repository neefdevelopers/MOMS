import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  projectId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsDateString()
  expectedCheckoutDate?: string;
}
