import {
  Entity,
  Column,
  OneToOne,
  ManyToOne,
  BaseEntity,
  OneToMany,
  JoinColumn
} from 'typeorm';
import { User } from './user.entity';
import { Program } from './program.entity';

@Entity('program_users')
export class ProgramUser extends BaseEntity {
  @Column({ type: 'bigint', nullable: false })
  user_id: number;

  @Column({ type: 'bigint', nullable: false })
  program_id: number;

  // @OneToOne(() => User, (user) => user.id)
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  @OneToOne(() => Program, (program) => program.id)
  program: Program
}
