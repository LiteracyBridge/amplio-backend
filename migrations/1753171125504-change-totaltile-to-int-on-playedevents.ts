import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeTotaltileToIntOnPlayedevents1753171125504
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Drop view
		await queryRunner.query("DROP VIEW allsources");
		await queryRunner.query("DROP VIEW logstatsfromplayedevents");

		// change totaltime to integer
		await queryRunner.query(
			"ALTER TABLE playedevents ALTER COLUMN totaltime TYPE integer",
		);
		await queryRunner.query(
			"ALTER TABLE playedevents ALTER COLUMN timeplayed TYPE integer",
		);

		// Recreate view
		await queryRunner.query(`
            CREATE OR REPLACE VIEW logstatsfromplayedevents AS
 SELECT foo.packageid,
    foo.village,
    foo.talkingbookid,
    foo.contentid,
    foo.totaltime,
    sum(foo.timeplayed) AS timeplayed,
    sum(foo.countstarted) AS started,
    sum(foo.countquarter) AS quarter,
    sum(foo.counthalf) AS half,
    sum(foo.countthreequarters) AS threequarters,
    sum(foo.countcompleted) AS completed
   FROM ( SELECT playedevents.talkingbookid,
            playedevents.contentid,
            playedevents.timeplayed,
            playedevents.totaltime,
            playedevents.percentdone,
            playedevents.isfinished,
            playedevents.cycle,
            playedevents.period,
            playedevents.dayinperiod,
            playedevents.timeinday,
            playedevents.packageid,
            playedevents.village,
                CASE
                    WHEN playedevents.percentdone < 0.25::double precision AND (playedevents.totaltime - playedevents.timeplayed) > 10 AND NOT playedevents.isfinished THEN 1
                    ELSE 0
                END AS countstarted,
                CASE
                    WHEN playedevents.percentdone >= 0.25::double precision AND playedevents.percentdone <= 0.49999::double precision AND (playedevents.totaltime - playedevents.timeplayed) > 10 AND NOT playedevents.isfinished THEN 1
                    ELSE 0
                END AS countquarter,
                CASE
                    WHEN playedevents.percentdone >= 0.499991::double precision AND playedevents.percentdone <= 0.74999::double precision AND (playedevents.totaltime - playedevents.timeplayed) > 10 AND NOT playedevents.isfinished THEN 1
                    ELSE 0
                END AS counthalf,
                CASE
                    WHEN playedevents.percentdone >= 0.749991::double precision AND playedevents.percentdone <= 0.94999::double precision AND (playedevents.totaltime - playedevents.timeplayed) > 10 AND NOT playedevents.isfinished THEN 1
                    ELSE 0
                END AS countthreequarters,
                CASE
                    WHEN playedevents.percentdone > 0.94999::double precision OR (playedevents.totaltime - playedevents.timeplayed) < 10 OR playedevents.isfinished THEN 1
                    ELSE 0
                END AS countcompleted
           FROM playedevents
          WHERE playedevents.timeplayed >= 10 AND playedevents.totaltime > 0 AND playedevents.contentid::text <> 'dga'::text) foo
  GROUP BY foo.packageid, foo.village, foo.talkingbookid, foo.contentid, foo.totaltime;
        `);

        await queryRunner.query(`
    CREATE OR REPLACE VIEW allsources AS
 SELECT c.project,
    s0.contentpackage,
    s0.village,
    s0.talkingbook,
    s0.contentid,
    l.timeplayed AS played_seconds_logevents,
    s1.totaltimeplayed AS played_seconds_logs,
    s2.countcompleted::numeric * 1.23 * cm.duration_sec::numeric AS played_seconds_stats,
    s3.totaltimeplayed AS played_seconds_flash,
    GREATEST(l.timeplayed::numeric, s1.totaltimeplayed::bigint::numeric, s2.countcompleted::numeric * 1.23 * cm.duration_sec::numeric, s3.totaltimeplayed::bigint::numeric) AS played_seconds_max,
    GREATEST((COALESCE(0.3 * GREATEST(l.quarter, s1.countquarter::bigint, s3.countquarter::bigint)::numeric, 0::numeric) + COALESCE(0.6 * GREATEST(l.half, s1.counthalf::bigint, s3.counthalf::bigint)::numeric, 0::numeric) + COALESCE(0.83 * GREATEST(l.threequarters, s1.countthreequarters::bigint, s3.countthreequarters::bigint)::numeric, 0::numeric) + COALESCE(GREATEST(l.completed, s1.countcompleted::bigint, s2.countcompleted::bigint, s3.countcompleted::bigint)::numeric, 0::numeric))::bigint, (s2.countcompleted::bigint::numeric * 1.23)::bigint) AS effectivecompletions_max,
    0.3 * s3.countquarter::bigint::numeric + 0.6 * s3.counthalf::bigint::numeric + 0.83 * s3.countthreequarters::bigint::numeric + s3.countcompleted::bigint::numeric AS effecticecompletions_flash,
    l.started AS started_logevents,
    s1.countstarted AS started_logs,
    s2.countstarted AS started_stats,
    s3.countstarted AS started_flash,
    LEAST(l.started, s1.countstarted::bigint, s2.countstarted::bigint, s3.countstarted::bigint) AS started_min,
    GREATEST(l.started, s1.countstarted::bigint, s2.countstarted::bigint, s3.countstarted::bigint) AS started_max,
    GREATEST(l.started, s1.countstarted::bigint, s2.countstarted::bigint, s3.countstarted::bigint) - LEAST(l.started, s1.countstarted::bigint, s2.countstarted::bigint, s3.countstarted::bigint) AS started_variance,
    l.quarter AS quarter_logevents,
    s1.countquarter AS quarter_logs,
    s3.countquarter AS quarter_flash,
    GREATEST(l.quarter, s1.countquarter::bigint, s3.countquarter::bigint) AS quarter_max,
    l.half AS half_logevents,
    s1.counthalf AS half_logs,
    s3.counthalf AS half_flash,
    GREATEST(l.half, s1.counthalf::bigint, s3.counthalf::bigint) AS half_max,
    l.threequarters AS threequarters_logevents,
    s1.countthreequarters AS threequarters_logs,
    s3.countthreequarters AS threequarters_flash,
    GREATEST(l.threequarters, s1.countthreequarters::bigint, s3.countthreequarters::bigint) AS threequarters_max,
    l.completed AS completed_logevents,
    s1.countcompleted AS completed_logs,
    s2.countcompleted AS completed_stats,
    s3.countcompleted AS completed_flash,
    LEAST(l.completed, s1.countcompleted::bigint, s2.countcompleted::bigint, s3.countcompleted::bigint) AS completed_min,
    GREATEST(l.completed, s1.countcompleted::bigint, s2.countcompleted::bigint, s3.countcompleted::bigint) AS completed_max,
    GREATEST(l.completed, s1.countcompleted::bigint, s2.countcompleted::bigint, s3.countcompleted::bigint) - LEAST(s1.countcompleted, s2.countcompleted, s3.countcompleted) AS completed_variance
   FROM ( SELECT DISTINCT syncaggregation.contentpackage,
            syncaggregation.village,
            syncaggregation.talkingbook,
            syncaggregation.contentid
           FROM syncaggregation
        UNION
         SELECT DISTINCT playedevents.packageid AS pkg,
            playedevents.village AS vlg,
            playedevents.talkingbookid AS tb,
            playedevents.contentid AS cid
           FROM playedevents) s0
     JOIN communities c ON s0.village::text = c.communityname::text
     JOIN contentmetadata2 cm ON cm.contentid::text = s0.contentid::text AND cm.project::text = c.project::text
     LEFT JOIN logstatsfromplayedevents l ON s0.contentid::text = l.contentid::text AND s0.talkingbook::text = l.talkingbookid::text AND s0.contentpackage::text = l.packageid::text AND s0.village::text = l.village::text
     LEFT JOIN syncaggregation s1 ON s0.contentid::text = s1.contentid::text AND s0.talkingbook::text = s1.talkingbook::text AND s0.contentpackage::text = s1.contentpackage::text AND s0.village::text = s1.village::text AND s1.datasource = 1
     LEFT JOIN syncaggregation s2 ON s0.contentid::text = s2.contentid::text AND s0.talkingbook::text = s2.talkingbook::text AND s0.contentpackage::text = s2.contentpackage::text AND s0.village::text = s2.village::text AND s2.datasource = 2
     LEFT JOIN syncaggregation s3 ON s0.contentid::text = s3.contentid::text AND s0.talkingbook::text = s3.talkingbook::text AND s0.contentpackage::text = s3.contentpackage::text AND s0.village::text = s3.village::text AND s3.datasource = 3;
`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
