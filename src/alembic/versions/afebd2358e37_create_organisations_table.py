"""create-organisations-table

Revision ID: afebd2358e37
Revises:
Create Date: 2023-12-11 09:20:16.687517

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "afebd2358e37"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organisations",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            default=sa.func.now(),
        ),
        sa.Column(
            "update_at",
            sa.DateTime(timezone=True),
            nullable=True,
            default=sa.func.now(),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    pass
