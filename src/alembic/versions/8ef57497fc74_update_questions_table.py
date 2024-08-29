"""update questions table

Revision ID: 8ef57497fc74
Revises: afebd2358e37
Create Date: 2023-08-22 05:41:16.517293

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "8ef57497fc74"
down_revision = "59cd7297ccc3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "uf_questions",
        sa.Column(
            "section_id",
            sa.Integer(),
            sa.ForeignKey("uf_survey_sections.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.add_column(
        "uf_questions",
        sa.Column(
            "parent_id",
            sa.Integer(),
            sa.ForeignKey("uf_questions.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.add_column(
        "uf_questions",
        sa.Column(
            "survey_id",
            sa.Integer(),
            sa.ForeignKey("uf_surveys.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.add_column(
        "uf_questions",
        sa.Column("conditions", sa.JSON(), nullable=True, default=[]),
    )


def downgrade() -> None:
    op.drop_column("uf_questions", "section")
    op.drop_column("uf_questions", "parent_id")
    op.drop_column("uf_questions", "survey_id")
    op.drop_column("uf_questions", "conditions")
