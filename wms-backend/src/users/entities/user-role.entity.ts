import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('user_roles')
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 1. Cột nối User (Quan trọng nhất, đang bị lỗi ở đây)
  @ManyToOne(() => User, (user) => user.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // 2. Cột nối Role
  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  // 3. Cột nối Organization
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
