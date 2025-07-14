import { Entity, Column, BaseEntity, PrimaryColumn } from "typeorm";

@Entity("playstatistics")
export class PlayStatistics extends BaseEntity {
	@Column({ type: "text", name: "project" })
	project: string;

	@Column({ type: "timestamp", name: "timestamp" })
	timestamp: string;

	@PrimaryColumn({ type: "timestamp", name: "stats_timestamp" })
	stats_timestamp: string;

	@Column({ type: "timestamp", name: "deployment_timestamp" })
	deployment_timestamp: string;

	@Column({ type: "text", name: "recipientid" })
	recipientid: string;

	@Column({ type: "text", name: "deployment_uuid" })
	deployment_uuid: string;

	@Column({ type: "text", name: "deployment" })
	deployment: string;

	@Column({ type: "text", name: "contentpackage" })
	contentpackage: string;

	@Column({ type: "text", name: "community" })
	community: string;

	@Column({ type: "text", name: "talkingbookid" })
	talkingbookid: string;

	@Column({ type: "text", name: "contentid" })
	contentid: string;

	@Column({ type: "text", name: "tbcid" })
	tbcid: string;

	@Column({ type: "integer", name: "started" })
	started: number;

	@Column({ type: "integer", name: "quarter" })
	quarter: number;

	@Column({ type: "integer", name: "half" })
	half: number;

	@Column({ type: "integer", name: "threequarters" })
	threequarters: number;

	@Column({ type: "integer", name: "completed" })
	completed: number;

	@Column({ type: "integer", name: "played_seconds" })
	played_seconds: number;

	@Column({ type: "integer", name: "survey_taken" })
	survey_taken?: number;

	@Column({ type: "integer", name: "survey_applied" })
	survey_applied?: number;

	@Column({ type: "integer", name: "survey_useless" })
	survey_useless?: number;
}
