import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  BaseEntity
} from 'typeorm';

@Entity('supportedcategories')
export class SupportedCategory extends BaseEntity {
  @PrimaryColumn({ name: 'categorycode', type: 'varchar' })
  code: string;

  @ManyToOne(() => SupportedCategory, category => category.children)
  @JoinColumn({ name: 'parentcategory' })
  parentCategory: SupportedCategory;

  @Column({ name: 'isleafnode', type: 'boolean', nullable: false })
  isLeaf: boolean;

  @Column({ name: 'categoryname', type: 'varchar', nullable: false })
  name: string;

  @Column({ name: 'fullname', type: 'varchar', nullable: false })
  fullName: string;

  @OneToMany(() => SupportedCategory, category => category.parentCategory)
  children: SupportedCategory[];
}
