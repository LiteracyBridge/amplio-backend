from typing import Any, Dict, List, Tuple, Union

import boto3 as boto3
import pg8000 as pg8000
from pg8000 import Connection, Cursor
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from UfRecord import UfRecord, uf_column_map

from database import get_db_connection

recipient_cache: Dict[str, Dict[str, str]] = {}
db = get_db_connection()


# noinspection SqlDialectInspection ,SqlNoDataSourceInspection
class DbUtils:
    _instance = None

    # This class is a singleton.
    def __new__(cls, **kwargs):
        if cls._instance is None:
            print("Creating the DbUtils object")
            cls._instance = super(DbUtils, cls).__new__(cls)
            cls._props: List[Tuple] = []
            cls._verbose = kwargs.get("verbose", 0)

        return cls._instance

    @property
    def db_connection(self) -> Session:
        return db

    def query_recipient_info(self, recipientid: str) -> Dict[str, str]:
        """
        Given a recipientid, return information about the recipient. Previously found recipients are
        cached. Non-cached recipients are looked up in the database.
        :param recipientid: to be found.
        :return: a Dict[str,str] of data about the recipient.
        """
        if recipientid in recipient_cache:
            return recipient_cache[recipientid]

        # cursor: Cursor = self.db_connection
        # cursor.paramstyle = "named"

        # { db column : dict key }
        columns = {
            "recipientid": "recipientid",
            "project": "program",
            "partner": "customer",
            "affiliate": "affiliate",
            "country": "country",
            "region": "region",
            "district": "district",
            "communityname": "community",
            "groupname": "group",
            "agent": "agent",
            "language": "language",
            "listening_model": "listening_model",
        }
        # select recipientid, project, ... from recipients where recipientid = '0123abcd4567efgh';
        command = f'select {",".join(columns.keys())} from recipients where recipientid=:recipientid;'
        values = {"recipientid": recipientid}

        recipient_info: Dict[str, str] = {}
        try:
            result_keys: List[str] = list(columns.values())
            response = db.execute(text(command), values)
            for row in response:
                # Copy the recipient info, translating from the database names to the local names.
                for key in result_keys:
                    recipient_info[key] = row[result_keys.index(key)]
        except Exception:
            pass
        recipient_cache[recipientid] = recipient_info
        return recipient_info

    def query_deployment_number(self, program: str, deployment: str):
        command = "select deploymentnumber from deployments where project=:program and deployment=:deployment limit 1;"
        values = {"program": program, "deployment": deployment}

        results = db.execute(text(command), values)
        for row in results:
            return str(row[0])

    def insert_uf_records(self, uf_items: List[Tuple]) -> Any:
        if self._verbose >= 1:
            print(f"Adding {len(uf_items)} records to uf_messages")

        # It doesn't seem that this should be necessary, but it seems to be.
        self.db_connection.rollback()

        columns = list(uf_column_map.keys())
        column_numbers = [f":{ix + 1}" for ix in range(0, len(columns))]

        command = (
            f"INSERT INTO uf_messages "
            f"({', '.join(columns)}) VALUES ({', '.join(column_numbers)})"
            f"ON CONFLICT(message_uuid) DO NOTHING;"
        )
        for uf_item in uf_items:
            db.execute(text(command), uf_item)

        db.commit()
        if self._verbose >= 2:
            print(f"Committed {len(uf_items)} records to uf_messages.")

    def get_uf_records(self, programid: str, deploymentnumber: int) -> List[UfRecord]:
        if self._verbose >= 1:
            print(f"Getting uf records for {programid} / {deploymentnumber}.")

        result = []
        command = (
            f"SELECT "
            + ", ".join(uf_column_map.keys())
            + f" FROM uf_messages WHERE programid=:programid AND deploymentnumber=:deploymentnumber ORDER BY message_uuid;"
        )
        options = {"programid": programid, "deploymentnumber": deploymentnumber}
        response = db.execute(text(command), options)
        for row in response:
            result.append(UfRecord(*row))
        return result

    def update_uf_bundles(
        self, programid: str, deploymentnumber: int, bundles: Dict[str, List[str]]
    ) -> bool:
        """
        Updates the bundle_uuid column of the inidicated messages.
        :param programid: For an extra validation, the record must belong to this program.
        :param deploymentnumber: For an extra validation, the record must belong to this deployment.
        :param bundles: A map of bundle_uuid to list of message_uuid.
        :return: pass/fail
        """
        if self._verbose >= 1:
            print(
                f"Updating uf bundle_uuids for {sum([len(v) for v in bundles.values()])} messages in {programid} / {deploymentnumber}."
            )

        try:
            command = "UPDATE uf_messages SET bundle_uuid=:bundle_uuid WHERE message_uuid=:message_uuid AND programid=:programid AND deploymentnumber=:deploymentnumber;"
            options = {"programid": programid, "deploymentnumber": deploymentnumber}

            for bundle_uuid, messages in bundles.items():
                options["bundle_uuid"] = bundle_uuid
                for message_uuid in messages:
                    options["message_uuid"] = message_uuid
                    db.execute(text(command), options)

            db.commit()

            return True
        except Exception as ex:
            return False
