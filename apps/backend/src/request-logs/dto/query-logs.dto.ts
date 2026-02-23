import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LogStatus } from '../entities/request-log.entity.js';

export class QueryLogsDto {
  @ApiPropertyOptional({ description: 'Filter by server alias' })
  @IsOptional()
  @IsString()
  serverAlias?: string;

  @ApiPropertyOptional({ enum: LogStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(LogStatus)
  status?: LogStatus;

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 100, description: 'Limit results (max 500)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 100;

  @ApiPropertyOptional({ default: 0, description: 'Offset for pagination' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
