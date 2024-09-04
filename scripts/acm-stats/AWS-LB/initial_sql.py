from sqlalchemy import text

from database import get_db


def run_query():
    db = next(get_db())
    query = """
    --This takes 30-45 minutes

    -- update case in these smaller tables
    UPDATE categoriesinpackage
    SET contentpackage = UPPER(contentpackage),
    project = UPPER(project);

    UPDATE contentinpackage
    SET contentpackage = UPPER(contentpackage),
    project = UPPER(project);


    UPDATE packagesindeployment
    SET contentpackage = UPPER(contentpackage),
    deployment = UPPER(deployment),
    project = UPPER(project);

    UPDATE surveyevents
    SET packageid = UPPER(packageid);

    UPDATE recordevents
    SET packageid = UPPER(packageid);

    UPDATE tbdataoperations
    SET outimage=UPPER(outimage),
    inimage=UPPER(inimage);


    DELETE FROM tbcollections;
    --insert into tbcollections
    --(select distinct contentpackage,village,talkingbook from syncaggregation
    --union
    --select distinct packageid as contentpackage,village,talkingbookid as talkingbook from playedevents);


    DELETE FROM allsources_s;
    --insert into allsources_s select * from allsources;
    """

    db.execute(text(query))


if __name__ == "__main__":
    main()
