import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectFolder } from './entities/project-folder.entity';
import { ProjectDocument } from './entities/project-document.entity';
import { DocumentNotification } from './entities/document-notification.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentAuditLog } from './entities/document-audit-log.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentVersionsService } from './services/document-versions.service';
import { DocumentApprovalService } from './services/document-approval.service';
import { DocumentAuditService } from './services/document-audit.service';
import { DocumentSearchService } from './services/document-search.service';
import { CloudStorageService } from '../shared/cloud-storage';
import { ApprovalsModule } from '../approvals/approvals.module';
import { ApprovalRequest } from '../approvals/entities/approval-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectFolder,
      ProjectDocument,
      DocumentNotification,
      DocumentVersion,
      DocumentAuditLog,
      ApprovalRequest,
    ]),
    ApprovalsModule,
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentVersionsService,
    DocumentApprovalService,
    DocumentAuditService,
    DocumentSearchService,
    CloudStorageService,
  ],
  exports: [
    DocumentsService,
    DocumentVersionsService,
    DocumentApprovalService,
    DocumentAuditService,
    DocumentSearchService,
  ],
})
export class DocumentsModule {}
