import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BaseEntity,
  OneToOne
} from 'typeorm';
import { Role } from './role.entity';
import { User } from './user.entity';

@Entity('user_roles')
export class UserRole extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', name: 'user_id', nullable: false })
  user_id: number;

  @Column({ type: 'bigint', name: 'role_id', nullable: false })
  role_id: number;

  @OneToOne(() => Role)
  @JoinColumn({ referencedColumnName: 'id', name: 'role_id' })
  role: Role;

  @ManyToOne(() => User)
  @JoinColumn({ referencedColumnName: 'id', name: 'user_id' })
  user: User;
}
