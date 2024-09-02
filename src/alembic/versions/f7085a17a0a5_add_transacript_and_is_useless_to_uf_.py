"""add transacript and is_useless to uf_messages

Revision ID: f7085a17a0a5
Revises: 4397d5b93d37
Create Date: 2023-10-06 13:05:40.373536

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f7085a17a0a5"
down_revision = "4397d5b93d37"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("uf_messages", sa.Column("transcription", sa.Text(), nullable=True))
    op.add_column("uf_messages", sa.Column("is_useless", sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column("uf_messages", "is_useless")
    op.drop_column("uf_messages", "transcription")
