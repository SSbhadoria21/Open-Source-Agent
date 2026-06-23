import uuid
from sqlalchemy import Column, Integer, String, Text, ForeignKey, BigInteger, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    github_id = Column(BigInteger, unique=True, nullable=False)
    name = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    description = Column(Text)
    language = Column(String)
    stars = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    issues = relationship("Issue", back_populates="repository", cascade="all, delete-orphan")


class Issue(Base):
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"))
    github_id = Column(BigInteger, nullable=False)
    number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    labels = Column(ARRAY(String))
    difficulty = Column(String)
    issue_type = Column(String)
    priority = Column(String)
    state = Column(String, nullable=False)
    embedding_id = Column(String)
    created_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))

    repository = relationship("Repository", back_populates="issues")


class Contributor(Base):
    __tablename__ = "contributors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    display_name = Column(String)
    skills = Column(JSONB)
    top_areas = Column(ARRAY(String))
    merged_pr_count = Column(Integer, default=0)
    last_active_at = Column(DateTime(timezone=True))
    repositories = Column(ARRAY(String))
    profile_built_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String)
    state_json = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
