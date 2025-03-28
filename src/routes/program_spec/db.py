from contextlib import contextmanager
from typing import Optional, Any

import boto3 as boto3
from botocore.exceptions import ClientError
from sqlalchemy import Connection, create_engine, text, MetaData, Table
from sqlalchemy.engine import Engine
from sqlalchemy.sql import TableClause
from config import config

_engine: Optional[Engine] = None
_args: Optional[Any] = None


def _ensure_content_view(engine=None, connection: Optional[Connection] = None):
    v3 = """
        create or replace temp view content as
            select depl.project as project
                    ,depl.id as deployment_id
                    ,depl.deploymentnumber::integer as deployment_num
                    ,depl.startdate as deployment_startdate
                    ,depl.enddate as deployment_enddate
                    ,depl.deployment as deployment
                    ,depl.deploymentname as deployment_name
                    ,depl.deployment in (select distinct deployment from tbsdeployed where project=depl.project) as deployed
                    ,pl.title as playlist_title
                    ,pl.position as playlist_pos
                    ,pl.id as playlist_id
                    ,msg.title as message_title
                    ,msg.position as message_pos
                    ,msg.id as message_id
                    ,msg.key_points
                    ,scat.fullname as default_category
                    ,msg.format
                    ,pl.audience
                    ,msg.variant
                    ,sdg.sdg_goal_id as sdg_goals
                    ,sdt.sdg_target_id as sdg_targets
                    ,STRING_AGG(distinct ml.language_code, ',') as languagecode

            from deployments depl
            left outer join playlists pl
              on pl.deployment_id = depl.id
            left outer join messages msg
              on pl.program_id = msg.program_id AND msg.playlist_id = pl.id
            left outer join sdg_goals sdg
              on msg.sdg_goal_id = sdg.sdg_goal_id
            left outer join sdg_targets sdt
              on msg.sdg_target = sdt.sdg_target and msg.sdg_goal_id = sdt.sdg_goal_id
            left outer join message_languages ml
              on ml.message_id = msg.id
            left outer join supportedcategories scat
              on msg.default_category_code = scat.categorycode

            group by depl.project
                    ,depl.deploymentnumber
                    ,depl.id
                    ,pl.position
                    ,pl.title
                    ,pl.id
                    ,msg.position
                    ,msg.title
                    ,msg.id
                    ,msg.key_points
                    ,scat.fullname
                    ,msg.format
                    ,pl.audience
                    ,msg.variant
                    ,sdg.sdg_goal_id
                    ,sdt.sdg_target_id


            order by depl.project, depl.deploymentnumber, pl.position, msg.position;
    """
    v3_new = """
        create or replace temp view content as
            select depl.project as project
                    ,depl.deploymentnumber::integer as deployment_num
                    ,depl.startdate as deployment_startdate
                    ,depl.enddate as deployment_enddate
                    ,depl.deployment as deployment
                    ,depl.deploymentname as deployment_name
                    ,depl.deployment in (select distinct deployment from tbsdeployed where project=depl.project) as deployed
                    ,pl.title as playlist_title
                    ,pl.position as playlist_pos
                    ,pl.id as playlist_id
                    ,msg.title as message_title
                    ,msg.position as message_pos
                    ,msg.id as message_id
                    ,msg.key_points
                    ,scat.fullname as default_category
                    ,msg.format
                    ,msg.audience
                    ,msg.variant
                    ,sdg.sdg_goal_id as sdg_goals
                    ,sdt.sdg_target_id as sdg_targets
                    ,msg.languages as languagecode

            from deployments depl
            left outer join playlists pl
              on pl.deploymentnumber = depl.deploymentnumber AND pl.program_id=depl.project
            left outer join messages msg
              on pl.program_id = msg.program_id AND msg.playlist_id = pl.id
            left outer join sdg_goals sdg
              on msg.sdg_goal_id = sdg.sdg_goal_id
            left outer join sdg_targets sdt
              on msg.sdg_target = sdt.sdg_target and msg.sdg_goal_id = sdt.sdg_goal_id
            left outer join supportedcategories scat
              on msg.default_category_code = scat.categorycode

            group by depl.project
                    ,depl.deploymentnumber
                    ,pl.position
                    ,pl.title
                    ,pl.id
                    ,msg.position
                    ,msg.title
                    ,msg.id
                    ,msg.key_points
                    ,scat.fullname
                    ,msg.format
                    ,msg.audience
                    ,msg.variant
                    ,sdg.sdg_goal_id
                    ,sdt.sdg_target_id
                    ,msg.languages

            order by depl.project, depl.deploymentnumber, pl.position, msg.position;
    """
    q = """select distinct project from content;"""
    global _engine
    if engine is None:
        engine = _engine
    is_new = table_has_column("messages", "audience", engine=engine)
    content_view = v3_new if is_new else v3
    try:
        if connection is not None:
            result = connection.execute(text(content_view))
        else:
            with engine.connect() as conn:
                result = conn.execute(text(content_view))
        print(f"(Re)established content view, is_new: {is_new}, {result}.")
    except Exception as ex:
        print(ex)


@contextmanager
def get_db_connection(*, close_with_result=None, engine=None):
    """
    A helper to get a db connection and re-establish the 'content' view after a commit or abort.
    :param close_with_result: If present, passed through to the engine.connect() call.
    :param engine: Optional engine to use for the call. Default is _engine.
    :return: Provides a Connection through a context manager.
    """
    if engine is None:
        engine = _engine
    kwargs = {}
    if close_with_result is not None:
        kwargs["close_with_result"] = close_with_result
    try:
        with engine.connect(**kwargs) as conn:
            yield conn
    finally:
        pass
    #     _ensure_content_view(engine)


# lazy initialized db connection


# Make a connection to the SQL database
def get_db_engine(args=None) -> Engine:
    global _engine, _args

    if _engine is not None:
        print("Reusing db engine.")
        _ensure_content_view(_engine)
    elif _engine is None:
        _args = args
        # secret = _get_secret()

        parms = {
            "database": config.db_name,
            "user": config.db_user,
            "password": config.db_password,
            "host": config.db_host,
            "port": config.db_port,
        }
        for prop in ["host", "port", "user", "password", "database"]:
            if hasattr(args, f"db_{prop}"):
                if (val := getattr(args, f"db_{prop}")) is not None:
                    parms[prop] = val

        # dialect + driver: // username: password @ host:port / database
        # postgresql+pg8000://dbuser:kx%25jj5%2Fg@pghost10/appdb
        engine_connection_string = (
            "postgresql+pg8000://{user}:{password}@{host}:{port}/{database}".format(
                **parms
            )
        )
        _engine = create_engine(engine_connection_string, echo=False)

        _ensure_content_view()

    return _engine


_column_cache = {}


def table_has_column(table: str, column: str, engine=None) -> bool:
    global _column_cache, _engine
    if engine is None:
        engine = _engine
    if table in _column_cache:
        columns = _column_cache.get(table)
    else:
        columns = []
        try:
            table_meta = MetaData(engine)
            table_def: TableClause = Table(table, table_meta, autoload=True)
            # noinspection PyTypeChecker
            columns = [c.name for c in table_def.columns]
        except:
            pass
        _column_cache[table] = columns
    return column in columns
