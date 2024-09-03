"""make-name-and-data-nullable-on-questions

Revision ID: 738bae04c14b
Revises: f7085a17a0a5
Create Date: 2023-12-18 02:17:02.185110

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '738bae04c14b'
down_revision = 'f7085a17a0a5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
           """
        ALTER TABLE uf_questions
        ALTER COLUMN data DROP NOT NULL;
        """
    )
    op.execute(
           """
        ALTER TABLE uf_questions
        ALTER COLUMN name DROP NOT NULL;
        """
    )


def downgrade() -> None:
    # Making name/data not nullable will fail if there are any null values, so no need to undo this
    pass
