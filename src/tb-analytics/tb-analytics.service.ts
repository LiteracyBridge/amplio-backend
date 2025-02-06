import { Injectable } from "@nestjs/common";
import { Deployment } from "src/entities/deployment.entity";
import { TalkingBookDeployed } from "src/entities/tb_deployed.entity";
import { SummaryAnalyticsQueryDto } from "./tb-query.dto";

const STATUS_BY_DEPLOYMENT = `
WITH status_by_deployment AS (
    SELECT tbd.project AS programid, d.deploymentnumber, tbd.deployment, MIN(tbd.deployedtimestamp::date) AS earliest,
           MAX(tbd.deployedtimestamp::date) AS latest,
           COUNT(distinct tbd.talkingbookid) AS deployed,
           COUNT(distinct ui.talkingbookid) AS collected
      FROM tbsdeployed tbd
      FULL OUTER JOIN usage_info ui
        ON tbd.deployment_uuid = ui.deployment_uuid
      JOIN deployments d
        ON tbd.project=d.project AND tbd.deployment=d.deployment
     WHERE NOT tbd.testing
     GROUP BY tbd.project, d.deploymentnumber, tbd.deployment
     ORDER BY tbd.project, d.deploymentnumber
)
SELECT * FROM status_by_deployment WHERE programid=$1;
`;

const STATUS_BY_TB = `
WITH latest_deployments AS (
    WITH ld_tbs AS (SELECT DISTINCT project, talkingbookid, MAX(deployedtimestamp) AS latest
        FROM tbsdeployed WHERE deployedtimestamp>'2020-01-01' AND NOT testing GROUP BY project, talkingbookid)
    SELECT ld_tba.project, NULLIF(ld_tba.recipientid, '') as recipientid, ld_tba.talkingbookid, ld_tba.deployment as latest_deployment, d.deploymentnumber as deployment_num, ld_tb.latest as deployment_time, ld_tba.username as deployment_user
      FROM tbsdeployed ld_tba
      JOIN ld_tbs ld_tb
        ON ld_tb.project=ld_tba.project AND ld_tb.talkingbookid=ld_tba.talkingbookid AND ld_tb.latest=ld_tba.deployedtimestamp
      JOIN deployments d
        ON d.deployment=ld_tba.deployment
), latest_collections AS (
    WITH lc_tbs AS (SELECT DISTINCT project, talkingbookid, MAX(collectedtimestamp) AS latest
        FROM tbscollected WHERE collectedtimestamp>'2020-01-01' AND NOT testing GROUP BY project, talkingbookid)
    SELECT lc_tba.project, NULLIF(lc_tba.recipientid, '') as recipientid, lc_tba.talkingbookid, lc_tba.deployment as latest_collection, d.deploymentnumber as collection_num, lc_tb.latest as collection_time, lc_tba.username as collection_user
      FROM tbscollected lc_tba
      JOIN lc_tbs lc_tb
        ON lc_tb.project=lc_tba.project AND lc_tb.talkingbookid=lc_tba.talkingbookid AND lc_tb.latest=lc_tba.collectedtimestamp
      JOIN deployments d
        ON d.deployment=lc_tba.deployment
),status_by_tb AS (
    WITH tb_details as (SELECT COALESCE(l1.project, l2.project) as programid, COALESCE(l1.recipientid,
            l2.recipientid) as recipientid, COALESCE(l1.talkingbookid, l2.talkingbookid) as talkingbookid,
            l1.latest_deployment, l1.deployment_num, l1.deployment_time::date, l1.deployment_user,
            l2.latest_collection, l2.collection_num, l2.collection_time::date, l2.collection_user
      FROM latest_deployments l1
      FULL OUTER JOIN latest_collections l2
                   ON l1.recipientid=l2.recipientid AND l1.talkingbookid=l2.talkingbookid
      WHERE l1.recipientid != '' or l2.recipientid != ''
     --WHERE NOT l1.testing AND NOT l2.testing
     )
    SELECT r.region, r.district, r.communityname, r.groupname, r.agent, r.language, tbd.*
      FROM tb_details tbd
      JOIN recipients r
        ON tbd.recipientid=r.recipientid
)
SELECT * FROM status_by_tb WHERE programid=$1
 ORDER BY region, district, communityname, groupname, agent, language, talkingbookid
`;

