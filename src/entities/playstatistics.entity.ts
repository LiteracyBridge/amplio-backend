import { Entity, Column, BaseEntity, PrimaryColumn, Unique } from "typeorm";

@Entity("playstatistics")
@Unique('uq_playstatistics__id', ['_id'])
export class PlayStatistic extends BaseEntity {
	@PrimaryColumn({ type: "uuid", default: () => "uuid_generate_v4()", unique: true })
	_id: string;

	@Column({ type: "text", name: "project" })
	project: string;

	@Column({ type: "timestamp", name: "timestamp" })
	timestamp: string;

	@Column({ type: "timestamp", name: "stats_timestamp" })
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

	/**
	 * The number of times the message was started, but didn't reach 1/4
	 */
	@Column({ type: "integer", name: "started" })
	started: number;

	/**
	 * Tne number of times the message was played to 1/4, but not 1/2
	 */
	@Column({ type: "integer", name: "quarter" })
	one_quarter: number;

	/**
	 * The number of times the message was played to 1/2, but not 3/4
	 */
	@Column({ type: "integer", name: "half" })
	half: number;

	/**
	 * The number of times the message was played to 3/4, but not completion
	 */
	@Column({ type: "integer", name: "threequarters" })
	threequarters: number;

	/*
	 * The number of times the message was played to completion
	 */
	@Column({ type: "integer", name: "completed" })
	completed: number;

	/**
	 * The total played seconds
	 */
	@Column({ type: "integer", name: "played_seconds" })
	played_seconds: number;

	@Column({ type: "integer", name: "survey_taken" })
	survey_taken?: number;

	@Column({ type: "integer", name: "survey_applied" })
	survey_applied?: number;

	@Column({ type: "integer", name: "survey_useless" })
	survey_useless?: number;
}
