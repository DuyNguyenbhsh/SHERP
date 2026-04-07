import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBidResultDto {
  @ApiProperty({
    description: 'Ket qua dau thau',
    enum: ['WON_BID', 'LOST_BID'],
    example: 'WON_BID',
  })
  @IsEnum(['WON_BID', 'LOST_BID'], {
    message: 'Ket qua phai la WON_BID hoac LOST_BID',
  })
  result: 'WON_BID' | 'LOST_BID';

  @ApiPropertyOptional({
    description: 'Ngay co ket qua thau',
    example: '2026-04-15',
  })
  @IsOptional()
  @IsString()
  bid_result_date?: string;

  @ApiPropertyOptional({ description: 'Ly do truot thau (neu LOST_BID)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lost_bid_reason?: string;
}
