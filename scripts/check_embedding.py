#!/usr/bin/env python3
"""
Verification script for Gemini embeddings using official google-genai SDK.
Embeds real strings with RETRIEVAL_DOCUMENT and RETRIEVAL_QUERY and computes
cosine similarity between relevant vs irrelevant document pairs.
"""
import sys
import os
import math

# Ensure backend directory is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings
from app.rag.embedder import GeminiEmbedder


def cosine_similarity(v1: list, v2: list) -> float:
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def main():
    # 1. Verify API key is present
    api_key_present = bool(settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_"))
    print(f"1. GEMINI_API_KEY status: {'PRESENT' if api_key_present else 'ABSENT'}")
    if not api_key_present:
        print("ERROR: GEMINI_API_KEY is missing. Check backend/.env")
        sys.exit(1)

    # 2. Embedding model in use
    model_name = getattr(settings, "EMBEDDING_MODEL", "gemini-embedding-001")
    print(f"2. Embedding model configured: {model_name}")

    # 3. Real strings to embed
    doc1_relevant_test = (
        "To run the unit test suite across the repository, activate your virtual environment "
        "and execute `pytest -v tests/` from the root directory."
    )
    doc2_pr_conventions = (
        "Pull request guidelines: ensure PR titles follow Conventional Commits format, e.g., "
        "'feat(parser): add markdown heading support', and link the related issue."
    )
    doc3_irrelevant_cake = (
        "To bake a classic dark chocolate fudge cake, preheat your oven to 350 degrees Fahrenheit, "
        "whisk cocoa powder, flour, and sugar, then bake for thirty minutes."
    )

    query = "How do I run and execute unit tests in the codebase?"

    embedder = GeminiEmbedder(model=model_name)

    print("\n3. Generating embeddings via Gemini API...")
    docs = [doc1_relevant_test, doc2_pr_conventions, doc3_irrelevant_cake]
    doc_vectors = embedder.embed_documents(docs)
    query_vector = embedder.embed_query(query)

    print(f"\n   Query vector dimension: {len(query_vector)}")
    print(f"   Query first 3 values: {[round(x, 6) for x in query_vector[:3]]}")

    for idx, (doc, vec) in enumerate(zip(["Doc 1 (Tests)", "Doc 2 (PR Guidelines)", "Doc 3 (Chocolate Cake)"], doc_vectors), 1):
        print(f"\n   {doc}:")
        print(f"     Dimension: {len(vec)}")
        print(f"     First 3 values: {[round(x, 6) for x in vec[:3]]}")

    # 4. Cosine similarities
    sim_doc1 = cosine_similarity(query_vector, doc_vectors[0])
    sim_doc2 = cosine_similarity(query_vector, doc_vectors[1])
    sim_doc3 = cosine_similarity(query_vector, doc_vectors[2])

    print("\n4. Cosine Similarity Analysis:")
    print(f"   Query vs Doc 1 (Relevant - Tests):         {sim_doc1:.4f}")
    print(f"   Query vs Doc 2 (Semantically Adjacent):   {sim_doc2:.4f}")
    print(f"   Query vs Doc 3 (Irrelevant - Cake):        {sim_doc3:.4f}")

    margin = sim_doc1 - sim_doc3
    print(f"\n   Separation Margin (Doc 1 - Doc 3):         {margin:+.4f}")

    if sim_doc1 > sim_doc3 and margin >= 0.2:
        print("\nVERDICT: PASS - Relevant doc scored clearly higher than irrelevant doc.")
        sys.exit(0)
    else:
        print("\nVERDICT: FAIL - Margin is insufficient or ranking is inverted.")
        sys.exit(1)


if __name__ == "__main__":
    main()
