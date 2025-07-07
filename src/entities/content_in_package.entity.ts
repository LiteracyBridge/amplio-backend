import {
	Entity,
	PrimaryColumn,
	Column,
	BaseEntity,
	JoinColumn,
	ManyToOne,
} from "typeorm";
import { Project } from "./project.entity";

@Entity("contentinpackage")
export class ContentInPackage extends BaseEntity {
	@PrimaryColumn({ name: "project", type: "varchar" })
	project_id: string;

	@Column({ name: "contentpackage", type: "varchar" })
	contentpackage: string;

	@Column({ name: "contentid", type: "varchar" })
	contentid: string;

	@Column({ name: "categoryid", type: "varchar" })
	categoryid: string;

	@Column({ name: "position", type: "integer" })
	position: number;

	@ManyToOne(() => Project)
	@JoinColumn({ referencedColumnName: "code" })
	project?: Project;
}
