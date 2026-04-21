import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MasterPlan } from './entities/master-plan.entity';
import { WbsNode } from './entities/wbs-node.entity';
import { TaskTemplate } from './entities/task-template.entity';
import { WorkItem } from '../work-items/entities/work-item.entity';
import { WorkItemStatus } from '../work-items/enums/work-item.enum';
import { ExecutorParty } from '../facility-catalog/enums/executor-party.enum';
import {
  expandFreqCodeToIsoWeeks,
  expandRruleToIsoWeeks,
  getIsoWeek,
  isoWeeksInYear,
} from './domain/logic/annual-grid.logic';

export type CellActualStatus =
  | 'NONE'
  | 'ON_TIME'
  | 'LATE'
  | 'MISSED'
  | 'UPCOMING';

export interface AnnualGridCell {
  iso_week: number;
  planned: boolean;
  actual_status: CellActualStatus;
  instance_ids: string[];
}

export interface AnnualGridRow {
  task_template_id: string;
  system: { id: string; name_vi: string; name_en: string | null } | null;
  equipment_item: {
    id: string;
    name_vi: string;
    name_en: string | null;
  } | null;
  task_name_vi: string;
  task_name_en: string | null;
  executor_party: ExecutorParty;
  contractor_name: string | null;
  freq_code: string | null;
  regulatory_refs: string[];
  cells: AnnualGridCell[];
}

export interface AnnualGridResponse {
  year: number;
  plan_id: string;
  weeks: { iso_week: number }[];
  rows: AnnualGridRow[];
}

@Injectable()
export class AnnualGridService {
  constructor(
    @InjectRepository(MasterPlan)
    private readonly plansRepo: Repository<MasterPlan>,
    @InjectRepository(WbsNode)
    private readonly nodesRepo: Repository<WbsNode>,
    @InjectRepository(TaskTemplate)
    private readonly templatesRepo: Repository<TaskTemplate>,
    @InjectRepository(WorkItem)
    private readonly workItemsRepo: Repository<WorkItem>,
  ) {}

  async build(planId: string, year: number): Promise<AnnualGridResponse> {
    const plan = await this.plansRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Không tìm thấy plan ${planId}`);

    // 1. Load WBS nodes (trong plan, chưa archived) → collect leaf IDs
    const nodes = await this.nodesRepo.find({
      where: { plan_id: planId, is_archived: false },
    });
    const leafIds = nodes.map((n) => n.id);
    if (!leafIds.length) {
      return this.emptyGrid(planId, year);
    }

    // 2. Load TaskTemplates (active only, có join System + Equipment)
    const templates = await this.templatesRepo.find({
      where: { wbs_node_id: In(leafIds), is_active: true },
      relations: ['system', 'equipment_item'],
      order: { created_at: 'ASC' },
    });
    if (!templates.length) {
      return this.emptyGrid(planId, year);
    }

    // 3. Load WorkItems phát sinh trong năm (dedup theo task_template_id + scheduled_at IN year)
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
    const templateIds = templates.map((t) => t.id);
    const items = await this.workItemsRepo
      .createQueryBuilder('wi')
      .where('wi.task_template_id IN (:...ids)', { ids: templateIds })
      .andWhere('wi.scheduled_at BETWEEN :s AND :e', {
        s: yearStart.toISOString(),
        e: yearEnd.toISOString(),
      })
      .getMany();

    // Group items theo (template_id, iso_week)
    const itemsByKey = new Map<string, WorkItem[]>();
    for (const it of items) {
      if (!it.task_template_id || !it.scheduled_at) continue;
      const week = getIsoWeek(it.scheduled_at);
      const key = `${it.task_template_id}:${week}`;
      const list = itemsByKey.get(key) ?? [];
      list.push(it);
      itemsByKey.set(key, list);
    }

    // 4. Build rows
    const totalWeeks = isoWeeksInYear(year);
    const now = new Date();
    const rows: AnnualGridRow[] = templates.map((tpl) => {
      const plannedWeeks = tpl.freq_code
        ? expandFreqCodeToIsoWeeks(tpl.freq_code, year)
        : expandRruleToIsoWeeks(tpl.recurrence_rule, year);
      const cells: AnnualGridCell[] = [];
      for (let w = 1; w <= totalWeeks; w++) {
        const weekItems = itemsByKey.get(`${tpl.id}:${w}`) ?? [];
        cells.push({
          iso_week: w,
          planned: plannedWeeks.has(w),
          actual_status: deriveActualStatus(weekItems, now),
          instance_ids: weekItems.map((i) => i.id),
        });
      }
      return {
        task_template_id: tpl.id,
        system: tpl.system
          ? {
              id: tpl.system.id,
              name_vi: tpl.system.name_vi,
              name_en: tpl.system.name_en,
            }
          : null,
        equipment_item: tpl.equipment_item
          ? {
              id: tpl.equipment_item.id,
              name_vi: tpl.equipment_item.name_vi,
              name_en: tpl.equipment_item.name_en,
            }
          : null,
        task_name_vi: tpl.name,
        task_name_en: tpl.name_en,
        executor_party: tpl.executor_party,
        contractor_name: tpl.contractor_name,
        freq_code: tpl.freq_code,
        regulatory_refs: tpl.regulatory_refs ?? [],
        cells,
      };
    });

    return {
      year,
      plan_id: planId,
      weeks: Array.from({ length: totalWeeks }, (_, i) => ({
        iso_week: i + 1,
      })),
      rows,
    };
  }

  private emptyGrid(planId: string, year: number): AnnualGridResponse {
    const totalWeeks = isoWeeksInYear(year);
    return {
      year,
      plan_id: planId,
      weeks: Array.from({ length: totalWeeks }, (_, i) => ({
        iso_week: i + 1,
      })),
      rows: [],
    };
  }
}

/**
 * Map trạng thái thực tế của tuần dựa trên work items đã sinh.
 * Khi nhiều item trong cùng tuần → ưu tiên LATE > MISSED > ON_TIME > UPCOMING.
 */
export function deriveActualStatus(
  items: WorkItem[],
  now: Date,
): CellActualStatus {
  if (!items.length) return 'NONE';
  let hasLate = false;
  let hasMissed = false;
  let hasOnTime = false;
  let hasUpcoming = false;

  for (const it of items) {
    const due = it.due_date;
    if (it.status === WorkItemStatus.COMPLETED) {
      if (due && it.updated_at.getTime() > due.getTime()) hasLate = true;
      else hasOnTime = true;
    } else {
      if (due && due.getTime() < now.getTime()) hasMissed = true;
      else hasUpcoming = true;
    }
  }

  if (hasLate) return 'LATE';
  if (hasMissed) return 'MISSED';
  if (hasOnTime) return 'ON_TIME';
  if (hasUpcoming) return 'UPCOMING';
  return 'NONE';
}
