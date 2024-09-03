"""add parent_id to choices

Revision ID: ac2380e5101d
Revises: 0b4c05b31d63
Create Date: 2023-09-06 10:34:02.781916

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ac2380e5101d"
down_revision = "0b4c05b31d63"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "uf_choices",
        sa.Column(
            "parent_id",
            sa.Integer(),
            sa.ForeignKey("uf_choices.choice_id", ondelete="CASCADE"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("uf_choices", "parent_id")
