import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BaseEntity
} from 'typeorm';
import { Deployment } from './deployment.entity';
import { Question } from './uf_question.entity';

@Entity('uf_survey_sections')
export class SurveySection extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: 'Untitled Section' })
  name: string;

  @Column({ type: 'int', nullable: true })
  survey_id: number;
}

@Entity('uf_surveys')
export class Survey extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar' })
  project_code: string;

  // TODO: Remove deployment_id and language cols
  @Column({ type: 'varchar', nullable: true })
  deployment_id: string | null;

  @Column({ type: 'varchar', default: 'en', nullable: true })
  language: string | null;

  @ManyToOne(() => Deployment)
  @JoinColumn({ name: 'deployment_id' })
  deployment: Deployment;

  @OneToMany(() => Question, (question) => question.survey)
  questions: Question[];

  @OneToMany(() => SurveySection, (section) => section.survey_id)
  sections: SurveySection[];

  @Column({ type: 'varchar', default: 'draft', nullable: true })
  status: string;
}
