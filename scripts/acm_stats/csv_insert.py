#!/usr/bin/env bash

import argparse
import csv
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import boto3 as boto3
from sqlalchemy import MetaData, Table, text
from sqlalchemy.sql import TableClause

from database import get_db, get_table_metadata
from utilities.argparse_utils import StorePathAction

# noinspection PyTypeChecker
_args: argparse.Namespace = None  # type: ignore


class CsvInsert:
    def __init__(self, table, **kwargs):
        """
        :param table: the name of the table into which the contents should be inserted.

        :param kwargs: A list of options. Available options:
        :param separate: if True, insert each file as a separate transaction.
        :param verbose: how verbose to be. Higher number means more verbose.
        :param dry_run: if True, rollback the transaction rather than committing it. Allows
            checking the contents for proper form.
        :param c2ll: "Coordinates-To-Latitude-Longitude": a list of tuples where each
            tuple consists of three names. The first name is a "coordinate" field
            ("(1.2354,-10.0987)"), and the next two are the names of latitude
            and longitude fields. The coordinate field is parsed into latitude and
            longitude. What gets inserted depends on the table schema, but this
            allows inserting a coordinate field as latitude and longitude.
            If present, empty coordinate fields are transformed into None, which inserts
            as null. Otherwise the sql alchemy & pg8000 won't be able to insert an
            empty coordinate.

        :param kwargs:
        :type kwargs:
        """
        self._table = table
        self._verbose = kwargs.get("verbose")
        self._separate = kwargs.get("separate")
        self._upsert = kwargs.get("upsert")
        self._dry_run = kwargs.get("dry_run")
        self._c2ll = kwargs.get("c2ll")
        self.db = next(get_db())

    def get_table_metadata(self, table: str):
        return get_table_metadata(table)

        # # noinspection PyTypeChecker
        # table_meta = MetaData()
        # table_def: TableClause = Table(table, table_meta, autoload=True)

        # #     "tbdeployments_pkey" PRIMARY KEY, btree (talkingbookid, deployedtimestamp)
        # return table_def

    # noinspection SqlDialectInspection
    def make_insert(self, metadata):
        columns = [x.name for x in metadata.columns]
        # noinspection SqlNoDataSourceInspection
        command_str = (
            f'INSERT INTO {metadata.name} ({",".join(columns)}) '
            f'VALUES (:{",:".join(columns)}) '
        )
        conflict_str = "ON CONFLICT DO NOTHING"

        if self._upsert and metadata.primary_key:
            # ON CONFLICT ON CONSTRAINT pky_name DO
            #     UPDATE SET
            #       c1=EXCLUDED.c1,
            #       c2=EXCLUDED.c2,
            #       -- for all non-pkey columns
            pkey_name = metadata.primary_key.name
            pkey_columns = [x.name for x in metadata.primary_key.columns]
            non_pkey_columns = [x for x in columns if x not in pkey_columns]
            if non_pkey_columns:
                conflict_str = f"ON CONFLICT ON CONSTRAINT {pkey_name} DO UPDATE SET "
                setters = [f"{x}=EXCLUDED.{x}" for x in non_pkey_columns]
                conflict_str += ",".join(setters)
        command_str += conflict_str + ";"
        return text(command_str)

    # Recognizes (+1.234,-56.789)
    COORD_RE = re.compile(r'"?\((?P<lat>[+-]?[0-9.]+),(?P<lon>[+-]?[0-9.]+)\)"?')

    def insert_file(
        self,
        csv_path: Path,
        command,
        columns: List[str],
        nullables: List[str],
        connection,
    ):
        def tr_c2ll(row: Dict) -> Dict:
            """
            Look for columns that are mentioned in the --c2ll option. Any found, convert to the
            provided latitude/longitude columns.
            :param row: Row of data to be rocessed.
            :return: The row, possibly updated with coordinates->latitude/longitude
            """
            if self._c2ll:
                # translate coordinates->latitude/longitude
                for coord, lat, lon in self._c2ll:
                    if c_val := row.get(coord):
                        if match := self.COORD_RE.match(c_val):
                            row[lat] = match["lat"]
                            row[lon] = match["lon"]
                    else:
                        # Empty 'coordinates' field; must be inserted as None to be parseable.
                        row[coord] = None
            # add 'None' values for columns missing from csv file
            row = row | {c: None for c in columns if c not in row}
            for c in columns:
                if c not in row or (
                    row[c] is not None and c in nullables and len(row[c]) == 0
                ):
                    row[c] = None
            return row

        with csv_path.open(newline="") as csvfile:
            reader = csv.DictReader(csvfile)
            rows = [tr_c2ll(row) for row in reader]

        if len(rows) > 0:
            result = connection.execute(command, rows)
            print(
                f'{result.rowcount} rows inserted{"/updated" if self._upsert else ""} from {str(csv_path)}.'
            )
        else:
            print(f"File {str(csv_path)} is empty.")

    def insert_files(self, paths: List[Path]):
        """
        Insert the contents of one or more .csv files into the given table.
        :param paths: a list of Path() objects identifying the .csv files to be in serted.
        :return: None
        """
        if (metadata := self.get_table_metadata(self._table)) is None:
            raise Exception(f"Table {self._table} does not seem to exist.")
        columns: List[str] = [x.name for x in metadata.columns]
        nullables: List[str] = [x.name for x in metadata.columns if x.nullable]
        print(metadata)
        commit = not self._dry_run
        command = self.make_insert(metadata)

        remaining = [x for x in paths]
        while len(remaining) > 0:
            transaction = self.db.begin()
            while len(remaining) > 0:
                path = remaining.pop(0)
                self.insert_file(path, command, columns, nullables, self.db)
                if self._separate:
                    break
            if commit:
                transaction.commit()
                print(f"Changes commited for {self._table}")
            else:
                transaction.rollback()
                print(f"Changes rolled back for {self._table}")


