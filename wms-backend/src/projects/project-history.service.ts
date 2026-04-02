import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectHistory } from './entities/project-history.entity';
import { Employee } from '../users/entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';

export interface AuditContext {
  projectId: string;
  changeReason?: string;
  changedBy?: string;
}

interface FieldDef {
  field: string;
  oldLabel?: string;
}

@Injectable()
export class ProjectHistoryService {
  constructor(
    @InjectRepository(ProjectHistory)
    private historyRepo: Repository<ProjectHistory>,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
  ) {}

  /**
   * So sánh old vs new, ghi audit log cho các trường quan trọng.
   * Tự resolve label (tên nhân viên, tên phòng ban) và lưu vào metadata.
   */
  async recordChanges(
    oldProject: Record<string, unknown>,
    newFields: Record<string, unknown>,
    auditFields: FieldDef[],
    ctx: AuditContext,
  ) {
    const entries: Partial<ProjectHistory>[] = [];

    for (const { field, oldLabel } of auditFields) {
      const newVal = newFields[field];
      const oldVal = oldProject[field];
      if (newVal === undefined) continue;
      if (String(newVal ?? '') === String(oldVal ?? '')) continue;

      // Resolve new label cho FK fields
      let newLabel: string | undefined;
      const metadata: Record<string, unknown> = {};

      if (field === 'manager_id' && newVal) {
        const emp = await this.employeeRepo.findOne({
          where: { id: String(newVal) },
        });
        if (emp) {
          newLabel = emp.full_name;
          metadata.new_employee_code = emp.employee_code;
          metadata.new_job_title = emp.job_title;
        }
      } else if (
        (field === 'department_id' || field === 'organization_id') &&
        newVal
      ) {
        const org = await this.orgRepo.findOne({
          where: { id: String(newVal) },
        });
        if (org) {
          newLabel = org.organization_name;
          metadata.new_org_code = org.organization_code;
        }
      } else if (field === 'investor_id' && newVal) {
        const sup = await this.supplierRepo.findOne({
          where: { id: String(newVal) },
        });
        if (sup) {
          newLabel = sup.name;
          metadata.new_supplier_code = sup.supplier_code;
        }
      } else if (field === 'budget') {
        // Format budget for readability
        const oldNum = oldVal != null ? Number(oldVal) : 0;
        const newNum = newVal != null ? Number(newVal) : 0;
        metadata.old_formatted = oldNum.toLocaleString('vi-VN') + ' ₫';
        metadata.new_formatted = newNum.toLocaleString('vi-VN') + ' ₫';
        metadata.difference = (newNum - oldNum).toLocaleString('vi-VN') + ' ₫';
      }

      // Preserve old label metadata
      if (oldLabel) metadata.old_label = oldLabel;
      if (newLabel) metadata.new_label = newLabel;

      entries.push({
        project_id: ctx.projectId,
        field_name: field,
        old_value: oldVal != null ? String(oldVal) : undefined,
        new_value: newVal != null ? String(newVal) : undefined,
        old_label: oldLabel,
        new_label: newLabel,
        change_reason: ctx.changeReason,
        changed_by: ctx.changedBy,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    }

    if (entries.length > 0) {
      await this.historyRepo.save(
        entries.map((e) => this.historyRepo.create(e)),
      );
    }

    return entries.length;
  }

  async findByProject(projectId: string, limit?: number) {
    return this.historyRepo.find({
      where: { project_id: projectId },
      order: { changed_at: 'DESC' },
      ...(limit ? { take: limit } : {}),
    });
  }
}
