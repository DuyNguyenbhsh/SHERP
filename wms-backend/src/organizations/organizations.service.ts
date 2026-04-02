import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
  ) {}

  async findAll() {
    return await this.orgRepo.find({
      relations: ['parent', 'children', 'employees'],
      order: { organization_name: 'ASC' },
    });
  }

  async create(data: any) {
    const exist = await this.orgRepo.findOne({
      where: { organization_code: data.organization_code },
    });
    if (exist) throw new BadRequestException('Mã đơn vị đã tồn tại!');

    const orgData: Partial<Organization> = {
      organization_code: data.organization_code,
      organization_name: data.organization_name,
      description: data.description,
    };
    if (data.org_type) orgData.org_type = data.org_type;
    const newOrg = this.orgRepo.create(orgData);

    if (data.parent_id) {
      const parent = await this.orgRepo.findOne({
        where: { id: data.parent_id },
      });
      if (!parent) throw new NotFoundException('Đơn vị cha không tồn tại!');
      newOrg.parent = parent;
    }

    return await this.orgRepo.save(newOrg);
  }

  async update(id: string, updateData: any) {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Tổ chức không tồn tại!');

    if (updateData.parent_id) {
      const parent = await this.orgRepo.findOne({
        where: { id: updateData.parent_id },
      });
      org.parent = parent as any;
    } else if (updateData.parent_id === null) {
      org.parent = null as any;
    }

    if (updateData.organization_code !== undefined)
      org.organization_code = updateData.organization_code;
    if (updateData.organization_name !== undefined)
      org.organization_name = updateData.organization_name;
    if (updateData.description !== undefined)
      org.description = updateData.description;
    if (updateData.org_type !== undefined) org.org_type = updateData.org_type;

    return await this.orgRepo.save(org);
  }

  async remove(id: string) {
    const org = await this.orgRepo.findOne({
      where: { id },
      relations: ['children', 'employees'],
    });
    if (!org) throw new NotFoundException('Tổ chức không tồn tại!');

    const childCount = org.children?.length ?? 0;
    const empCount = org.employees?.length ?? 0;

    if (childCount > 0 || empCount > 0) {
      // Build descriptive blockers list
      const blockers: string[] = [];
      if (childCount > 0) blockers.push(`${childCount} đơn vị con`);
      if (empCount > 0) blockers.push(`${empCount} nhân viên`);

      throw new ConflictException({
        status: 'error',
        message: `Không thể xóa "${org.organization_name}" — đang quản lý ${blockers.join(' và ')}. Cần xóa/chuyển cấp con trước khi xóa cấp cha.`,
        data: { childCount, empCount },
      });
    }

    return await this.orgRepo.delete(id);
  }
}
