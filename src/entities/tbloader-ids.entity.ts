import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	BaseEntity,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	Unique,
} from "typeorm";

@Entity("tb_loader_ids")
@Unique("uniq_email", ["email"])
export class TalkingBookLoaderId extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ type: "varchar", nullable: false, unique: true })
	email: string;

	@Column({ type: "int", nullable: true })
	reserved?: number;

	@Column({ type: "int", nullable: true })
	tb_loader_id?: number;

	@Column({ type: "varchar", nullable: true })
	hex_id?: string;

	@CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
	created_at: Date;

	@UpdateDateColumn({ name: "updated_at", type: "timestamp with time zone" })
	updated_at: Date;

	@DeleteDateColumn({ name: "deleted_at", type: "timestamp with time zone" })
	deleted_at?: Date;
}
