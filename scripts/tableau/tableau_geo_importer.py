# Imports recipients geo location data from a csv file and updates the
# latitude and longitude columns in the database
#
# To generate the csv file, follow the steps below:
#   1. Open the geo_location_template.xslx workbook
#   2. Update the project, country, region, district, communityname, latitude & longitude columns
#   3. Save the workbook as a csv file
#   4. Run the script, with path to the csv file as an argument
#
# Execute the script as follows:
# PYTHONPATH=src python scripts/tableau/tableau_geo_importer.py path/to/file.csv

import csv
import sys

from sqlalchemy import text

from database import get_db


def import_geo_data(csv_file_path: str):
    with open(csv_file_path, mode="r") as csv_file:
        db = next(get_db())
        csv_reader = csv.DictReader(csv_file)
        line_count = 0

        for row in csv_reader:
            if line_count == 0:
                line_count += 1
                continue

            if (
                row["latitude"] is None
                or row["latitude"] == ""
                or row["longitude"] is None
                or row["longitude"] == ""
            ):
                continue

            filter_query: str = row["FILTER"]
            update_query: str = row["RUN THESE STATEMENTS"]
            count_query: str = (
                f"SELECT count(*) FROM recipients WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND {filter_query}"
            )

            # We're probably on the last row
            if filter_query is None or filter_query == "":
                continue

            # affected_rows = db.scalar(text(count_query))
            # if affected_rows >= 0:
            #     print(
            #         f"Skipping {line_count} because {affected_rows} rows are already populated."
            #     )
            #     continue

            # Update coordinates
            db.execute(text(update_query))
            db.commit()

            line_count += 1

        print(f"Processed {line_count} rows.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please provide the path to the CSV file as a command-line argument.")
        sys.exit(1)

    csv_file_path = sys.argv[1]

    import_geo_data(csv_file_path)
