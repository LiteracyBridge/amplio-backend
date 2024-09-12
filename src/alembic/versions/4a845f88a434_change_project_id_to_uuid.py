"""change project id to uuid

Revision ID: 4a845f88a434
Revises: 0dbce3aec553
Create Date: 2024-09-12 11:59:36.289613

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "4a845f88a434"
down_revision = "0dbce3aec553"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            -- Rename the column and remove the default value
            ALTER TABLE projects RENAME COLUMN id TO _id;
            ALTER TABLE projects ALTER COLUMN _id DROP DEFAULT;

            ALTER TABLE projects ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
        """
        )
    )

    pass


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            -- Rename new id (uuid) to a temp name
            ALTER TABLE projects RENAME COLUMN id TO _tmp_id;

            -- Rename old _id (int) to id (int)
            ALTER TABLE projects RENAME COLUMN _id TO id;

            -- Drop the new id (uuid)
            ALTER TABLE projects DROP COLUMN _tmp_id;
        """
        )
    )
