"""migrate-staffs-from-dynamo

Revision ID: 7938a33c95bb
Revises: a21c9d376902
Create Date: 2024-02-16 16:42:56.776396

"""

from datetime import datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "7938a33c95bb"
down_revision = "a21c9d376902"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This code has been moved to scripts/migrate_staffs_from_dynamo.py
    pass


def downgrade() -> None:
    pass
