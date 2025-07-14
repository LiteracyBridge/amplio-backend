import { Entity, Column, BaseEntity, PrimaryColumn } from "typeorm";

@Entity("playedevents")
export class PlayedEvent extends BaseEntity {
	@PrimaryColumn({ type: "text", name: "talkingbookid" })
	talkingbookid: string;

	@Column({ type: "integer", name: "cycle" })
	cycle: number;

	@Column({ type: "integer", name: "dayinperiod" })
	dayinperiod: number;

	@Column({ type: "integer", name: "householdrotation" })
	householdrotation: number;

	@Column({ type: "integer", name: "period" })
	period: number;

	@Column({ type: "smallint", name: "timeplayed" })
	timeplayed: number;

	@Column({ type: "smallint", name: "totaltime" })
	totaltime: number;

	@Column({ type: "smallint", name: "volume" })
	volume: number;

	@Column({ type: "smallint", name: "updateinyear" })
	updateinyear: number;

	@Column({ type: "smallint", name: "year" })
	year: number;

	@Column({ type: "double precision", name: "percentagedone" })
	percentagedone: number;

	@Column({ type: "double precision", name: "maxvolts" })
	maxvolts: number;

	@Column({ type: "double precision", name: "minvolts" })
	minvolts: number;
	@Column({ type: "double precision", name: "steadystatevolts" })
	steadystatevolts: number;

	@Column({ type: "boolean", name: "isfinished" })
	isfinished: string;

	@Column({ type: "text", name: "packageid" })
	packageid: string;

	@Column({ type: "text", name: "village" })
	village: string;

	@Column({ type: "text", name: "contentid" })
	contentid: string;

	@Column({ type: "time without time zone", name: "timeinday" })
	timeinday: string;
}
