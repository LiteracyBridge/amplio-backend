from database import get_db
import sqlalchemy as sa
import csv


def run():
    db = next(get_db())

    contents = db.execute(
        sa.text(
            """
        SELECT  c.title FROM contentmetadata2 c
        INNER JOIN playstatistics ps ON c.contentid = ps.contentid
                AND ps.deployment = 'TS-KENYA-25-1' AND ps.timestamp::date >= '2025-10-03'
                AND ps.timestamp::date <= '2025-10-23' AND ps.contentid != 'LB-2_2vcgpwb573_2l'
        GROUP BY c.title;
    """
        )
    ).fetchall()

    headers: list[str] = [c[0] for c in contents]

    statistics = db.execute(
        sa.text(
            """
        SELECT r.region,  r.district, r.communityname, r.groupname, c.title,
             SUM(ps.played_seconds)/60 AS played_minutes
        FROM playstatistics ps
        INNER JOIN recipients r ON r.recipientid = ps.recipientid
        INNER JOIN contentmetadata2 c ON c.contentid = ps.contentid
                WHERE ps.deployment = 'TS-KENYA-25-1' AND ps.timestamp::date >= '2025-10-03'
                    AND ps.timestamp::date <= '2025-10-23' AND ps.contentid != 'LB-2_2vcgpwb573_2l'
        GROUP BY r.communityname, r.district, r.groupname, r.region, c.title;
            """
        ),
    ).fetchall()
    statistics = list(statistics)

    csv_rows: list[list[str | int | float]] = []
    while True:
        if len(statistics) == 0:
            break

        stats = statistics[0]
        row: list[str | int | float] = [stats[i] for i in range(0, 4)]

        # Summary listening duration for each group
        for title in headers:
            results = list(
                filter(
                    lambda x: x[0] == stats[0]
                    and x[1] == stats[1]
                    and x[2] == stats[2]
                    and x[3] == stats[3]
                    and x[4] == title,
                    statistics,
                )
            )
            duration = sum(x[5] for x in results)
            row.append(round(duration / 60))

            for x in results:
                statistics.remove(x)

        csv_rows.append(row)

    # Create csv file
    with open("report.csv", "w", newline="") as csvfile:
        writer = csv.writer(
            csvfile,
        )

        # Write header
        writer.writerow(
            ["#", "Region", "District", "Community", "Group Name"] + headers
        )
        for idx, row in enumerate(csv_rows):
            writer.writerow([idx + 1] + row)


if __name__ == "__main__":
    run()
