import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryProvider } from './entities/delivery-provider.entity';
import { DeliveryType } from './entities/delivery-type.entity';
import { TransportStatus } from './entities/transport-status.entity';
import { TransportRoute } from './entities/transport-route.entity';
import { CargoType } from './entities/cargo-type.entity';
import { Province } from './entities/province.entity';
import { Commune } from './entities/commune.entity';
import { RedisService } from '../shared/redis';

// Master-data hành chính thay đổi rất ít → cache 5 phút an toàn
const ADMIN_CACHE_TTL = 300;

@Injectable()
export class MasterDataService {
  constructor(
    @InjectRepository(DeliveryProvider)
    private providerRepo: Repository<DeliveryProvider>,
    @InjectRepository(DeliveryType) private typeRepo: Repository<DeliveryType>,
    @InjectRepository(TransportStatus)
    private statusRepo: Repository<TransportStatus>,
    @InjectRepository(TransportRoute)
    private routeRepo: Repository<TransportRoute>,
    @InjectRepository(CargoType) private cargoRepo: Repository<CargoType>,
    @InjectRepository(Province) private provinceRepo: Repository<Province>,
    @InjectRepository(Commune) private communeRepo: Repository<Commune>,
    private readonly redis: RedisService,
  ) {}

  private provincesKey = 'masterdata:provinces';
  private communesKey = (provinceId?: string) =>
    provinceId
      ? `masterdata:communes:province:${provinceId}`
      : 'masterdata:communes:all';

  // --- HÀM LẤY DỮ LIỆU ---
  async getAll(type: string, query?: any) {
    if (type === 'providers')
      return this.providerRepo.find({ order: { code: 'ASC' } });
    if (type === 'types') return this.typeRepo.find({ order: { code: 'ASC' } });
    if (type === 'statuses')
      return this.statusRepo.find({ order: { code: 'ASC' } });
    if (type === 'routes')
      return this.routeRepo.find({ order: { code: 'ASC' } });
    if (type === 'cargos')
      return this.cargoRepo.find({ order: { code: 'ASC' } });

    // Dữ liệu hành chính (ít thay đổi) → cache Redis 5 phút
    if (type === 'provinces') {
      return this.redis.cacheGetOrSet(this.provincesKey, ADMIN_CACHE_TTL, () =>
        this.provinceRepo.find({ order: { code: 'ASC' } }),
      );
    }
    if (type === 'communes') {
      const key = this.communesKey(query?.provinceId);
      return this.redis.cacheGetOrSet(key, ADMIN_CACHE_TTL, () => {
        if (query?.provinceId) {
          return this.communeRepo.find({
            where: { provinceId: query.provinceId },
            order: { code: 'ASC' },
          });
        }
        return this.communeRepo.find({ take: 100 });
      });
    }
    return [];
  }

  private async invalidateAdminCache(type: string, provinceId?: string) {
    if (type === 'provinces') {
      await this.redis.cacheDel(this.provincesKey);
    }
    if (type === 'communes') {
      await this.redis.cacheDel(this.communesKey());
      if (provinceId) await this.redis.cacheDel(this.communesKey(provinceId));
    }
  }

  // --- HÀM TẠO MỚI ---
  async create(type: string, data: any) {
    if (type === 'providers') return this.providerRepo.save(data);
    if (type === 'types') return this.typeRepo.save(data);
    if (type === 'statuses') return this.statusRepo.save(data);
    if (type === 'routes') return this.routeRepo.save(data);
    if (type === 'cargos') return this.cargoRepo.save(data);
    if (type === 'provinces') {
      const saved = await this.provinceRepo.save(data);
      await this.invalidateAdminCache('provinces');
      return saved;
    }
    if (type === 'communes') {
      const saved = await this.communeRepo.save(data);
      await this.invalidateAdminCache('communes', data?.provinceId);
      return saved;
    }
  }

  // --- HÀM CẬP NHẬT ---
  async update(type: string, id: string, data: any) {
    if (type === 'providers') return this.providerRepo.update(id, data);
    if (type === 'types') return this.typeRepo.update(id, data);
    if (type === 'statuses') return this.statusRepo.update(id, data);
    if (type === 'routes') return this.routeRepo.update(id, data);
    if (type === 'cargos') return this.cargoRepo.update(id, data);
  }

  // --- HÀM XÓA ---
  async delete(type: string, id: string) {
    if (type === 'providers') return this.providerRepo.delete(id);
    if (type === 'types') return this.typeRepo.delete(id);
    if (type === 'statuses') return this.statusRepo.delete(id);
    if (type === 'routes') return this.routeRepo.delete(id);
    if (type === 'cargos') return this.cargoRepo.delete(id);
    if (type === 'provinces') {
      const res = await this.provinceRepo.delete(id);
      await this.invalidateAdminCache('provinces');
      return res;
    }
    if (type === 'communes') {
      const existing = await this.communeRepo.findOne({ where: { id } as any });
      const res = await this.communeRepo.delete(id);
      await this.invalidateAdminCache(
        'communes',
        (existing as any)?.provinceId,
      );
      return res;
    }
  }
}
