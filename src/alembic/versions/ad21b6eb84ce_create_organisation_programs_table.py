"""create organisation programs table

Revision ID: ad21b6eb84ce
Revises: e8a26ed86742
Create Date: 2024-01-22 19:59:23.745811

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = 'ad21b6eb84ce'
down_revision = '3200593300fe'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organisation_programs",
        sa.Column("organisation_id", sa.Integer(), nullable=False),
        sa.Column("program_id", sa.Integer(), nullable=False),
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
            ["organisation_id"],
            ["organisations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["program_id"],
            ["programs.id"],
            ondelete="CASCADE",
        ),
    )


def downgrade() -> None:
    pass
