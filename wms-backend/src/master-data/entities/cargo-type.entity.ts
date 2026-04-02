import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class CargoType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // Mã (VD: 1, 2)

  @Column()
  name: string; // Tên (VD: Dễ vỡ, Lắp ráp)

  @Column({ nullable: true })
  description: string;
}
