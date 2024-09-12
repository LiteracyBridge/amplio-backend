from datetime import date, datetime
from enum import Enum
from typing import List

from dateutil.relativedelta import relativedelta
from sqlalchemy import (
    JSON,
    UUID,
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship, validates

from database import BaseModel
from models.deployment_model import Deployment
from models.organisation_model import Organisation
from models.recipient_model import Recipient
from models.timestamps_model import SoftDeleteMixin, TimestampMixin

time_length = ["one_month", "one_quarter", "six_months", "one_year"]
time_period = [
    "weekly",
    "bi_weekly",
    "monthly",
    "quarterly",
    "semi_annually",
    "annually",
    "not_applicable",
]

beneficiaries_map = {
    "male": "Number of Male",
    "female": "Number of Female",
    "youth": "Number of Youth",
}


class DeploymentInterval(Enum):
    one_month = 1
    one_quarter = 3
    six_months = 6
    one_year = 12


class Project(BaseModel):
    __tablename__ = "projects"

    _id: Mapped[int] = mapped_column("_id", nullable=True)
    id: Mapped[str] = mapped_column(UUID, primary_key=True, index=True)
    name = mapped_column("project", String, nullable=False)
    active = mapped_column(Boolean, nullable=False, default=True)
    code = mapped_column(String, name="projectcode", nullable=False)

    deployments: Mapped[List[Deployment]] = relationship("Deployment")
    recipients: Mapped[List[Recipient]] = relationship("Recipient")
    program: Mapped["Program"] = relationship("Program", back_populates="project")
    general: Mapped["Program"] = relationship(
        "Program", viewonly=True
    )  # This is for spec frontend


class Program(BaseModel):
    __tablename__ = "programs"
    __table_args__ = (UniqueConstraint("program_id", name="programs_uniqueness_key"),)

    id = Column(Integer, primary_key=True, index=True)

    country = Column(String(50), nullable=False)
    region = Column(JSON, nullable=False)
    partner: Mapped[str] = mapped_column(String, nullable=True)

    sustainable_development_goals = Column(JSON, nullable=False)
    listening_models = Column(JSON, nullable=False)
    deployments_count = Column(Integer, nullable=False)
    deployments_length = Column(String(50), nullable=False)
    tableau_id = Column(String(100), nullable=True)
    deployments_first = Column(Date, nullable=False)
    feedback_frequency = Column(String(50), nullable=False)
    languages = Column(JSON, nullable=False)
    direct_beneficiaries_map = Column(JSON, default=beneficiaries_map)
    direct_beneficiaries_additional_map = Column(JSON, default={})
    # partner = Column(String, nullable=False)
    # affiliate = Column(String, nullable=False)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    program_id = mapped_column(
        ForeignKey("projects.projectcode"), index=True, nullable=False
    )

    project: Mapped[Project] = relationship("Project", back_populates="program")
    organisations: Mapped[List["OrganisationProgram"]] = relationship(
        "OrganisationProgram", back_populates="program"
    )
    users: Mapped[List["ProgramUser"]] = relationship("ProgramUser", back_populates="program")  # type: ignore

    # @validates("deployments_length")
    # def validate_deployments_length(self, key, deployments_length):
    #     if deployments_length not in time_length:
    #         raise ValueError("Invalid 'deployments_length' argument")
    #     return deployments_length

    # @validates("deployments_first")
    # def validate_deployments_first(self, key, deployments_first):
    #     assert date.fromisoformat(deployments_first)
    #     return deployments_first

    # @validates("feedback_frequency")
    # def validate_feedback_frequency(self, key, feedback_frequency):
    #     if feedback_frequency not in time_period:
    #         raise ValueError("Invalid 'feedback_frequency' argument")
    #     return feedback_frequency

    # def default_deployments(self):
    #     deployments = []
    #     increment = DeploymentInterval[self.deployments_length].value

    #     for i in range(1, self.deployments_count + 1):
    #         start_date = self.deployments_first + relativedelta(
    #             months=increment * (i - 1)
    #         )
    #         end_date = self.deployments_first + relativedelta(months=increment * i)

    #         deployment = {
    #             "program_id": self.program_id,
    #             "name": str(i),
    #             "number": i,
    #             "deployment": f"{self.program_id}-{str(start_date.year)[2:]}-{i}",
    #             "start_date": start_date,
    #             "end_date": end_date,
    #             "component": "",
    #         }

    #         deployments.append(deployment)

    #     return deployments

    # def next_deployment(self):
    #     increment = DeploymentInterval[self.deployments_length].value

    #     start_date = self.deployments_first + relativedelta(
    #         months=increment * self.deployments_count
    #     )
    #     end_date = self.deployments_first + relativedelta(
    #         months=increment * (self.deployments_count + 1)
    #     )

    #     return {
    #         "program_id": self.program_id,
    #         "name": str(self.deployments_count + 1),
    #         "number": self.deployments_count + 1,
    #         "deployment": f"{self.program_id}-{str(start_date.year)[2:]}-{self.deployments_count + 1}",
    #         "start_date": start_date,
    #         "end_date": end_date,
    #         "component": "",
    #     }


class OrganisationProgram(BaseModel, SoftDeleteMixin, TimestampMixin):
    __tablename__ = "organisation_programs"

    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"), primary_key=True)
    organisation_id: Mapped[int] = mapped_column(
        ForeignKey("organisations.id"),
        primary_key=True,
    )

    organisation: Mapped[Organisation] = relationship("Organisation")
    program: Mapped[Program] = relationship("Program", back_populates="organisations")


# should validate_list_input belong to a utils package of some sort?
def validate_list_input(opts, keys, text):
    valid_keys = [opt in keys for opt in opts]

    if not all(valid_keys):
        invalid_keys = [opt for i, opt in enumerate(opts) if not valid_keys[i]]
        raise ValueError(f"Invalid {text} {invalid_keys}")
