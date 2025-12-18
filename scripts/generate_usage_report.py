from database import get_db
import sqlalchemy as sa


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
    headers: dict[str, list[str]] = {}
    for c in contents:
        headers[c[0]] = []

    print(headers)
    # results = db.execute(
    #     sa.text(
    #         """
    #     SELECT SUM(ps.played_seconds)/60 AS played_munites, r.communityname, r.district, r.groupname, c.title FROM playstatistics ps
    #     INNER JOIN recipients r ON r.recipientid = ps.recipientid
    #     INNER JOIN contentmetadata2 c ON c.contentid = ps.contentid
    #             WHERE ps.deployment = 'TS-KENYA-25-1' AND ps.timestamp::date >= '2025-10-03'
    #                 AND ps.timestamp::date <= '2025-10-23' AND ps.contentid != 'LB-2_2vcgpwb573_2l'
    #     GROUP BY r.communityname, r.district, r.groupname, c.title;
    #         """
    #     ),
    # ).fetchall()
    # print(results)
    pass


if __name__ == "__main__":
    run()
