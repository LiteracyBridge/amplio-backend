import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Deployment } from './deployment.entity';
import { Question } from './uf_question.entity';

export enum SurveyStatus {
  draft = 'draft',
}
@Entity('uf_survey_sections')
export class SurveySection extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: 'Untitled Section' })
  name: string;

  @Column({ type: 'int', nullable: true })
  survey_id: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;

  @DeleteDateColumn({ type: "timestamptz" })
  deleted_at?: Date;
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

  @OneToMany(() => SurveySection, (section) => section.survey_id)
  sections: SurveySection[];

  @Column({ type: 'varchar', default: 'draft', nullable: true })
  status: SurveyStatus;
}
