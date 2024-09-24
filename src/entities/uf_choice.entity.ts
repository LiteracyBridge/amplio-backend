
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BaseEntity
} from 'typeorm';
import { Question } from './uf_question.entity';

@Entity('uf_choices')
export class Choice extends BaseEntity {
  @PrimaryGeneratedColumn()
  choice_id: number;

  @Column()
  choice_list: string;

  @Column()
  choice_label: string;

  @Column({ nullable: true })
  value: string;

  @Column()
  order: number;

  @Column({ type: 'boolean', default: false })
  is_other: boolean;

  @Column({ type: 'bigint', nullable: true })
  question_id: number;

  @Column({ type: 'bigint', nullable: true })
  parent_id: number;

  @ManyToOne(() => Question, question => question.choices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @ManyToOne(() => Choice, choice => choice.sub_options, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Choice;

  @OneToMany(() => Choice, choice => choice.parent, { cascade: true })
  sub_options: Choice[];
}
