import {
	Entity,
	Column,
	OneToOne,
	ManyToOne,
	BaseEntity,
	OneToMany,
	JoinColumn,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
	CreateDateColumn,
	DeleteDateColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Program } from "./program.entity";

@Entity("program_users")
export class ProgramUser extends BaseEntity {
	@Column({ type: "bigint", nullable: false, primary: true })
	user_id: number;

	@Column({ type: "bigint", nullable: false, primary: true })
	program_id: number;

	@ManyToOne(() => User)
	@JoinColumn({ referencedColumnName: "id", name: "user_id" })
	user: User;

	@OneToOne(
		() => Program,
		(program) => program.id,
	)
	@JoinColumn({ referencedColumnName: "id", name: "program_id" })
	program: Program;

	@CreateDateColumn({ type: "timestamptz" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at: Date;

	@DeleteDateColumn({ type: "timestamptz" })
	deleted_at: Date;
}