def parse_c2ll(args) -> Optional[List[Tuple]]:
    c2ll = []
    if args.c2ll is not None:
        if len(args.c2ll) % 3 != 0:
            print(
                "--c2ll must provide sets of three names: from->to,to", file=sys.stderr
            )
            sys.exit(1)
        if len(args.c2ll) == 0:
            c2ll = [("coordinates", "latitude", "longitude")]
        else:
            c2ll = [
                (args.c2ll[x], args.c2ll[x + 1], args.c2ll[x + 2])
                for x in range(0, len(args.c2ll), 3)
            ]
    return c2ll


def go(args):
    global _args
    _args = args

    c2ll = parse_c2ll(_args)
    csv_insert = CsvInsert(
        table=args.table,
        verbose=args.verbose,
        separate=args.separate,
        upsert=args.upsert,
        dry_run=args.dry_run,
        c2ll=c2ll,
    )
    csv_insert.insert_files(_args.files)


def main():
    global args

    arg_parser = argparse.ArgumentParser(
        description="Import CSV into SQL, with column matching."
    )
    arg_parser.add_argument(
        "--verbose", action="count", default=0, help="More verbose output."
    )

    arg_parser.add_argument(
        "--table", action="store", help="Table into which to insert."
    )
    arg_parser.add_argument(
        "--separate", "-s", action="store_true", help="Insert each file independently."
    )
    arg_parser.add_argument(
        "--upsert",
        "-u",
        action="store_true",
        help="On pkey conflict update non-pkey fields.",
    )
    arg_parser.add_argument(
        "--c2ll",
        action="store",
        nargs="*",
        help="Convert a coordinate field to latitude,longitude.",
    )

    arg_parser.add_argument(
        "--dry-run",
        "--dryrun",
        "-n",
        action="store_true",
        help="Dry run, do not update (abort transaction at end).",
    )

    arg_parser.add_argument(
        "--files",
        nargs="*",
        action=StorePathAction,
        glob=True,
        help="Files(s) to insert.",
    )

    arglist = None
    ######################################################
    #
    #
    # arglist = sys.argv[1:] + ['--db-host', 'localhost']
    #
    #
    ######################################################

    args = arg_parser.parse_args(arglist)

    go(args)


# Press the green button in the gutter to run the script.
if __name__ == "__main__":
    main()
