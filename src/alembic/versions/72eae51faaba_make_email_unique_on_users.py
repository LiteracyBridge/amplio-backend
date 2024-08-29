"""make-email-unique-on-users

Revision ID: 72eae51faaba
Revises: 7938a33c95bb
Create Date: 2024-02-20 09:02:28.277936

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "72eae51faaba"
down_revision = "7938a33c95bb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "email",
        existing_type=sa.String(),
        nullable=False,
        unique=True,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "email",
        existing_type=sa.String(),
        nullable=False,
        unique=False,
    )
