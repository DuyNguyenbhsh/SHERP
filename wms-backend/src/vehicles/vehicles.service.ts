import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepo: Repository<Vehicle>,
  ) {}

  create(data: any) {
    const vehicle = this.vehicleRepo.create(data);
    return this.vehicleRepo.save(vehicle);
  }

  findAll() {
    return this.vehicleRepo.find();
  }
  // --- THÊM 2 HÀM NÀY ---

  // Hàm Sửa
  async update(id: string, data: any) {
    await this.vehicleRepo.update(id, data);
    return this.vehicleRepo.findOne({ where: { id } });
  }

  // Hàm Xóa
  async remove(id: string) {
    await this.vehicleRepo.delete(id);
    return { deleted: true };
  }
}
