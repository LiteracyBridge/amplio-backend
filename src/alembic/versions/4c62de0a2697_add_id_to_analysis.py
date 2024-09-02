"""add id to analysis

Revision ID: 4c62de0a2697
Revises: ac2380e5101d
Create Date: 2023-09-07 16:44:30.595867

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4c62de0a2697"
down_revision = "ac2380e5101d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "uf_analysis",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
            primary_key=True,
            index=True,
            unique=True,
        ),
    )


def downgrade() -> None:
    pass
