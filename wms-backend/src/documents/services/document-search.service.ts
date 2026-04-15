import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectDocument } from '../entities/project-document.entity';
import { DocumentSearchDto } from '../dto/document-search.dto';

@Injectable()
export class DocumentSearchService {
  constructor(
    @InjectRepository(ProjectDocument)
    private readonly documentRepo: Repository<ProjectDocument>,
  ) {}

  async search(dto: DocumentSearchDto): Promise<{
    total: number;
    items: ProjectDocument[];
  }> {
    const qb = this.documentRepo.createQueryBuilder('d');

    if (dto.keyword && dto.keyword.trim().length > 0) {
      qb.andWhere(
        `d.search_vector @@ plainto_tsquery('simple', unaccent(:kw))`,
        { kw: dto.keyword.trim() },
      ).addSelect(
        `ts_rank(d.search_vector, plainto_tsquery('simple', unaccent(:kw)))`,
        'rank',
      );
    }

    if (dto.project_id) {
      qb.andWhere('d.project_id = :pid', { pid: dto.project_id });
    }
    if (dto.status) {
      qb.andWhere('d.status = :status', { status: dto.status });
    }
    if (dto.doc_type) {
      qb.andWhere('d.doc_type = :dt', { dt: dto.doc_type });
    }
    if (dto.tags && dto.tags.length > 0) {
      qb.andWhere('d.tags && :tags', { tags: dto.tags });
    }
    if (dto.from_date) {
      qb.andWhere('d.created_at >= :fd', { fd: dto.from_date });
    }
    if (dto.to_date) {
      qb.andWhere('d.created_at <= :td', { td: dto.to_date });
    }

    const total = await qb.getCount();

    if (dto.keyword && dto.keyword.trim().length > 0) {
      qb.orderBy('rank', 'DESC').addOrderBy('d.created_at', 'DESC');
    } else {
      qb.orderBy('d.created_at', 'DESC');
    }

    const items = await qb
      .skip(dto.offset ?? 0)
      .take(dto.limit ?? 20)
      .getMany();

    return { total, items };
  }
}
