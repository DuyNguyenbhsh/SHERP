import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({
    description: 'Lý do thay đổi (audit log)',
    example: 'Chuyển GDDA theo quyết định số 123/QĐ',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  change_reason?: string;
}
