"""
Markdown chunker that splits by heading hierarchy first, then by character size.
Preserves heading metadata and source links for grounded RAG citations.
"""
import re
import hashlib
from typing import List, Tuple
from app.rag.models import DocFile, Chunk

DEFAULT_MAX_CHUNK_SIZE = 800
DEFAULT_OVERLAP = 100
MAX_REPO_CHUNKS = 200

# Matches ATX markdown headings (# Heading, ## Subheading, etc.)
HEADING_REGEX = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)


def _split_into_heading_sections(content: str, default_heading: str) -> List[Tuple[str, str]]:
    """
    Split markdown content into (heading_title, section_body) pairs.
    """
    matches = list(HEADING_REGEX.finditer(content))
    if not matches:
        return [(default_heading, content.strip())]

    sections: List[Tuple[str, str]] = []

    # Content before the first heading (preamble)
    first_match = matches[0]
    if first_match.start() > 0:
        preamble = content[: first_match.start()].strip()
        if preamble:
            sections.append((default_heading, preamble))

    for i, match in enumerate(matches):
        heading_title = match.group(2).strip()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        section_text = content[start:end].strip()
        sections.append((heading_title, section_text))

    return sections


def _split_text_by_size(
    text: str,
    max_size: int = DEFAULT_MAX_CHUNK_SIZE,
    overlap: int = DEFAULT_OVERLAP,
) -> List[str]:
    """
    Split a long section of text into chunks of roughly max_size characters
    with overlap, attempting to break cleanly on paragraph or sentence boundaries.
    """
    if len(text) <= max_size:
        return [text]

    chunks: List[str] = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + max_size, text_len)

        if end < text_len:
            # Look backwards from 'end' for a clean boundary: paragraph, newline, period, space
            search_window = text[max(start, end - 150) : end]
            best_break = -1

            # Check for double newline (paragraph break)
            para_break = search_window.rfind("\n\n")
            if para_break != -1:
                best_break = max(start, end - 150) + para_break + 2
            else:
                # Check for single newline
                nl_break = search_window.rfind("\n")
                if nl_break != -1:
                    best_break = max(start, end - 150) + nl_break + 1
                else:
                    # Check for sentence end
                    period_break = search_window.rfind(". ")
                    if period_break != -1:
                        best_break = max(start, end - 150) + period_break + 2
                    else:
                        # Check for space
                        space_break = search_window.rfind(" ")
                        if space_break != -1:
                            best_break = max(start, end - 150) + space_break + 1

            if best_break > start:
                end = best_break

        chunk_str = text[start:end].strip()
        if chunk_str:
            chunks.append(chunk_str)

        if end >= text_len:
            break

        # Move forward, stepping back by overlap
        start = max(start + 1, end - overlap)

    return chunks


def chunk_document(
    doc: DocFile,
    repo_name: str,
    max_chunk_size: int = DEFAULT_MAX_CHUNK_SIZE,
    overlap: int = DEFAULT_OVERLAP,
) -> List[Chunk]:
    """
    Chunk a single DocFile into a list of Chunk objects.
    """
    chunks: List[Chunk] = []
    default_heading = doc.file_path.split("/")[-1]

    sections = _split_into_heading_sections(doc.content, default_heading)

    chunk_idx = 0
    for heading, section_text in sections:
        if not section_text:
            continue

        text_pieces = _split_text_by_size(
            section_text, max_size=max_chunk_size, overlap=overlap
        )

        for piece in text_pieces:
            # Deterministic ID for deduplication and indexing
            raw_id = f"{repo_name}:{doc.file_path}:{chunk_idx}:{heading}"
            chunk_id = hashlib.sha256(raw_id.encode("utf-8")).hexdigest()[:16]

            chunks.append(
                Chunk(
                    id=chunk_id,
                    text=piece,
                    repo=repo_name,
                    file_path=doc.file_path,
                    heading=heading,
                    source_url=doc.source_url,
                    chunk_index=chunk_idx,
                )
            )
            chunk_idx += 1

    return chunks


def chunk_documents(
    docs: List[DocFile],
    repo_name: str,
    max_chunk_size: int = DEFAULT_MAX_CHUNK_SIZE,
    overlap: int = DEFAULT_OVERLAP,
    max_total_chunks: int = MAX_REPO_CHUNKS,
) -> List[Chunk]:
    """
    Chunk multiple DocFiles and enforce total chunk ceiling for speed.
    """
    all_chunks: List[Chunk] = []
    for doc in docs:
        doc_chunks = chunk_document(
            doc,
            repo_name=repo_name,
            max_chunk_size=max_chunk_size,
            overlap=overlap,
        )
        all_chunks.extend(doc_chunks)
        if len(all_chunks) >= max_total_chunks:
            all_chunks = all_chunks[:max_total_chunks]
            break

    return all_chunks
