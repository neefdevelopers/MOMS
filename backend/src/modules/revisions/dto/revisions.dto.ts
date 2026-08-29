import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class RequestRevisionDto {
  @IsString()
  @IsNotEmpty()
  entityType: string; // PROJECT, TASK, SCRIPT, GRAPHIC_REQ, CALENDAR, DELIVERABLE

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  detailedRequest: string;

  @IsOptional()
  @IsString()
  priority?: string; // LOW, MEDIUM, HIGH, CRITICAL

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  specificArea?: string;

  @IsOptional()
  @IsString()
  reviewerComments?: string;

  @IsOptional()
  @IsString()
  reviewStage?: string; // TECHNICAL_REVIEW, MEDIA_REVIEW, CLIENT_REVIEW

  @IsOptional()
  @IsString()
  originalAssigneeId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string; // Reassignee (Media Manager only)

  @IsOptional()
  @IsString()
  previousVersionUrl?: string;

  @IsOptional()
  @IsString()
  referenceAttachmentUrl?: string;
}

export class SubmitRevisionDto {
  @IsString()
  @IsNotEmpty()
  revisedVersionUrl: string;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class ReviewRevisionDecisionDto {
  @IsString()
  @IsNotEmpty()
  decision: string; // APPROVE, REQUEST_REVISION

  @IsOptional()
  @IsString()
  comments?: string;
}

export class ReassignRevisionDto {
  @IsString()
  @IsNotEmpty()
  newAssigneeId: string;

  @IsOptional()
  @IsString()
  reassignmentReason?: string;
}
