"""nullable-language-n-deployment-on-surveys

Revision ID: 7889ce1ffec4
Revises: 6a734a495274
Create Date: 2024-01-28 20:00:49.805099

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "7889ce1ffec4"
down_revision = "6a734a495274"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "uf_surveys",
        "language",
        nullable=True,
    )
    op.alter_column(
        "uf_surveys",
        "deployment_id",
        nullable=True,
    )


def downgrade() -> None:
    # This is a one-way migration. Downgrade is not possible. Some rows may have
    # null values for language and deployment_id.
    pass
