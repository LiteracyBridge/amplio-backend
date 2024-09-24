import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Unique,
  JoinColumn,
  OneToOne,
  BaseEntity
} from 'typeorm';
import { Organisation } from './organisation.entity';
import { Program } from './program.entity';


@Entity('organisation_programs')
export class OrganisationProgram extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  program_id: number;

  @Column()
  organisation_id: number;

  @ManyToOne(() => Organisation)
  @JoinColumn({ referencedColumnName: 'id', name: 'organisation_id' })
  organisation: Organisation;

  @ManyToOne(() => Program, (program) => program.organisations)
  program: Program;
}
