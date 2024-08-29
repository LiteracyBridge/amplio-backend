import os
from pathlib import Path
from typing import Union


def canonical_acm_dir_name(acm: str, upper=True) -> str:
    if upper:
        acm = acm.upper()
    if not acm.startswith("ACM-"):
        acm = "ACM-" + acm
    return acm


def canonical_acm_path_name(acm: str, upper=True) -> Path:
    acm_path = Path(canonical_acm_dir_name(acm, upper=upper))
    return acm_path


def canonical_acm_project_name(acmdir: str | None) -> Union[None, str]:
    if acmdir is None:
        return None

    _, acm = os.path.split(acmdir)
    acm = acm.upper()
    if acm.startswith("ACM-"):
        acm = acm[4:]
    return acm
