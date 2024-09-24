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
import { UserFeedbackMessage } from './uf_message.entity';
import { Question } from './uf_question.entity';
import { AnalysisChoice } from './analysis_choice.entity';

@Entity('uf_analysis')
export class Analysis extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  message_uuid: string;

  @Column()
  analyst_email: string;

  @Column({ type: 'timestamptz', nullable: true })
  start_time: Date;

  @Column({ type: 'timestamptz', nullable: true })
  submit_time: Date;

  @Column({ nullable: true })
  response: string;

  @Column()
  question_id: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date;

  @ManyToOne(() => Question, (question) => question.analysis)
  question: Question;

  @ManyToOne(() => UserFeedbackMessage)
  message: UserFeedbackMessage;

  @OneToMany(() => AnalysisChoice, (analysisChoice) => analysisChoice.analysis)
  choices: AnalysisChoice[];
}
