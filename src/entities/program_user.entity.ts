import {
  Entity,
  Column,
  OneToOne,
  ManyToOne
} from 'typeorm';
import { User } from './user.entity';
import { Program } from './program.entity';

@Entity('program_users')
export class ProgramUser {
  @Column({ type: 'bigint', nullable: false })
  user_id: number;

  @Column({ type: 'bigint', nullable: false })
  program_id: number;

  @ManyToOne(() => User, (user) => user.id)
  user: User;

  @OneToOne(() => Program, (program) => program.id)
  program: Program
}
