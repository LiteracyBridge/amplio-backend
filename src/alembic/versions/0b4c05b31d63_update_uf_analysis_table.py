"""update uf_analysis table

Revision ID: 0b4c05b31d63
Revises: 5c5b695b6b44
Create Date: 2023-08-22 05:46:51.139150

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0b4c05b31d63"
down_revision = "5c5b695b6b44"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "uf_analysis",
        sa.Column("response", sa.Text(), nullable=True),
    )
    op.add_column(
        "uf_analysis",
        sa.Column(
            "question_id",
            sa.Integer(),
            sa.ForeignKey("uf_questions.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.add_column(
        "uf_analysis",
        sa.Column(
            "choice_id",
            sa.Integer(),
            sa.ForeignKey("uf_choices.choice_id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.add_column(
        "uf_analysis",
        sa.Column("created_at", sa.DateTime(), nullable=True, default=sa.func.now()),
    )
    op.add_column(
        "uf_analysis",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=True,
            onupdate=sa.func.now(),
        ),
    )
    op.add_column(
        "uf_analysis",
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    pass
