"""invitations-table

Revision ID: 59cd7297ccc3
Revises: afebd2358e37
Create Date: 2023-12-11 09:40:02.499367

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "59cd7297ccc3"
down_revision = "afebd2358e37"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "invitations",
        sa.Column("id", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("first_name", sa.String(), nullable=True),
        sa.Column("last_name", sa.String(), nullable=True),
        sa.Column("other_names", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column(
            "organisation_id",
            sa.Integer(),
            sa.ForeignKey("organisations.id", ondelete="CASCADE"),
            nullable=False,
        ),
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
    )


def downgrade() -> None:
    op.drop_table("invitations")
