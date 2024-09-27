"""change invitations id to uuid

Revision ID: 0dbce3aec553
Revises:
Create Date: 2024-09-11 07:28:36.733611

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "0dbce3aec553"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # First change type to CHAR
    op.execute(
        sa.text(
            """
                CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
                ALTER TABLE invitations ALTER COLUMN id DROP DEFAULT,
                ALTER COLUMN id SET DATA TYPE UUID USING (uuid_generate_v4()),
                ALTER COLUMN id SET DEFAULT uuid_generate_v4();
            """
        )
    )


def downgrade() -> None:
    # Action not reversible
    pass
