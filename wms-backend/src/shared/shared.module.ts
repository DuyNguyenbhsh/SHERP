import { Global, Module } from '@nestjs/common';
import { ExcelService } from './excel';
import { CloudStorageService } from './cloud-storage';

@Global()
@Module({
  providers: [ExcelService, CloudStorageService],
  exports: [ExcelService, CloudStorageService],
})
export class SharedModule {}
