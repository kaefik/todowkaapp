import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import Index, String, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DeletedEntity(Base):
    __tablename__ = 'deleted_entities'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    deleted_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('ix_deleted_entities_user_type_time', 'user_id', 'entity_type', 'deleted_at'),
    )


class DeletionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_tombstone(self, user_id: str, entity_type: str, entity_id: str):
        self.db.add(DeletedEntity(
            user_id=str(user_id),
            entity_type=entity_type,
            entity_id=str(entity_id),
        ))

    async def record_tombstones_batch(self, user_id: str, entity_type: str, entity_ids: list[str]):
        records = [
            DeletedEntity(user_id=str(user_id), entity_type=entity_type, entity_id=str(eid))
            for eid in entity_ids
        ]
        self.db.add_all(records)

    async def get_deleted(self, user_id: str, since: datetime | None = None, entity_type: str | None = None) -> list[DeletedEntity]:
        stmt = select(DeletedEntity).where(DeletedEntity.user_id == str(user_id))
        if since:
            stmt = stmt.where(DeletedEntity.deleted_at >= since)
        if entity_type:
            stmt = stmt.where(DeletedEntity.entity_type == entity_type)
        result = await self.db.execute(stmt.order_by(DeletedEntity.deleted_at))
        return list(result.scalars().all())

    async def cleanup_old(self, days: int = 30):
        cutoff = datetime.now(UTC) - timedelta(days=days)
        await self.db.execute(
            delete(DeletedEntity).where(DeletedEntity.deleted_at < cutoff)
        )
        await self.db.flush()
