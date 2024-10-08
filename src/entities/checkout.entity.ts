import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	BaseEntity,
} from "typeorm";
import { Project } from "./project.entity";

export enum ACMState {
	CHECKED_IN = "CHECKED_IN",
	CHECKED_OUT = "CHECKED_OUT",
}

@Entity("acm_checkout")
export class ACMCheckout extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", nullable: true })
	last_in_name?: string;

	@Column({ type: "varchar", nullable: true })
	last_in_version?: string;

	@Column({ type: "varchar", nullable: true })
	last_in_comment?: string;

	@Column({ type: "varchar", nullable: true })
	last_in_contact?: string;

	@Column({ type: "varchar", nullable: true })
	now_out_name?: string;

	@Column({ type: "varchar", nullable: true })
	now_out_contact?: string;

	@Column({ type: "varchar", nullable: true, name: "now_out_computername" })
	now_out_computername?: string;

	@Column({ type: "timestamptz", nullable: true })
	now_out_date?: Date;

	@Column({ type: "varchar", nullable: true })
	now_out_version?: string;

	@Column({ type: "varchar", nullable: true })
	now_out_comment?: string;

	@Column({ type: "varchar", nullable: true })
	now_out_key?: string;

	@Column({ type: "varchar", nullable: true })
	acm_comment?: string;

	@Column({ type: "varchar", nullable: false })
	acm_state: ACMState;

	@Column({ type: "varchar", nullable: false })
	last_in_file_name?: string;

	@Column({ type: "timestamptz", nullable: false })
	last_in_date?: Date;

	@Column({ type: "uuid", unique: true, nullable: true })
	project_id: string;

	@Column({ type: "boolean",  nullable: true })
	resettable?: boolean;

	@ManyToOne(() => Project)
	@JoinColumn({ name: "project_id" })
	project?: Project;
}
