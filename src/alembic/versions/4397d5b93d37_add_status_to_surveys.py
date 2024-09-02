"""add status to surveys

Revision ID: 4397d5b93d37
Revises: 4c62de0a2697
Create Date: 2023-09-18 21:04:37.875875

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4397d5b93d37"
down_revision = "4c62de0a2697"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # op.add_column(
    #     "uf_surveys", sa.Column("status", sa.String(), nullable=True, default="draft")
    # )
    pass


def downgrade() -> None:
    # op.drop_column("uf_surveys", "status")
    pass
