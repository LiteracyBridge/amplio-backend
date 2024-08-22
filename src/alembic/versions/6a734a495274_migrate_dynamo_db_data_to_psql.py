"""migrate dynamo-db data to psql

Revision ID: 6a734a495274
Revises: ad21b6eb84ce
Create Date: 2024-01-22 20:03:07.879747

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "6a734a495274"
down_revision = "ad21b6eb84ce"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Code has been moved to scripts/migrate_staffs_from_dynamo.py
    pass


def downgrade() -> None:
    pass
