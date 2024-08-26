import csv
import io
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from config import ACM_PREFIX


def escape_csv(s: str) -> str:
    if s is None:
        return ""
    if not isinstance(s, str):
        s = str(s)
    # escape a double quote character with another double quote
    if '"' in s:
        s = s.replace('"', '""')
    # If the string contains a newline, a comma, or a double quote (now escaped),
    # enclose the entire string in double quotes.
    if "\n" in s or "\r" in s or "," in s or '"' in s:
        s = f'"{s}"'
    return s


def save_as_csv(csv_dict: dict, csv_path: Path):
    with csv_path.open("w") as csv_file:
        print(",".join([escape_csv(x) for x in csv_dict.keys()]), file=csv_file)
        print(",".join([escape_csv(x) for x in csv_dict.values()]), file=csv_file)


def parse_as_csv(csv_data: str, c2ll: bool = False) -> List[Dict]:
    """
    Parses data as the lines of a .csv file.
    :param csv_data: The bytes of the data.
    :param c2ll: If true, convert "coordinates" columns to "latitude,longitude'
    :return: a list of dicts of the csv contents.
    """

    # Recognizes (+1.234,-56.789)
    COORD_RE = re.compile(r'"?\((?P<lat>[+-]?[0-9.]+),(?P<lon>[+-]?[0-9.]+)\)"?')

    result = []
    csv_io = io.StringIO(csv_data)
    csv_reader = csv.DictReader(csv_io)
    row: dict
    for row in csv_reader:
        if (c_val := row.get("coordinates")) and c2ll:
            if match := COORD_RE.match(c_val):
                row["latitude"] = match["lat"]
                row["longitude"] = match["lon"]
        result.append(row)
    return result


def csv_as_str(csv_dict) -> str:
    result = (
        ",".join([escape_csv(x) for x in csv_dict.keys()])
        + "\n"
        + ",".join([escape_csv(x) for x in csv_dict.values()])
        + "\n"
    )
    return result


def snake_to_camel(string: str) -> str:
    words = string.split("_")
    return words[0] + "".join(word.capitalize() for word in words[1:])


def cannonical_program_name(acm_name) -> str:
    """Given a program or ACM name, return just the program name part, uppercased. ACM-TEST -> TEST, test -> TEST"""

    if acm_name is None:
        return None
    acm_name = acm_name.upper()
    if acm_name.startswith(ACM_PREFIX):
        acm_name = acm_name[len(ACM_PREFIX) :]
    return acm_name


def enquote(v):
    """Adds quotes to a string with embedded commas. For data destined for a .csv"""

    # escape any quotes
    v = v.replace('"', '\\"')
    # if any commas, enclose in quotes
    if v.find(",") > 0:
        v = '"' + v + '"'
    return v


def now():
    return str(datetime.now())
