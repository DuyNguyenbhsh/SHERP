import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from './entities/incident.entity';
import { IncidentPhoto } from './entities/incident-photo.entity';
import { IncidentComment } from './entities/incident-comment.entity';
import { IncidentReopenRequest } from './entities/incident-reopen-request.entity';
import { IncidentAssigneeChangeRequest } from './entities/incident-assignee-change-request.entity';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { IncidentExportService } from './incident-export.service';
import { WorkItemsModule } from '../work-items/work-items.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Incident,
      IncidentPhoto,
      IncidentComment,
      IncidentReopenRequest,
      IncidentAssigneeChangeRequest,
    ]),
    WorkItemsModule,
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService, IncidentExportService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
