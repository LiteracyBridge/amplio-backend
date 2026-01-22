from database import get_db
import sqlalchemy as sa
import csv


def completions_report():
    start_date = "2025-11-14"
    end_date = "2026-01-04"

    db = next(get_db())

    contents = db.execute(
        sa.text(
            f"""
        SELECT  EXTRACT(MONTH FROM u.timestamp) AS month FROM usage_info u
        WHERE u.deployment = 'TS-KENYA-26-2' AND u.timestamp::date >= '{start_date}'
                AND u.timestamp::date <= '{end_date}' AND u.contentid != 'LB-2_2vcgpwb573_2l'
        GROUP BY month;
    """
        )
    ).fetchall()

    headers: list[str] = ["Message"]
    for c in contents:
        # headers.append(c[0])
        headers.append(f"{c[0]} Completions")
        headers.append(f"{c[0]} Minutes")

    statistics = db.execute(
        sa.text(
            f"""
        SELECT c.title,
             SUM(ps.played_seconds)/60 AS played_minutes,
             SUM(ps.completions) AS completions,
             EXTRACT(MONTH FROM ps.timestamp) AS month
        FROM usage_info ps
        INNER JOIN recipients r ON r.recipientid = ps.recipientid
        INNER JOIN contentmetadata2 c ON c.contentid = ps.contentid
        WHERE ps.deployment = 'TS-KENYA-26-2' AND ps.timestamp::date >= '{start_date}'
            AND ps.timestamp::date <= '{end_date}' AND ps.contentid != 'LB-2_2vcgpwb573_2l'
            AND ps.completions > 0
        GROUP BY c.title, month;
            """
        ),
    ).fetchall()
    statistics = list(statistics)

    csv_rows: list[list[str | int | float]] = []
    # for x in statistics:
    #     csv_rows.append(x)

    while True:
        if len(statistics) == 0:
            break

        stats = statistics.pop()
        row: list[str | int | float] = []

        # # Summary listening duration for each group
        for idx, month in enumerate([c[0] for c in contents]):
            if stats[3] != month:
                continue

            # results = list(
            #     filter(
            #         lambda x: x[0] == stats[0]
            #         # and x[1] == stats[1]
            #         # and x[2] == stats[2]
            #         # and x[3] == stats[3]
            #         and x[3] == month,
            #         statistics,
            #     )
            # )[0] # Result is only 1 item

            row.append(stats[0])  # title

            # row.append(stats[1]) # minutes
            for y in range(1, idx + 1):
                row.append(0)
            row.append(stats[1])  # minutes

            for y in range(1, (idx * 2) + 1):
                row.append(0)
            row.append(stats[2])  # completions
            # row.append(stats[])
            # print(results)
            print(month)
            # duration = sum(x[5] for x in results)
            # row.append(duration)

            # for x in results:
            #     statistics.remove(x)

        csv_rows.append(row)

    # Create csv file
    with open("completions_report.csv", "w", newline="") as csvfile:
        writer = csv.writer(
            csvfile,
        )

        # Write header
        writer.writerow(headers)
        for idx, row in enumerate(csv_rows):
            writer.writerow(row)
    start_date = "2025-11-14"
    end_date = "2026-01-04"

    db = next(get_db())
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
