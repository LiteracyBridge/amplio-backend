from database import get_db
import sqlalchemy as sa
import csv


def completions_report():
    start_date = "2025-02-01"
    end_date = "2026-01-04"

    db = next(get_db())

    contents = db.execute(
        sa.text(
            f"""
        SELECT  to_char(u.timestamp, 'Month') AS month FROM usage_info u
        WHERE u.deployment = 'TS-KENYA-26-2' AND u.timestamp::date >= '{start_date}'
                AND u.timestamp::date <= '{end_date}' AND u.contentid != 'LB-2_2vcgpwb573_2l'
        GROUP BY month;
    """
        )
    ).fetchall()

    headers: list[str] = ["Message"]
    for c in contents:
        headers.append(f"{c[0]} Minutes")
        headers.append(f"{c[0]} Completions")

    statistics = db.execute(
        sa.text(
            f"""
        SELECT c.title,
             SUM(ps.played_seconds)/60 AS played_minutes,
             SUM(ps.completions) AS completions,
             to_char(ps.timestamp, 'Month') AS month
        FROM usage_info ps
        INNER JOIN recipients r ON r.recipientid = ps.recipientid
        INNER JOIN contentmetadata2 c ON c.contentid = ps.contentid
        WHERE ps.deployment = 'TS-KENYA-26-2' AND ps.timestamp::date >= '{start_date}'
            AND ps.timestamp::date <= '{end_date}' AND ps.contentid != 'LB-2_2vcgpwb573_2l'
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

        stats = statistics[0]
        row: list[str | int | float] = [0 for _ in range(len(headers))]

        # Summary listening duration for each group
        results = list(
            filter(
                lambda x: x[0] == stats[0],
                statistics,
            )
        )

        row[0] = stats[0]  # title
        for idx, month in enumerate([c[0] for c in contents]):
            rs = list(
                filter(
                    lambda x: x[3] == month,
                    results,
                )
            )

            for _, y in enumerate(rs):
                _pos = idx + idx
                row[_pos + 1] = y[1]  # minutes
                row[_pos + 2] = y[2]  # completions

        for x in results:
            statistics.remove(x)

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


def run():
    start_date = "2025-11-14"
    end_date = "2026-01-04"

    db = next(get_db())

    contents = db.execute(
        sa.text(
            f"""
        SELECT  c.title FROM contentmetadata2 c
        INNER JOIN playstatistics ps ON c.contentid = ps.contentid
                AND ps.deployment = 'TS-KENYA-26-2' AND ps.timestamp::date >= '{start_date}'
                AND ps.timestamp::date <= '{end_date}' AND ps.contentid != 'LB-2_2vcgpwb573_2l'
        GROUP BY c.title;
    """
        )
    ).fetchall()

    headers: list[str] = [c[0] for c in contents]

    statistics = db.execute(
        sa.text(
            f"""
        SELECT r.region,  r.district, r.communityname, r.groupname, c.title,
             SUM(ps.played_seconds)/60 AS played_minutes
        FROM playstatistics ps
        INNER JOIN recipients r ON r.recipientid = ps.recipientid
        INNER JOIN contentmetadata2 c ON c.contentid = ps.contentid
        WHERE ps.deployment = 'TS-KENYA-26-2' AND ps.timestamp::date >= '{start_date}'
            AND ps.timestamp::date <= '{end_date}' AND ps.contentid != 'LB-2_2vcgpwb573_2l'
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
            row.append(duration)

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
    completions_report()
