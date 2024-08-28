"""update uf_choices table

Revision ID: 5c5b695b6b44
Revises: 8ef57497fc74
Create Date: 2023-08-22 05:45:38.510139

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "5c5b695b6b44"
down_revision = "8ef57497fc74"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "uf_choices",
        sa.Column("is_other", sa.Boolean(), nullable=True, default=False),
    )
    op.add_column(
        "uf_choices",
        sa.Column(
            "question_id",
            sa.Integer(),
            sa.ForeignKey("uf_questions.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("uf_choices", "is_other")
    op.drop_column("uf_choices", "question_id")
