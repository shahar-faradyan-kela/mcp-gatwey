import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';
import { AuthType } from '../entities/mcp-server.entity.js';

export class CreateServerDto {
  @ApiProperty({ example: 'GitHub MCP Server' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    example: 'github',
    description:
      'Short alias used as tool prefix. Lowercase letters, numbers, hyphens only.',
  })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'alias must be lowercase alphanumeric with hyphens only',
  })
  alias!: string;

  @ApiProperty({ example: 'http://github-mcp-server:8080' })
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['github', 'code'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: AuthType, default: AuthType.NONE })
  @IsOptional()
  @IsEnum(AuthType)
  authType?: AuthType;

  @ApiPropertyOptional({
    description:
      'Raw credential string (encrypted at rest). For bearer: the token value. For api_key: the key value.',
  })
  @IsOptional()
  @IsString()
  authCredential?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
