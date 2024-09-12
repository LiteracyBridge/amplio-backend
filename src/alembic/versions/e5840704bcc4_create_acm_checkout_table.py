"""create-acm-checkout-table

Revision ID: e5840704bcc4
Revises: 4a845f88a434
Create Date: 2024-09-12 12:12:07.228194

"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "e5840704bcc4"
down_revision = "4a845f88a434"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            CREATE TABLE acm_checkout (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                last_in_name VARCHAR,
                last_in_version VARCHAR,
                last_in_comment VARCHAR,
                last_in_contact VARCHAR,
                acm_comment VARCHAR,
                acm_state VARCHAR NOT NULL,
                last_in_file_name VARCHAR NOT NULL,
                last_in_date TIMESTAMP WITH TIME ZONE NOT NULL,
                project_id UUID UNIQUE,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            );
        """
        )
    )
    pass


def downgrade() -> None:
    op.execute(sa.text(" DROP TABLE acm_checkout"))
