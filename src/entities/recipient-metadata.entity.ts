import {
	Entity,
	PrimaryColumn,
	Column,
	Unique,
	ManyToOne,
	JoinColumn,
	BaseEntity,
} from "typeorm";
import { Recipient } from "./recipient.entity";

@Entity("recipient_metadata")
@Unique("recipient_uniq_key", ["name", "gender", "age", "recipientId"])
export class RecipientMetadata extends BaseEntity {
	@PrimaryColumn({
		type: "uuid",
		default: () => "uuid_generate_v4()",
		unique: true,
	})
	id: string;

	@Column({ name: "name", type: "varchar" })
	name: string;

	@Column({ type: "varchar" })
	gender: string;

	@Column({ name: "recipient_id", type: "varchar" })
	recipientId: string;

	@Column({ type: "integer" })
	age: number;

	// @Column({ type: "integer" })
	// number_of_people: number;

	@ManyToOne(() => Recipient)
	@JoinColumn({ name: "recipient_id", referencedColumnName: "id" })
	recipient: Recipient;
}
