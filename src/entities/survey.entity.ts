import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { Deployment } from './deployment.entity';
import { Question } from './uf_question.entity';
import { SurveySection } from './survey_section.entity';

export enum SurveyStatus {
  draft = 'draft',
}
@Entity('uf_surveys')
export class Survey extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar' })
  project_code: string;

  // TODO: Remove deployment_id and language cols
  @Column({ type: 'varchar', nullable: true })
  deployment_id?: string;

  @Column({ type: 'varchar', default: 'en', nullable: true })
  language?: string;

  @ManyToOne(() => Deployment)
  @JoinColumn({ name: 'deployment_id' })
  deployment: Deployment;

  @OneToMany(() => Question, (question) => question.survey)
  questions: Question[];

  @OneToMany(() => SurveySection, (row) => row.survey)
  @JoinColumn({ referencedColumnName: 'survey_id' })
  sections: SurveySection[];

  @Column({ type: 'varchar', default: 'draft', nullable: true })
  status: SurveyStatus;
}
