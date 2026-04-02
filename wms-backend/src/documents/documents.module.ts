import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectFolder } from './entities/project-folder.entity';
import { ProjectDocument } from './entities/project-document.entity';
import { DocumentNotification } from './entities/document-notification.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectFolder,
      ProjectDocument,
      DocumentNotification,
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
