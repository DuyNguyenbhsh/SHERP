import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsObject,
} from 'class-validator';

export class SubmitApprovalDto {
  @ApiProperty({ example: 'PROJECT_BUDGET' })
  @IsString()
  @IsNotEmpty()
  entity_type: string;

  @ApiProperty({ description: 'UUID cua doi tuong can duyet' })
  @IsString()
  @IsNotEmpty()
  entity_id: string;

  @ApiPropertyOptional({
    description: 'So tien de xet nguong',
    example: 25000000,
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Du lieu thay doi (snapshot)' })
  @IsOptional()
  @IsObject()
  request_data?: Record<string, unknown>;
}
