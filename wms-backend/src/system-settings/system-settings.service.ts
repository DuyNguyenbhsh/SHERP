import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { CreateSettingDto, UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private settingRepo: Repository<SystemSetting>,
  ) {}

  async findAll(): Promise<SystemSetting[]> {
    return this.settingRepo.find({
      where: { is_active: true },
      order: { category: 'ASC', setting_key: 'ASC' },
    });
  }

  async findByKey(key: string): Promise<SystemSetting> {
    const setting = await this.settingRepo.findOne({
      where: { setting_key: key },
    });
    if (!setting)
      throw new NotFoundException(`Không tìm thấy cài đặt với key: ${key}`);
    return setting;
  }

  async create(dto: CreateSettingDto): Promise<SystemSetting> {
    const exist = await this.settingRepo.findOne({
      where: { setting_key: dto.setting_key },
    });
    if (exist)
      throw new ConflictException(`Key "${dto.setting_key}" đã tồn tại`);
    return this.settingRepo.save(this.settingRepo.create(dto));
  }

  async update(key: string, dto: UpdateSettingDto): Promise<SystemSetting> {
    const setting = await this.findByKey(key);
    Object.assign(setting, dto);
    return this.settingRepo.save(setting);
  }
}
