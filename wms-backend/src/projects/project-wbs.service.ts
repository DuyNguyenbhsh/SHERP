import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectWbs } from './entities/project-wbs.entity';
import { ProjectCbs } from './entities/project-cbs.entity';
import { Project } from './entities/project.entity';
import { CreateWbsDto } from './dto/create-wbs.dto';
import { UpdateWbsDto } from './dto/update-wbs.dto';
import { UpsertCbsDto } from './dto/upsert-cbs.dto';
import {
  buildWbsTree,
  calculateParentProgress,
  calculateWbsLevelAndPath,
} from './domain/logic';

@Injectable()
export class ProjectWbsService {
  constructor(
    @InjectRepository(ProjectWbs)
    private wbsRepo: Repository<ProjectWbs>,
    @InjectRepository(ProjectCbs)
    private cbsRepo: Repository<ProjectCbs>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private dataSource: DataSource,
  ) {}

  // ── Lấy cây WBS của dự án ──
  async findTree(projectId: string) {
    const nodes = await this.wbsRepo.find({
      where: { project_id: projectId },
      order: { level: 'ASC', sort_order: 'ASC', code: 'ASC' },
    });

    // Domain logic: build tree
    const roots = buildWbsTree(nodes);

    return {
      status: 'success',
      message: `Tìm thấy ${nodes.length} hạng mục WBS`,
      data: roots,
    };
  }

  // ── Tạo WBS node ──
  async create(projectId: string, dto: CreateWbsDto) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    let parentRef: { level: number; path: string | null } | null = null;
    if (dto.parent_id) {
      const parent = await this.wbsRepo.findOne({
        where: { id: dto.parent_id, project_id: projectId },
      });
      if (!parent)
        throw new BadRequestException({
          status: 'error',
          message: 'WBS cha không tồn tại trong dự án này!',
          data: null,
        });
      parentRef = { level: parent.level, path: parent.path };
    }

    // Domain logic: calculate level & path
    const { level, path } = calculateWbsLevelAndPath(dto.code, parentRef);

    const node = this.wbsRepo.create({
      project_id: projectId,
      parent_id: dto.parent_id,
      code: dto.code,
      name: dto.name,
      level,
      path,
      sort_order: dto.sort_order ?? 0,
      weight: dto.weight ?? 0,
      planned_start: dto.planned_start
        ? new Date(dto.planned_start)
        : undefined,
      planned_end: dto.planned_end ? new Date(dto.planned_end) : undefined,
      department_id: dto.department_id,
      description: dto.description,
    });

    const saved = await this.wbsRepo.save(node);
    return {
      status: 'success',
      message: `Tạo hạng mục WBS "${saved.code}" thành công`,
      data: saved,
    };
  }

  // ── Cập nhật WBS ──
  async update(wbsId: string, dto: UpdateWbsDto) {
    const node = await this.wbsRepo.findOne({ where: { id: wbsId } });
    if (!node)
      throw new NotFoundException({
        status: 'error',
        message: 'Hạng mục WBS không tồn tại!',
        data: null,
      });

    // Nếu thay đổi parent → domain logic tính lại level + path
    if (dto.parent_id !== undefined && dto.parent_id !== node.parent_id) {
      if (dto.parent_id) {
        const parent = await this.wbsRepo.findOne({
          where: { id: dto.parent_id, project_id: node.project_id },
        });
        if (!parent)
          throw new BadRequestException({
            status: 'error',
            message: 'WBS cha không hợp lệ!',
            data: null,
          });
        const { level, path } = calculateWbsLevelAndPath(
          dto.code || node.code,
          { level: parent.level, path: parent.path },
        );
        node.level = level;
        node.path = path;
      } else {
        const { level, path } = calculateWbsLevelAndPath(
          dto.code || node.code,
          null,
        );
        node.level = level;
        node.path = path;
      }
      node.parent_id = dto.parent_id;
    }

    if (dto.code !== undefined) node.code = dto.code;
    if (dto.name !== undefined) node.name = dto.name;
    if (dto.weight !== undefined) node.weight = dto.weight;
    if (dto.sort_order !== undefined) node.sort_order = dto.sort_order;
    if (dto.planned_start !== undefined)
      node.planned_start = new Date(dto.planned_start);
    if (dto.planned_end !== undefined)
      node.planned_end = new Date(dto.planned_end);
    if (dto.department_id !== undefined) node.department_id = dto.department_id;
    if (dto.description !== undefined) node.description = dto.description;

    // Cập nhật tiến độ + lan truyền lên cha
    if (dto.progress_percent !== undefined) {
      node.progress_percent = dto.progress_percent;
      const saved = await this.wbsRepo.save(node);
      await this.propagateProgress(node.project_id, node.parent_id);
      return {
        status: 'success',
        message: `Cập nhật WBS "${saved.code}" thành công`,
        data: saved,
      };
    }

    const saved = await this.wbsRepo.save(node);
    return {
      status: 'success',
      message: `Cập nhật WBS "${saved.code}" thành công`,
      data: saved,
    };
  }

  // ── Lan truyền tiến độ lên cha ──
  async propagateProgress(
    projectId: string,
    parentId: string | null,
  ): Promise<void> {
    if (!parentId) return;

    const children = await this.wbsRepo.find({
      where: { parent_id: parentId, project_id: projectId },
    });
    if (children.length === 0) return;

    // Domain logic: calculate parent progress
    const parentProgress = calculateParentProgress(children);

    const parent = await this.wbsRepo.findOne({ where: { id: parentId } });
    if (parent) {
      parent.progress_percent = parentProgress;
      await this.wbsRepo.save(parent);
      await this.propagateProgress(projectId, parent.parent_id);
    }
  }

  // ── Xóa WBS ──
  async remove(wbsId: string) {
    const node = await this.wbsRepo.findOne({ where: { id: wbsId } });
    if (!node)
      throw new NotFoundException({
        status: 'error',
        message: 'Hạng mục WBS không tồn tại!',
        data: null,
      });
    await this.wbsRepo.delete(wbsId);
    return {
      status: 'success',
      message: `Xóa hạng mục WBS "${node.code}" thành công`,
      data: null,
    };
  }

  // ── CBS ──

  async findCbs(wbsId: string) {
    const items = await this.cbsRepo.find({
      where: { wbs_id: wbsId },
      relations: ['category'],
      order: { category: { code: 'ASC' } },
    });
    return {
      status: 'success',
      message: `Tìm thấy ${items.length} mục CBS`,
      data: items,
    };
  }

  async upsertCbs(projectId: string, dto: UpsertCbsDto) {
    let cbs = await this.cbsRepo.findOne({
      where: {
        project_id: projectId,
        wbs_id: dto.wbs_id,
        category_id: dto.category_id,
      },
    });

    if (cbs) {
      cbs.planned_amount = dto.planned_amount;
      if (dto.notes !== undefined) cbs.notes = dto.notes;
    } else {
      cbs = this.cbsRepo.create({
        project_id: projectId,
        wbs_id: dto.wbs_id,
        category_id: dto.category_id,
        planned_amount: dto.planned_amount,
        notes: dto.notes,
      });
    }

    const saved = await this.cbsRepo.save(cbs);
    return {
      status: 'success',
      message: 'Cập nhật CBS thành công',
      data: saved,
    };
  }
}