@Injectable()
export class TalkingBookAnalyticsService {
  async status_by_deployment(programid: string) {
    return Deployment.query(STATUS_BY_DEPLOYMENT, [programid]);
  }
  async status_by_tb(programid: string) {
    return Deployment.query(STATUS_BY_TB, [programid]);
  }

  async summaries(programId: string, dto: SummaryAnalyticsQueryDto) {
    let filter = { recipient: [] as string[], tbsdeployed: [] as string[], usg: [] as string[] }
    if (dto.community) {
      filter.recipient.push(`r.communityname = '${dto.community}'`)
      filter.usg.push(` usg.communityname = '${dto.community}'`)
    }
    if (dto.language) {
      filter.recipient.push(` r.language = '${dto.language}'`)
      filter.usg.push(` usg.language = '${dto.language}'`)
    }
    if (dto.deployment) {
      filter.usg.push(` usg.deploymentnumber = '${dto.deployment}'`)
      filter.tbsdeployed.push(` tbd.deployment = '${dto.deployment_name}'`)
    }
    if (dto.district) {
      filter.usg.push(` usg.district = '${dto.district}'`)
      filter.recipient.push(` r.district = '${dto.district}'`)
    }
    if (dto.playlist) {
      filter.usg.push(` usg.playlist = '${dto.playlist}'`)
    }

    const f_recipient = filter.recipient.length == 0 ? '' : ` AND ${filter.recipient.join(' AND ')}`
    const f_tbsdeployed = filter.tbsdeployed.length == 0 ? '' : ` AND ${filter.tbsdeployed.join(' AND ')}`
    const f_usage = filter.usg.length == 0 ? '' : ` AND ${filter.usg.join(' AND ')}`


    const [tbs] = await TalkingBookDeployed.query(
      `
     WITH active_tbs AS (
        SELECT SUM(numtbs) AS "project_tbs" FROM recipients r
        WHERE project = '${programId}' ${f_recipient}
    ),
    usage AS (
        SELECT COUNT(DISTINCT usg.message) AS "total_messages", (SUM(usg.total_seconds_played) / 60) AS "minutes_played"
        FROM tableau_standard_usage2 usg
        WHERE project = '${programId}' ${f_usage}
    ),
    installed_tbs AS (
        SELECT
          COUNT(DISTINCT tbd.talkingbookid ) AS "installed",
          COUNT(distinct ps.stats_timestamp) AS "reporting_stats"
        FROM tbsdeployed tbd
        JOIN recipients r ON tbd.recipientid = r.recipientid
        JOIN deployments d ON tbd.deployment = d.deployment
        LEFT JOIN playstatistics ps ON tbd.talkingbookid = ps.talkingbookid AND tbd.deployment = ps.deployment AND tbd.recipientid = ps.recipientid AND tbd.deployedtimestamp = ps.deployment_timestamp
        WHERE tbd.project = '${programId}' ${f_tbsdeployed}
    )
    SELECT  it.installed, it.reporting_stats, usage.*, active_tbs.*
    FROM installed_tbs it, usage, active_tbs
    `);

    const content = await TalkingBookDeployed.query(
      `
      SELECT deploymentnumber   as "Deployment #"
        ,message            as "Message"
        ,language           as "Language"
        ,format             as "Format"
        ,playlist           as "Playlist"
        ,position           as "Position"
        ,SUM(duration_seconds)   as "Duration"
      FROM tableau_standard_usage2 usg
      WHERE project='${programId}' ${f_usage}
      GROUP BY deploymentnumber, message, language, format, position, playlist
      ORDER BY playlist, message
    `);
    const recipients = await TalkingBookDeployed.query(
      `
      SELECT
        r.recipientid AS id, r.region, r.groupname AS "group_name", r.district,
        r.communityname AS "community_name", r.latitude AS "latitude",
        r.longitude AS "longitude", r.numtbs,
      ui.deploymentnumber AS "Deployment Number",
      sum(ui.played_seconds) AS "played_seconds",
      sum(ui.played_seconds) / 60 AS "played_minutes"
      FROM recipients r
      LEFT JOIN usage_info ui
      on r.recipientid = ui.recipientid
      WHERE R.project = '${programId}' ${f_recipient}
      GROUP BY r.country, r.region, r.district,r.communityname,r.latitude,
        r.longitude,r.numtbs,ui.deploymentnumber, r.recipientid,
        r.groupname
    `
    );
    const operations = await TalkingBookDeployed.query(
      `
      SELECT tbd.talkingbookid AS "TB",
      r.region AS "Region",
      r.district AS "District",
      r.communityname AS "Community",
      r.agent AS "Agent",
      d.deploymentnumber AS "Deployment",
      d.startdate AS "Start Date",
      TO_CHAR(tbd.deployedtimestamp, 'Mon DD, YYYY') AS "Install Date",
      --date_trunc('second',tbd.deployedtimestamp::time) AS "Install Time",
      TO_CHAR(MAX(ps.stats_timestamp), 'Mon DD, YYYY') AS "Date of Latest Stats",
      date_trunc('second',max(ps.stats_timestamp)::time) AS "Time of Latest Stats",
      count(distinct ps.stats_timestamp) AS "# of Times Stats Collected"
      FROM tbsdeployed tbd
      JOIN recipients r ON tbd.recipientid = r.recipientid
      JOIN deployments d ON tbd.deployment = d.deployment
      LEFT JOIN playstatistics ps ON tbd.talkingbookid = ps.talkingbookid AND tbd.deployment = ps.deployment AND tbd.recipientid = ps.recipientid AND tbd.deployedtimestamp = ps.deployment_timestamp
      WHERE tbd.project = $1 ${f_tbsdeployed}
      GROUP BY tbd.talkingbookid, r.region, r.district, r.communityname, r.agent, d.deploymentnumber, d.startdate, tbd.deployedtimestamp
      ORDER BY tbd.talkingbookid,d.deploymentnumber,r.communityname
    `,
      [programId],
    );
    const usage = await TalkingBookDeployed.query(
      `
    SELECT
      COUNT(talkingbookid) AS "tbs",
      message            as "Message"
      ,playlist           as "Playlist"
      ,SUM(total_starts)       as "Total Starts"
      ,SUM(total_quarter)      as "Total 1/4 Plays"
      ,SUM(total_half)         as "Total 1/2 Plays"
      ,SUM(total_threequarters) as "Total 3/4 Plays"
      ,SUM(total_completions)  as "Total Completions"
      ,SUM(total_plays)        as "Total Plays"
      ,SUM(total_seconds_played) as "Total Seconds Played"
    FROM tableau_standard_usage2 usg
    WHERE project = $1  ${f_usage}
    GROUP BY message, playlist
    ORDER BY message, playlist
    `,
      [programId],
    );

    return {
      tbs: tbs,
      map: {
        data: recipients,
        centroid: this.calculateCentroid(
          recipients.map((r) => [r.latitude, r.longitude]),
        ),
      },
      content: content,
      operations: operations,
      usage,
    };
  }

  private calculateCentroid(coordinates: [number, number][]): {
    latitude: number;
    longitude: number;
  } {
    const toDegrees = (radians: number): number => radians * (180 / Math.PI);

    const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

    // Convert latitude and longitude from degrees to radians
    const latitudes = coordinates.map((coord) => toRadians(coord[0]));
    const longitudes = coordinates.map((coord) => toRadians(coord[1]));

    // Compute the average of the coordinates
    const avgLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length;
    const avgLon = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;

    // Convert the average coordinates back to degrees
    const centroidLat = toDegrees(avgLat);
    const centroidLon = toDegrees(avgLon);

    return { latitude: centroidLat, longitude: centroidLon };
  }
}
