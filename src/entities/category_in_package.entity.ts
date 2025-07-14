import {
	Entity,
	PrimaryColumn,
	Column,
	ManyToOne,
	JoinColumn,
	OneToMany,
	BaseEntity,
} from "typeorm";

@Entity("categoriesinpackage")
export class CategoryInPackage extends BaseEntity {
	@Column({ name: "project", type: "varchar" })
	project: string;

	@Column({ name: "contentpackage", type: "varchar" })
	contentpackage: string;

	@Column({ name: "categoryid", type: "varchar" })
	categoryid: string;

	@Column({ name: "order", type: "integer" })
	order: number;
}
