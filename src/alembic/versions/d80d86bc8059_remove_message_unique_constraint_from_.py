"""remove-message-unique-constraint-from-analysis

Revision ID: d80d86bc8059
Revises: 7889ce1ffec4
Create Date: 2024-02-06 20:15:38.070275

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "d80d86bc8059"
down_revision = "7889ce1ffec4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE uf_analysis DROP CONSTRAINT IF EXISTS uf_analysis_pkey")


def downgrade() -> None:
    # No need to add the unique constraint back, this will results in error if
    # duplicate records are present
    pass
