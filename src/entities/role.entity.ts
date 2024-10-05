import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	JoinColumn,
	BaseEntity,
} from "typeorm";
import { Organisation } from "./organisation.entity";

export const PERMISSIONS_TEMPLATE = {
	acm: [
		"manage_deployment",
		"manage_playlist",
		"manage_prompt",
		"manage_content",
		"manage_checkout",
	],
	talking_book_loader: ["deploy_content"],
	user_feedback: ["manage_survey", "analyse_survey", "review_analysis"],
	staff: ["manage_staff", "manage_role"],
	program: ["manage_users", "manage_specification", "manage_program"],
	statistics: ["view_tb_analytics", "view_deployment_status"],
};

@Entity("roles")
export class Role extends BaseEntity {
	@PrimaryGeneratedColumn("increment")
	id: number;

	@Column({ type: "varchar", nullable: false })
	name: string;

	@Column({ type: "varchar", nullable: true })
	description?: string;

	@Column({ type: "jsonb", nullable: false })
	permissions: Record<string, string[]> = {}

	@Column({ type: "int", name: "organisation_id" })
	organisation_id: number;

	@ManyToOne(() => Organisation)
	@JoinColumn({ name: "organisation_id", referencedColumnName: "id" })
	organisation: Organisation;

	@CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
	created_at: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
	updated_at: Date;

	@DeleteDateColumn({ name: "deleted_at", type: "timestamp with time zone" })
	deleted_at?: Date;
}

/**
 * Permission enum is used to access the PERMISSIONS_TEMPLATE in a type-safe way.
 * ! NOTE: This and the PERMISSIONS_TEMPLATE should be kept in sync.
 */
export enum Permission {
	// ACM/TB Loader
	manage_deployment = "manage_deployment",
	manage_playlist = "manage_playlist",
	manage_prompt = "manage_prompt",
	manage_content = "manage_content",
	manage_checkout = "manage_checkout",

	// # Talking Book Loader
	deploy_content = "deploy_content",

	// # User feedback
	manage_survey = "manage_survey",
	analyse_survey = "analyse_survey",
	review_analysis = "review_analysis",

	// # Staff
	manage_staff = "manage_staff",
	manage_role = "manage_role",

	// # Programs
	manage_users = "manage_users",
	manage_specification = "manage_specification",
	manage_program = "manage_program",

	// # Statistics
	view_tb_analytics = "view_tb_analytics",
	view_deployment_status = "view_deployment_status",
}
