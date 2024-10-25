import {
  Entity,
  Unique,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity
} from 'typeorm';
import { Survey } from './survey.entity';
import { SurveySection } from './survey_section.entity';
import { Choice } from './uf_choice.entity';
import { Analysis } from './analysis.entity';

@Entity('uf_questions')
@Unique("uf_question__id", ["_id"])
export class Question extends BaseEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "uuid", name: '_id', default: () => "uuid_generate_v4()", unique: true })
  _id: string;

  @Column({ type: 'int', nullable: true })
  order: number;

  @Column({ type: 'varchar', nullable: true })
  type: string;

  @Column({ type: 'varchar', nullable: true })
  question_label: string;

  @Column({ type: 'varchar', nullable: true })
  constraint: string;

  @Column({ type: 'varchar', nullable: true })
  default: string;

  @Column({ type: 'varchar', nullable: true })
  hint: string;

  @Column({ type: 'jsonb', nullable: true })
  choice_list: string;

  @Column({ type: 'boolean', default: false })
  required: boolean;

  @Column({ type: 'int' })
  deploymentnumber: number;

  @Column({ type: 'int', nullable: true })
  section_id: number;

  // @ManyToOne(() => SurveySection, (section) => section.questions, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'section_id' })
  // section: SurveySection;

  @Column({ type: 'int', nullable: true })
  parent_id?: number;

  // @ManyToOne(() => Question, (question) => question.children, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'parent_id' })
  // parent: Question;

  @Column({ type: 'int' })
  survey_id: number;

  @ManyToOne(() => Survey, (survey) => survey.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'survey_id' })
  survey: Survey;

  @Column({ type: 'jsonb', nullable: true, default: null })
  conditions: Record<string, any>;

  @OneToMany(() => Choice, (choice) => choice.question)
  choices: Choice[];

  @OneToMany(() => Analysis, (analysis) => analysis.question)
  analysis: Analysis[];

  // @CreateDateColumn()
  // created_at: Date;

  // @UpdateDateColumn()
  // updated_at: Date;
}
