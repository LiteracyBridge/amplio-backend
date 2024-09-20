import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BaseEntity
} from 'typeorm';

@Entity('organisations')
export class Organisation extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'int', nullable: true })
  parent_id: number | null;

  @ManyToOne(() => Organisation, (organisation) => organisation.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Organisation | null;

  @OneToMany(() => Organisation, (organisation) => organisation.parent)
  children: Organisation[];

  get isParent() {
    return this.parent_id === null;
  }
}
