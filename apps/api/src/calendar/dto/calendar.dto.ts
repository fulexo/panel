import { IsString, IsOptional, IsDateString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsString()
  @IsOptional()
  type?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsString()
  @IsOptional()
  type?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class BusinessHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DaySchedule)
  days!: DaySchedule[];
}

export class DaySchedule {
  @IsString()
  day!: string; // 'monday', 'tuesday', etc.

  @IsString()
  @IsOptional()
  startTime?: string; // '09:00'

  @IsString()
  @IsOptional()
  endTime?: string; // '17:00'

  @IsBoolean()
  @IsOptional()
  isWorkingDay?: boolean;
}

export class HolidayDto {
  @IsString()
  name!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  recurring?: boolean;
}