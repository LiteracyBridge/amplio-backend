"""create program_users table

Revision ID: 3200593300fe
Revises: 0ad2883d8667
Create Date: 2024-01-16 08:54:04.643912

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3200593300fe'
down_revision = '0ad2883d8667'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "program_users",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("program_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
            default=sa.func.now(),
        ),
        sa.Column(
            "deleted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["program_id"],
            ["programs.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "program_id"),
    )


def downgrade() -> None:
    op.drop_table("program_users")
