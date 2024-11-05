import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	OneToMany,
	JoinColumn,
	BaseEntity,
	In,
	FindOptionsWhere,
} from "typeorm";
import { OrganisationProgram } from "./org_program.entity";

@Entity("organisations")
export class Organisation extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: "varchar", unique: true })
	name: string;

	@Column({ type: "int", nullable: true })
	parent_id?: number;

	@ManyToOne(
		() => Organisation,
		(organisation) => organisation.children,
	)
	@JoinColumn({ name: "parent_id" })
	parent?: Organisation;

	@OneToMany(
		() => Organisation,
		(organisation) => organisation.parent,
	)
	children: Organisation[];

	@OneToMany(
		() => OrganisationProgram,
		(row) => row.organisation,
	)
	programs: OrganisationProgram[];

	get isParent() {
		return this.parent_id === null;
	}
}
