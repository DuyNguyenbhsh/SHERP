import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { NcrCategory, NcrRelatedType, NcrSeverity } from '../enums/ncr.enum';

export class CreateNcrDto {
  @ApiProperty({ description: 'Phan loai NCR', enum: NcrCategory })
  @IsEnum(NcrCategory)
  category: NcrCategory;

  @ApiProperty({ description: 'Muc do', enum: NcrSeverity })
  @IsEnum(NcrSeverity)
  severity: NcrSeverity;

  @ApiProperty({ description: 'Mo ta su khong phu hop' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Loai doi tuong lien quan',
    enum: NcrRelatedType,
  })
  @IsOptional()
  @IsEnum(NcrRelatedType)
  related_type?: NcrRelatedType;

  @ApiPropertyOptional({ description: 'ID doi tuong lien quan' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  related_id?: string;

  @ApiPropertyOptional({ description: 'Vi tri cu the tai cong trinh' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location_detail?: string;

  @ApiPropertyOptional({ description: 'UUID nguoi xu ly' })
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Tien phat (VND)', example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  penalty_amount?: number;

  @ApiPropertyOptional({ description: 'UUID hop dong thau phu' })
  @IsOptional()
  @IsString()
  subcontract_id?: string;
}

export class AssignNcrDto {
  @ApiProperty({ description: 'UUID nguoi xu ly' })
  @IsUUID()
  assigned_to: string;
}

export class ResolveNcrDto {
  @ApiProperty({ description: 'Ghi chu xu ly' })
  @IsString()
  @IsNotEmpty()
  resolution_note: string;
}

export class VerifyNcrDto {
  @ApiProperty({ description: 'Chap nhan hay tu choi' })
  accepted: boolean;

  @ApiPropertyOptional({ description: 'Ghi chu' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class UpdateNcrDto {
  @ApiPropertyOptional({ enum: NcrCategory })
  @IsOptional()
  @IsEnum(NcrCategory)
  category?: NcrCategory;

  @ApiPropertyOptional({ enum: NcrSeverity })
  @IsOptional()
  @IsEnum(NcrSeverity)
  severity?: NcrSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location_detail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  penalty_amount?: number;
}
