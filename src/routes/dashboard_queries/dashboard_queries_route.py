from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, subqueryload

from database import query_to_json
from models import get_db
from models.recipient_model import Recipient
from models.tb_deployed_model import TalkingBookDeployed
from routes.dashboard_queries.tb_status import DEPLOYMENT_BY_COMMUNITY, get_status
from schema import ApiResponse

router = APIRouter()


@router.get("/{program_id}/status")
def status(program_id: str, selector: str, db: Session = Depends(get_db)):
    return ApiResponse(
        data=get_status(
            programid=program_id,
            selector=selector if selector is not None else "bydepl",
        )
    )


# TODO: Add deployment number to this query
@router.get("/{program_id}/tbs-deployed")
def tbs_deployed(program_id: str, db: Session = Depends(get_db)):
    query = """
    SELECT tbd.talkingbookid,tbd.recipientid,tbd.deployedtimestamp,dep.deploymentnumber,tbd.deployment,
           tbd.contentpackage,tbd.username,tbd.tbcdid,tbd.action,tbd.newsn,tbd.testing
      FROM tbsdeployed tbd
      JOIN deployments dep
        ON tbd.project=dep.project AND tbd.deployment=dep.deployment
     WHERE tbd.project ILIKE :programid
     ORDER BY dep.deploymentnumber, tbd.recipientid;
    """

    results = query_to_json(query, params={"programid": program_id})
    print(results)
    # print("{} tbs deployed found for {}".format(numtbs, programid))
    return ApiResponse(data=results)


@router.get("/{program_id}/deployment-by-deployed")
def deployment_by_community(program_id: str, db: Session = Depends(get_db)):
    results = query_to_json(DEPLOYMENT_BY_COMMUNITY, params={"programid": program_id})
    print(results)
    # print("{} deployments-by-community found for {}".format(numdepls, programid))
    return ApiResponse(data=results)


@router.get("/{program_id}/recipients")
def recipients(program_id: str, db: Session = Depends(get_db)):
    # TODO: populate tbdeployed
    return ApiResponse(
        data=db.query(Recipient)
        .filter(Recipient.program_id == program_id)
        .options(
            subqueryload(Recipient.talkingbooks_deployed).options(
                subqueryload(TalkingBookDeployed.deployment),
            ),
        )
        .all()
    )
