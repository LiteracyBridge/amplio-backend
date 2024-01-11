"""create roles table

Revision ID: 3ebff79c3ef1
Revises: fd96eb69102b
Create Date: 2024-01-11 14:25:21.688354

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3ebff79c3ef1"
down_revision = "fd96eb69102b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("permissions", sa.dialects.postgresql.JSONB(), nullable=False),
        sa.Column("organisation_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(True), nullable=False, default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(True), nullable=False, default=sa.func.now()
        ),
        sa.Column("deleted_at", sa.DateTime(True), nullable=True),
        sa.ForeignKeyConstraint(
            ["organisation_id"],
            ["organisations.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("roles")
