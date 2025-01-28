import { Injectable } from "@nestjs/common";
import { Deployment } from "src/entities/deployment.entity";
import { TalkingBookDeployed } from "src/entities/tb_deployed.entity";

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

	async summaries(programId: string) {
		const [tbs] = await TalkingBookDeployed.query(
			`
      SELECT COUNT(tbd.talkingbookid) AS "tbs"
      FROM tbsdeployed tbd
      JOIN recipients r ON tbd.recipientid = r.recipientid
      JOIN deployments d ON tbd.deployment = d.deployment
      WHERE tbd.project = $1
      GROUP BY tbd.talkingbookid
    `,
			[programId],
		);

		const recipients = await TalkingBookDeployed.query(
			`
      SELECT r.recipientid AS id, r.region, r.groupname AS "group_name", r.district,
       r.communityname AS "community_name", r.latitude AS "latitude",
        r.longitude AS "longitude", r.numtbs,
      ui.deploymentnumber AS "Deployment Number",
      sum(ui.played_seconds) AS "played_seconds",
      sum(ui.played_seconds) / 60 AS "played_minutes"
      FROM recipients r
      LEFT JOIN usage_info ui
      on r.recipientid = ui.recipientid
      WHERE R.project = $1
      GROUP BY r.country,r.region,r.district,r.communityname,r.latitude,
        r.longitude,r.numtbs,ui.deploymentnumber, r.recipientid,
        r.groupname
    `,
			[programId],
		);

		return {
			tbsCount: tbs,
			map: {
				data: recipients,
				centroid: this.calculateCentroid(
					recipients.map((r) => [r.latitude, r.longitude]),
				),
			},
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

	// Example usage
	// const coordinates: [number, number][] = [
	//     [37.7749, -122.4194], // San Francisco, CA
	//     [34.0522, -118.2437], // Los Angeles, CA
	//     [40.7128, -74.0060],  // New York, NY
	//     [41.8781, -87.6298]   // Chicago, IL
	// ];

	// const centroid = calculateCentroid(coordinates);
	// console.log(`The centroid is at latitude: ${centroid[0]}, longitude: ${centroid[1]}`);
}
