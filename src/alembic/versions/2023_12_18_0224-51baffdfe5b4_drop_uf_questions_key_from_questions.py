"""drop-uf_questions_key-from-questions

Revision ID: 51baffdfe5b4
Revises: 738bae04c14b
Create Date: 2023-12-18 02:24:20.161369

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "51baffdfe5b4"
down_revision = "738bae04c14b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uf_questions_key")
    pass


def downgrade() -> None:
    # Restoring the unique constraint will fail if there are any duplicate values, so no need to undo this.
    #
    # op.create_unique_constraint("uf_questions_key", "uf_questions", ["programid", "language", "deploymentnumber", "order"])
    pass
