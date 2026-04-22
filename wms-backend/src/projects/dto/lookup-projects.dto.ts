import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProjectStage, ProjectStatus } from '../enums/project.enum';

/**
 * Query parameters cho GET /projects/lookup (SA_DESIGN §3.1.1).
 */
export class LookupProjectsDto {
  @ApiPropertyOptional({
    description: 'Chuỗi tìm kiếm (code + name), case-insensitive, unaccent.',
    example: 'jdhp',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tham số tìm kiếm không hợp lệ.' })
  @Matches(/^[\p{L}\p{N}\s\-._]*$/u, {
    message: 'Tham số tìm kiếm không hợp lệ.',
  })
  q?: string;

  @ApiPropertyOptional({
    description: 'Số item tối đa mỗi trang (mặc định 20, tối đa 50).',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset phân trang.',
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description:
      'Whitelist trạng thái (mặc định PROJECT_ACTIVE_STATUSES). Truyền CSV hoặc array.',
    enum: ProjectStatus,
    isArray: true,
    example: [ProjectStatus.ACTIVE, ProjectStatus.WARRANTY],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.length > 0) {
      return value.split(',').map((s) => s.trim());
    }
    return value;
  })
  @IsArray()
  @IsEnum(ProjectStatus, {
    each: true,
    message: 'Tham số tìm kiếm không hợp lệ.',
  })
  status_whitelist?: ProjectStatus[];
}

/**
 * 1 item trong response của GET /projects/lookup (SA_DESIGN §3.1.3).
 */
export class LookupProjectItemDto {
  @ApiProperty({ example: 'f3e9c2a1-2b7c-4e9d-8a16-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: 'JDHP001' })
  project_code: string;

  @ApiProperty({ example: 'Dự án JDHP Hà Nội' })
  project_name: string;

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @ApiProperty({ enum: ProjectStage, example: ProjectStage.CONSTRUCTION })
  stage: ProjectStage;

  @ApiProperty({
    example: 'b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
    nullable: true,
  })
  organization_id: string | null;

  @ApiProperty({ example: 'Phòng Kỹ thuật', nullable: true })
  organization_name: string | null;
}

/**
 * Data payload của response GET /projects/lookup.
 */
export class LookupProjectsResponseDataDto {
  @ApiProperty({ type: [LookupProjectItemDto] })
  items: LookupProjectItemDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;
}

/**
 * Response wrapper (sau khi TransformInterceptor bọc).
 */
export class LookupProjectsResponseDto {
  @ApiProperty({ example: true })
  status: boolean;

  @ApiProperty({ example: 'Thành công' })
  message: string;

  @ApiProperty({ type: LookupProjectsResponseDataDto })
  data: LookupProjectsResponseDataDto;
}
