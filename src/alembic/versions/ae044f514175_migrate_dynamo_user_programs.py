"""migrate-dynamo-user-programs

Revision ID: ae044f514175
Revises: 72eae51faaba
Create Date: 2024-02-20 12:35:06.006084

"""

from datetime import datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "ae044f514175"
down_revision = "72eae51faaba"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This code has been moved to scripts/migrate_staffs_from_dynamo.py
    pass


def downgrade() -> None:
    pass
