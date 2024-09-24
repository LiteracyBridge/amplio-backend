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
import { Project } from './project.entity';
import { ProgramUser } from './program_user.entity';
import { OrganisationProgram } from './org_program.entity';
import { Deployment } from './deployment.entity';

enum DirectBeneficiaries {
  "male" = "Number of Male",
  "female" = "Number of Female",
  "youth" = "Number of Youth",
}

@Entity('programs')
@Unique(['program_id'])
export class Program extends BaseEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ length: 50, nullable: false })
  country: string;

  @Column({ type: 'varchar', nullable: false })
  region: any;

  @Column({ nullable: true })
  partner: string;

  @Column({ nullable: true })
  affiliate: string;

  @Column({ type: 'jsonb', nullable: false })
  sustainable_development_goals: string[];

  @Column({ type: 'jsonb', nullable: false })
  listening_models: any;

  @Column({ nullable: false })
  deployments_count: number;

  @Column({ length: 50, nullable: false })
  deployments_length: string;

  @Column({ length: 100, nullable: true })
  tableau_id: string;

  @Column({ type: 'date', nullable: false })
  deployments_first: Date;

  @Column({ length: 50, nullable: false })
  feedback_frequency: string;

  @Column({ type: 'json', nullable: false })
  languages: string[];

  @Column({ type: 'jsonb' })
  direct_beneficiaries_map: DirectBeneficiaries;

  @Column({ type: 'json', default: {} })
  direct_beneficiaries_additional_map: Record<string, any>;

  @Column({ type: 'varchar', nullable: false, unique: true })
  program_id: string;

  @ManyToOne(() => Project, (project) => project.program)
  @JoinColumn({ name: 'project_id', referencedColumnName: 'id' })
  project: Project;

  @OneToMany(() => OrganisationProgram, (row) => row.program)
  @JoinColumn({ referencedColumnName: 'id', name: 'organisation_id' })
  organisations: OrganisationProgram[];

  @OneToMany(() => ProgramUser, (programUser) => programUser.program)
  users: ProgramUser[];
}
