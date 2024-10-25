import { Exclude, Expose, instanceToPlain } from "class-transformer";
import {
	JoinColumn,
	BaseEntity,
	Column,
	Entity,
	CreateDateColumn,
	DeleteDateColumn,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
	ManyToOne,
	OneToOne,
} from "typeorm";
import { Project } from "./project.entity";
import { User } from "./user.entity";

@Entity({ name: "published_program_specs" })
export class PublishedProgramSpecs extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "uuid", nullable: true })
	project_id: string;

	@ManyToOne(() => Project)
	@JoinColumn({ referencedColumnName: "_id", name: "project_id" })
	project: Project;

	@Column({ type: "jsonb", nullable: true })
	diff: Record<string, any>;

	@Column({ type: "jsonb", nullable: false })
	spec: Record<string, any>;

	@Column({ type: "uuid", nullable: true })
	previous_id?: string;

	@OneToOne(
		() => PublishedProgramSpecs,
		(spec) => spec.id,
	)
	@JoinColumn({ referencedColumnName: "id", name: "previous_id" })
	previous: PublishedProgramSpecs;

	/**
	 * Email of the publisher
	 */
	@Column({ type: "varchar", nullable: false })
	publisher: string;

	// @ManyToOne(() => User)
	// @JoinColumn({ referencedColumnName: "_id", name: "published_by_id" })
	// published_by: User;

	@CreateDateColumn({ type: "timestamptz" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at: Date;

	@DeleteDateColumn({ type: "timestamptz" })
	deleted_at?: Date;
}
