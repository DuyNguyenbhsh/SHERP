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
  ) {}

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

    // Riêng 2 bảng hành chính thì đặc biệt hơn
    if (type === 'provinces')
      return this.provinceRepo.find({ order: { code: 'ASC' } });
    if (type === 'communes') {
      // Nếu có lọc theo Tỉnh
      if (query?.provinceId) {
        return this.communeRepo.find({
          where: { provinceId: query.provinceId },
          order: { code: 'ASC' },
        });
      }
      return this.communeRepo.find({ take: 100 }); // Lấy tối đa 100 xã nếu không lọc
    }
    return [];
  }

  // --- HÀM TẠO MỚI ---
  async create(type: string, data: any) {
    if (type === 'providers') return this.providerRepo.save(data);
    if (type === 'types') return this.typeRepo.save(data);
    if (type === 'statuses') return this.statusRepo.save(data);
    if (type === 'routes') return this.routeRepo.save(data);
    if (type === 'cargos') return this.cargoRepo.save(data);
    if (type === 'provinces') return this.provinceRepo.save(data);
    if (type === 'communes') return this.communeRepo.save(data);
  }

  // --- HÀM CẬP NHẬT ---
  async update(type: string, id: string, data: any) {
    if (type === 'providers') return this.providerRepo.update(id, data);
    if (type === 'types') return this.typeRepo.update(id, data);
    if (type === 'statuses') return this.statusRepo.update(id, data);
    if (type === 'routes') return this.routeRepo.update(id, data);
    if (type === 'cargos') return this.cargoRepo.update(id, data);
    // (Tạm thời chưa cần update hành chính, nhưng nếu cần cứ thêm vào)
  }

  // --- HÀM XÓA ---
  async delete(type: string, id: string) {
    if (type === 'providers') return this.providerRepo.delete(id);
    if (type === 'types') return this.typeRepo.delete(id);
    if (type === 'statuses') return this.statusRepo.delete(id);
    if (type === 'routes') return this.routeRepo.delete(id);
    if (type === 'cargos') return this.cargoRepo.delete(id);
    if (type === 'provinces') return this.provinceRepo.delete(id);
    if (type === 'communes') return this.communeRepo.delete(id);
  }
}
