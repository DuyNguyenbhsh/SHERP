import { Global, Module } from '@nestjs/common';
import { ExcelService } from './excel';

@Global()
@Module({
  providers: [ExcelService],
  exports: [ExcelService],
})
export class SharedModule {}
