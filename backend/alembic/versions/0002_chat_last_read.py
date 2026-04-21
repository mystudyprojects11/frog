"""add last_read_at columns on chats

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chats",
        sa.Column("buyer_last_read_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.add_column(
        "chats",
        sa.Column("seller_last_read_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_column("chats", "seller_last_read_at")
    op.drop_column("chats", "buyer_last_read_at")
