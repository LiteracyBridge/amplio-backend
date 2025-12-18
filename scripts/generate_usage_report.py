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

    # print(contents)
    headers: list[str] = [c[0] for c in contents]
    # for c in contents:
    #     headers[c[0]] = []

    # print(headers)
    # with open('eggs.csv', 'w', newline='') as csvfile:
    #     spamwriter = csv.writer(csvfile, delimiter=' ',
    #                             quotechar='|', quoting=csv.QUOTE_MINIMAL)
    #     spamwriter.writerow(['Spam'] * 5 + ['Baked Beans'])
    #     spamwriter.writerow(['Spam', 'Lovely Spam', 'Wonderful Spam'])

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
    # print(results)

    # Write rows
    # for item in results:
    size = len(statistics)
    idx = 0
    csv_rows: list[list[str | int | float]] = []
    while True:
        if len(statistics) == 0:
            break

        stats = statistics[0]
        # size:int =  len(item) + len(headers)
        row: list[str | int | float] = [stats[i] for i in range(0, 4)]

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
            # print(duration, results)

            for x in results:
                statistics.remove(x)
            # pass
        csv_rows.append(row)

    # Create csv file
    with open("report.csv", "w", newline="") as csvfile:
        writer = csv.writer(
            csvfile,
        )  # delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)

        # Write header
        writer.writerow(
            ["#", "Region", "District", "Community", "Group Name"] + headers
        )
        for idx, row in enumerate(csv_rows):
            writer.writerow([idx + 1] + row)
        # :

        # writer.writerow(['Spam'] * 5 + ['Baked Beans'])
        # writer.writerow(['Spam', 'Lovely Spam', 'Wonderful Spam'])
        #     print(len(row), row)
        # # for i in range(0, size):
        #     pass
    pass


if __name__ == "__main__":
    run()
