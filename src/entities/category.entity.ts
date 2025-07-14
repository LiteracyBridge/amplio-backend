import {
	Entity,
	PrimaryColumn,
	Column,
	ManyToOne,
	JoinColumn,
	OneToMany,
	BaseEntity,
} from "typeorm";

@Entity("categories")
export class Category extends BaseEntity {
	@PrimaryColumn({ name: "categoryid", type: "varchar" })
	id: string;

	@Column({ name: "categoryname", type: "varchar" })
	name: string;

	@Column({ name: "project_code", type: "varchar" })
	project_code: string;
}
