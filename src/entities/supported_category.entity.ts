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
  parent_category: SupportedCategory;

  @Column({ name: 'isleafnode', type: 'boolean', nullable: false })
  isleafnode: boolean;

  @Column({ name: 'categoryname', type: 'varchar', nullable: false })
  name: string;

  @Column({ name: 'fullname', type: 'varchar', nullable: false })
  full_name: string;

  @OneToMany(() => SupportedCategory, category => category.parent_category)
  children: SupportedCategory[];
}
