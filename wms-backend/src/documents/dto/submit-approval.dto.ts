import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitDocumentApprovalDto {
  @ApiPropertyOptional({
    description: 'Ghi chú khi gửi duyệt',
    example: 'Đề nghị BGĐ phê duyệt hợp đồng NCC Q2/2026',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}
