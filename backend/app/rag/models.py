from pydantic import BaseModel, Field
from typing import Optional


class DocFile(BaseModel):
    file_path: str
    content: str
    source_url: str
    doc_type: str = "doc"


class Chunk(BaseModel):
    id: str
    text: str
    repo: str
    file_path: str
    heading: str
    source_url: str
    chunk_index: int


class RetrievalResult(BaseModel):
    text: str
    file_path: str
    heading: str
    source_url: str
    score: float


class IndexStatus(BaseModel):
    repo: str
    collection_name: str
    total_chunks: int
    indexed_at: str
    was_cached: bool
