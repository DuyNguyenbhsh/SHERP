import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type NotificationChannel = 'email' | 'web' | 'push';

export interface NotificationEvent {
  event: string; // ví dụ: 'incident.created', 'incident.critical'
  recipientIds: string[]; // UUID employee/user
  subject: string;
  body: string;
  meta?: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

/**
 * Pluggable notification service. Phase A: log only (stub).
 * Phase B: wire real email (MailService), web push (SSE), firebase push.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly config: ConfigService) {}

  async dispatch(evt: NotificationEvent): Promise<void> {
    const channels = evt.channels ?? ['email', 'web'];
    const priority = evt.priority ?? 'normal';
    const prefix =
      priority === 'critical' ? '🚨 CRITICAL' : priority.toUpperCase();

    this.logger.log(
      `[${prefix}] event=${evt.event} channels=${channels.join(',')} recipients=${evt.recipientIds.length}`,
    );
    this.logger.log(`  subject: ${evt.subject}`);
    this.logger.log(`  recipients: ${evt.recipientIds.join(', ')}`);

    // TODO Phase B: với mỗi channel, dispatch thật:
    //  - 'email' → resolve email từ user repo → MailService.send(...)
    //  - 'web'   → insert notification_log + push qua SSE/websocket
    //  - 'push'  → firebase cloud messaging
    // Ở Phase A chỉ log đủ để trace luồng.
  }

  // Helper shortcuts cho Incident
  async notifyIncidentCreated(incident: {
    id: string;
    incident_code: string;
    title: string;
    severity: string;
    project_id: string;
    reported_by: string;
  }): Promise<void> {
    const critical = incident.severity === 'CRITICAL';
    await this.dispatch({
      event: 'incident.created',
      recipientIds: [], // TODO Phase B: resolve QLDA + HO của project
      subject: `[${incident.incident_code}] ${critical ? 'SỰ CỐ NGHIÊM TRỌNG' : 'Sự cố mới'}: ${incident.title}`,
      body: `Dự án ${incident.project_id} có sự cố mới (${incident.severity}) do ${incident.reported_by} báo.`,
      priority: critical ? 'critical' : 'normal',
      meta: { incidentId: incident.id },
    });
  }

  async notifyIncidentAssigned(incident: {
    id: string;
    incident_code: string;
    title: string;
    assigned_to: string;
  }): Promise<void> {
    await this.dispatch({
      event: 'incident.assigned',
      recipientIds: [incident.assigned_to],
      subject: `[${incident.incident_code}] Bạn được giao xử lý sự cố`,
      body: incident.title,
      priority: 'normal',
      meta: { incidentId: incident.id },
    });
  }

  async notifyIncidentResolved(incident: {
    id: string;
    incident_code: string;
    title: string;
    project_id: string;
  }): Promise<void> {
    await this.dispatch({
      event: 'incident.resolved',
      recipientIds: [], // TODO: QLDA
      subject: `[${incident.incident_code}] Kỹ thuật báo xong, chờ QLDA verify`,
      body: incident.title,
      priority: 'normal',
      meta: { incidentId: incident.id },
    });
  }

  async notifyReopenRequested(req: {
    incident_id: string;
    requested_by: string;
    reason: string;
  }): Promise<void> {
    await this.dispatch({
      event: 'incident.reopen_requested',
      recipientIds: [], // TODO: APPROVE_INCIDENT_REOPEN holders
      subject: 'Yêu cầu mở lại sự cố cần duyệt',
      body: `User ${req.requested_by} yêu cầu reopen: ${req.reason}`,
      priority: 'high',
      meta: { incidentId: req.incident_id },
    });
  }
}
