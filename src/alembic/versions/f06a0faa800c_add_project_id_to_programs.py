"""add-project-id-to-programs

Revision ID: f06a0faa800c
Revises: e5840704bcc4
Create Date: 2024-09-12 13:00:25.377369

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "f06a0faa800c"
down_revision = "e5840704bcc4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            ALTER TABLE programs ADD COLUMN project_id UUID;
            ALTER TABLE programs ADD CONSTRAINT fk_project_id FOREIGN KEY (project_id) REFERENCES projects (id);
        """
        )
    )

    # Update the project_id column with the correct project id from the projects table
    op.execute(
        sa.text(
            """
            WITH results AS (SELECT projectcode, id FROM projects)
            UPDATE programs
            SET project_id = results.id
            FROM results
            WHERE program_id = results.projectcode;
        """
        )
    )

    # Make project_id not nullable
    op.execute(
        sa.text(
            """
            ALTER TABLE programs ALTER COLUMN project_id SET NOT NULL;
        """
        )
    )


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE programs DROP COLUMN project_id"))
