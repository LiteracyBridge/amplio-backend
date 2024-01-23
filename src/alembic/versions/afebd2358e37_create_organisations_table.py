"""create-organisations-table

Revision ID: afebd2358e37
Revises:
Create Date: 2023-12-11 09:20:16.687517

"""
import sqlalchemy as sa

from alembic import op

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
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
            default=sa.func.now(),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["organisations.id"],
            ondelete="CASCADE",
        ),
    )


def downgrade() -> None:
    pass
