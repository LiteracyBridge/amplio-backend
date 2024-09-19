import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BaseEntity
} from 'typeorm';
import { Choice } from './uf_choice.entity';
import { Analysis } from './analysis.entity';

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
