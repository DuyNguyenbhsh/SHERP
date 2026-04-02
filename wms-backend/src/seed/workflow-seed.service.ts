import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalConfig } from '../approvals/entities/approval-config.entity';
import { ApprovalConfigStep } from '../approvals/entities/approval-config-step.entity';

interface StepDef {
  step_order: number;
  approver_role: string;
  is_mandatory: boolean;
  is_required: boolean;
  required_count: number;
  timeout_hours?: number;
}

interface WorkflowDef {
  entity_type: string;
  name: string;
  description: string;
  module_code: string;
  conditions: Record<string, unknown>;
  steps: StepDef[];
}

@Injectable()
export class WorkflowSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkflowSeedService.name);

  constructor(
    @InjectRepository(ApprovalConfig)
    private configRepo: Repository<ApprovalConfig>,
    @InjectRepository(ApprovalConfigStep)
    private stepRepo: Repository<ApprovalConfigStep>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedWorkflows();
  }

  private async seedWorkflows() {
    const workflows: WorkflowDef[] = [
      // ══ 1. PURCHASE_REQUEST — Mua vat tu / thiet bi ══
      // < 5tr  : CHT tu quyet
      // 5-50tr : CHT + PM
      // > 50tr : CHT + KT + PM + GDDA + PD
      {
        entity_type: 'PURCHASE_REQUEST',
        name: 'Phe duyet Mua vat tu / Thiet bi',
        description:
          'Quy trinh 5 cap: CHT > Ke toan > PM > GDDA > PD. Nguong: <5tr tu quyet, 5-50tr 2 buoc, >50tr full.',
        module_code: 'PROCUREMENT',
        conditions: {
          threshold_rules: [
            { max_amount: 5000000, skip_to_step: 999 },
            { max_amount: 50000000, max_step: 2 },
            { max_amount: null, max_step: 999 },
          ],
        },
        steps: [
          {
            step_order: 1,
            approver_role: 'CHT',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 24,
          },
          {
            step_order: 2,
            approver_role: 'QS',
            is_mandatory: false,
            is_required: true,
            required_count: 1,
            timeout_hours: 24,
          },
          {
            step_order: 3,
            approver_role: 'GDDA',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 48,
          },
          {
            step_order: 4,
            approver_role: 'CHTCC',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 48,
          },
          {
            step_order: 5,
            approver_role: 'SUPER_ADMIN',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 72,
          },
        ],
      },

      // ══ 2. PERSONNEL_CHANGE — Thay doi nhan su ══
      // Khong co nguong tien, luon di 3 buoc
      {
        entity_type: 'PERSONNEL_CHANGE',
        name: 'Phe duyet Thay doi Nhan su',
        description:
          'Quy trinh 3 cap: Truong phong > HCNS > Ban Giam doc. Moi thay doi nhan su deu phai qua.',
        module_code: 'HCM',
        conditions: {},
        steps: [
          {
            step_order: 1,
            approver_role: 'CHT',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 24,
          },
          {
            step_order: 2,
            approver_role: 'GDDA',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 48,
          },
          {
            step_order: 3,
            approver_role: 'SUPER_ADMIN',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 72,
          },
        ],
      },

      // ══ 3. SUBCONTRACTOR_PAYMENT — Tam ung / Thanh toan thau phu ══
      // < 10tr  : CHT tu quyet
      // 10-100tr: CHT + KT + PM
      // > 100tr : Full 5 buoc (CHT > KT > PM > GDDA > PD)
      {
        entity_type: 'SUBCONTRACTOR_PAYMENT',
        name: 'Phe duyet Tam ung / Thanh toan Thau phu',
        description:
          'Quy trinh 5 cap: CHT > Ke toan (song song voi QS) > PM > GDDA > PD. Nguong: <10tr tu quyet, 10-100tr 3 buoc, >100tr full.',
        module_code: 'FINANCE',
        conditions: {
          threshold_rules: [
            { max_amount: 10000000, skip_to_step: 999 },
            { max_amount: 100000000, max_step: 3 },
            { max_amount: null, max_step: 999 },
          ],
        },
        steps: [
          {
            step_order: 1,
            approver_role: 'CHT',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 24,
          },
          {
            step_order: 2,
            approver_role: 'QS',
            is_mandatory: false,
            is_required: true,
            required_count: 1,
            timeout_hours: 24,
          },
          {
            step_order: 3,
            approver_role: 'GDDA',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 48,
          },
          {
            step_order: 4,
            approver_role: 'CHTCC',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 48,
          },
          {
            step_order: 5,
            approver_role: 'SUPER_ADMIN',
            is_mandatory: true,
            is_required: true,
            required_count: 1,
            timeout_hours: 72,
          },
        ],
      },
    ];

    let newCount = 0;
    for (const wf of workflows) {
      const exists = await this.configRepo.findOne({
        where: { entity_type: wf.entity_type },
      });
      if (exists) continue;

      const config = this.configRepo.create({
        entity_type: wf.entity_type,
        name: wf.name,
        description: wf.description,
        module_code: wf.module_code,
        is_active: true,
        conditions: wf.conditions,
        steps: wf.steps.map((s) =>
          this.stepRepo.create({
            step_order: s.step_order,
            approver_role: s.approver_role,
            is_required: s.is_required,
            is_mandatory: s.is_mandatory,
            required_count: s.required_count,
            timeout_hours: s.timeout_hours ?? undefined,
          }),
        ),
      });
      await this.configRepo.save(config);
      newCount++;
      this.logger.log(`  + ${wf.name} (${wf.steps.length} buoc)`);
    }

    if (newCount > 0) {
      this.logger.log(`Workflow: Da tao ${newCount} quy trinh phe duyet mau.`);
    } else {
      this.logger.log('Workflow: Cau hinh da ton tai. Bo qua.');
    }
  }
}
