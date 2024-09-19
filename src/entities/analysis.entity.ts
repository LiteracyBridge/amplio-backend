import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BaseEntity
} from 'typeorm';
import { Choice } from './uf_choice.entity';

@Entity('uf_analysis_choices')
export class AnalysisChoice extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  choiceId: number;

  @ManyToOne(() => Choice, { onDelete: 'CASCADE' })
  choice: Choice;

  @Column()
  analysisId: number;

  @ManyToOne(() => Analysis, (analysis) => analysis.choices, { onDelete: 'CASCADE' })
  analysis: Analysis;
}

@Entity('uf_analysis')
export class Analysis extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageUuid: string;

  @Column()
  analystEmail: string;

  @Column({ type: 'timestamptz', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submitTime: Date;

  @Column({ nullable: true })
  response: string;

  @Column()
  questionId: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => Question, (question) => question.analysis)
  question: Question;

  @ManyToOne(() => UserFeedbackMessage)
  message: UserFeedbackMessage;

  @OneToMany(() => AnalysisChoice, (analysisChoice) => analysisChoice.analysis)
  choices: AnalysisChoice[];
}
