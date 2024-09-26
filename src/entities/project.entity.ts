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
import { Program } from './program.entity';
import { Recipient } from './recipient.entity';
import { Deployment } from './deployment.entity';
import { Language, ProjectLanguage } from './language.entity';

export enum DeploymentInterval {
  one_month = 1,
  one_quarter = 3,
  six_months = 6,
  one_year = 12,
}

@Entity('projects')
export class Project extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  _id: number;

  @Column({ name: 'project', nullable: false })
  name: string;

  @Column({ nullable: false, default: true })
  active: boolean;

  @Column({ name: 'projectcode', nullable: false })
  code: string;

  @OneToMany(() => Deployment, (deployment) => deployment.project)
  deployments: Deployment[];

  @OneToMany(() => Recipient, (recipient) => recipient.project)
  recipients: Recipient[];

  @OneToOne(() => Program, (program) => program.project)
  program: Program;

  @OneToOne(() => Program, (program) => program.project)
  general: Program;

  @OneToMany(() => ProjectLanguage, (row) => row.project)
  languages: ProjectLanguage[];
}
