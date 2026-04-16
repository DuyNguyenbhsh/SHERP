import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from './dto/create-customer.dto';
import { CustomerType } from '../sales/enums/sales.enum';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  private async generateCode(): Promise<string> {
    const today = new Date();
    const prefix = `CUS-${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await this.repo.count();
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  async create(dto: CreateCustomerDto) {
    const customer_code = await this.generateCode();
    const customer = this.repo.create({ ...dto, customer_code });
    const saved = await this.repo.save(customer);
    return {
      status: 'success',
      message: `Tạo khách hàng ${customer_code} thành công`,
      data: saved,
    };
  }

  async findAll(filter: { is_active?: boolean; customer_type?: string }) {
    const where: FindOptionsWhere<Customer> = {};
    if (filter.is_active !== undefined) where.is_active = filter.is_active;
    if (
      filter.customer_type &&
      Object.values(CustomerType).includes(filter.customer_type as CustomerType)
    ) {
      where.customer_type = filter.customer_type as CustomerType;
    }
    const customers = await this.repo.find({
      where,
      order: { created_at: 'DESC' },
    });
    return {
      status: 'success',
      message: `Tìm thấy ${customers.length} khách hàng`,
      data: customers,
    };
  }

  async findOne(id: string) {
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy khách hàng ID ${id}`,
        data: null,
      });
    }
    return { status: 'success', message: 'OK', data: customer };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy khách hàng ID ${id}`,
        data: null,
      });
    }
    Object.assign(customer, dto);
    const saved = await this.repo.save(customer);
    return {
      status: 'success',
      message: `Cập nhật ${customer.customer_code} thành công`,
      data: saved,
    };
  }

  async softDelete(id: string) {
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy khách hàng ID ${id}`,
        data: null,
      });
    }
    customer.is_active = false;
    await this.repo.save(customer);
    return {
      status: 'success',
      message: `Đã vô hiệu hóa ${customer.customer_code}`,
      data: null,
    };
  }

  async restore(id: string) {
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy khách hàng ID ${id}`,
        data: null,
      });
    }
    customer.is_active = true;
    await this.repo.save(customer);
    return {
      status: 'success',
      message: `Đã khôi phục ${customer.customer_code}`,
      data: customer,
    };
  }

  async getDebt(id: string) {
    const customer = await this.repo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException({
        status: 'error',
        message: `Không tìm thấy khách hàng ID ${id}`,
        data: null,
      });
    }
    return {
      status: 'success',
      data: {
        customer_id: customer.id,
        customer_code: customer.customer_code,
        credit_limit: Number(customer.credit_limit),
        current_debt: Number(customer.current_debt),
        available:
          Number(customer.credit_limit) - Number(customer.current_debt),
      },
    };
  }

  /** Internal: update debt sau khi SO confirm/cancel/paid. */
  async adjustDebt(customerId: string, delta: number): Promise<void> {
    const customer = await this.repo.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }
    const newDebt = Number(customer.current_debt) + delta;
    if (newDebt < 0) {
      throw new BadRequestException(
        `Current debt không thể âm (hiện tại: ${customer.current_debt}, delta: ${delta})`,
      );
    }
    customer.current_debt = newDebt;
    await this.repo.save(customer);
  }
}
