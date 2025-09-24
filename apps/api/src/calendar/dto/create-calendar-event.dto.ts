import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;
}