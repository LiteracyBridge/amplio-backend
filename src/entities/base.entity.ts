import { Exclude, instanceToPlain } from "class-transformer";
import {
	BaseEntity,
	Column,
	CreateDateColumn,
	DeleteDateColumn,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";

export abstract class _BaseEntity extends BaseEntity {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Exclude({ toPlainOnly: true })
	@Column({ type: "varchar", nullable: true })
	_id?: string;

	@CreateDateColumn({ type: "timestamptz" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at: Date;

	@DeleteDateColumn({ type: "timestamptz" })
	deleted_at?: Date;

	toJSON() {
		const data = instanceToPlain(this);

		return data;
	}
}
