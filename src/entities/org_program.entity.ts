import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	OneToMany,
	Unique,
	JoinColumn,
	OneToOne,
	BaseEntity,
} from "typeorm";
import { Organisation } from "./organisation.entity";
import { Program } from "./program.entity";

@Entity("organisation_programs")
export class OrganisationProgram extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ name: "program_id", type: "bigint" })
	program_id: number;

	@Column({ name: "organisation_id", type: "bigint" })
	organisation_id: number;

	@ManyToOne(() => Organisation)
	@JoinColumn({ referencedColumnName: "id", name: "organisation_id" })
	organisation: Organisation;

	@ManyToOne(
		() => Program,
		(program) => program.organisations,
	)
  @JoinColumn({ referencedColumnName: "id", name: "program_id" })
	program: Program;
}
