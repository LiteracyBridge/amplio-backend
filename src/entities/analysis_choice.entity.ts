import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Choice } from './uf_choice.entity';
import { Analysis } from './analysis.entity';

@Entity('uf_analysis_choices')
export class AnalysisChoice extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  choice_id: number;

  @ManyToOne(() => Choice, { onDelete: 'CASCADE' })
  choice: Choice;

  @Column()
  analysis_id: number;

  @ManyToOne(() => Analysis, (analysis) => analysis.choices, { onDelete: 'CASCADE' })
  analysis: Analysis;


  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date;
}
