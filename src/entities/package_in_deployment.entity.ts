import {
	Entity,
	PrimaryColumn,
	Column,
	BaseEntity,
	JoinColumn,
	ManyToOne,
} from "typeorm";
import { Project } from "./project.entity";

@Entity("packagesindeployment")
export class PackageInDeployment extends BaseEntity {
	@PrimaryColumn({ name: "project", type: "varchar" })
	project_code: string;

	@PrimaryColumn({ name: "deployment", type: "varchar" })
	deployment_code: string;

	@PrimaryColumn({ type: "varchar" })
	contentpackage: string;

	@PrimaryColumn({ type: "varchar" })
	packagename: string;

	@PrimaryColumn({ type: "date" })
	startdate?: Date;

	@PrimaryColumn({ type: "date" })
	enddate?: Date;

	@Column({ type: "varchar" })
	languagecode: string;

	@Column({ type: "varchar" })
	groups: string;

	@Column({ type: "varchar" })
	distribution: string;

	@ManyToOne(() => Project)
	@JoinColumn({
		referencedColumnName: "code",
		foreignKeyConstraintName: "project_code",
	})
	project?: Project;
}
