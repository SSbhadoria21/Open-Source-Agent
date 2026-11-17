#!/usr/bin/env python3
"""
RAG Evaluation Script — measures real retrieval hit-rate and MRR for target repositories.

Evaluates whether top-k retrieved chunks contain the expected documentation files
(e.g. CONTRIBUTING.md, PR template, testing docs, issue templates).

Usage:
    python scripts/eval_rag.py [--repo owner/repo] [--offline]
"""
import sys
import os
import argparse
from typing import List, Dict, Any

try:
    sys.stdout.reconfigure(line_buffering=True)
except Exception:
    pass

# Ensure backend directory is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.rag.models import DocFile, Chunk
from app.rag.chunker import chunk_documents
from app.rag.store import ChromaStore
from app.rag.retriever import retrieve
from app.core.config import settings

# 20 Verified questions across 3 real repos (each file path verified to exist in repo)
REAL_EVAL_BENCHMARKS = [
    {
        "repo": "encode/httpx",
        "questions": [
            {
                "query": "How do I run the test suite and pytest for httpx?",
                "expected": "docs/contributing.md",
                "acceptable": ["docs/contributing.md", "CONTRIBUTING.md"],
            },
            {
                "query": "What is the pull request checklist and submission template?",
                "expected": ".github/PULL_REQUEST_TEMPLATE.md",
                "acceptable": [".github/PULL_REQUEST_TEMPLATE.md", "docs/contributing.md"],
            },
            {
                "query": "How do I report a bug or create an issue in httpx?",
                "expected": ".github/ISSUE_TEMPLATE/1-issue.md",
                "acceptable": [".github/ISSUE_TEMPLATE/1-issue.md"],
            },
            {
                "query": "What is the code of conduct and community guidelines?",
                "expected": "docs/code_of_conduct.md",
                "acceptable": ["docs/code_of_conduct.md", "CODE_OF_CONDUCT.md"],
            },
            {
                "query": "What are the code formatting, styling and linting standards?",
                "expected": "docs/contributing.md",
                "acceptable": ["docs/contributing.md", "CONTRIBUTING.md"],
            },
            {
                "query": "How do I set up a development environment with virtualenv or scripts?",
                "expected": "docs/contributing.md",
                "acceptable": ["docs/contributing.md", "CONTRIBUTING.md"],
            },
            {
                "query": "What is the project description and HTTPX client features?",
                "expected": "README.md",
                "acceptable": ["README.md", "docs/index.md"],
            },
        ],
    },
    {
        "repo": "langchain-ai/langgraph",
        "questions": [
            {
                "query": "What is the pull request description format and checklist?",
                "expected": ".github/PULL_REQUEST_TEMPLATE.md",
                "acceptable": [".github/PULL_REQUEST_TEMPLATE.md"],
            },
            {
                "query": "How do I submit a bug report with reproduction steps?",
                "expected": ".github/ISSUE_TEMPLATE/bug-report.yml",
                "acceptable": [".github/ISSUE_TEMPLATE/bug-report.yml"],
            },
            {
                "query": "What is LangGraph and what are its core concepts?",
                "expected": "README.md",
                "acceptable": ["README.md", "libs/langgraph/README.md"],
            },
            {
                "query": "How do agents work in LangGraph and what architectures are supported?",
                "expected": "AGENTS.md",
                "acceptable": ["AGENTS.md", "README.md"],
            },
            {
                "query": "What are the features and quickstart for the LangGraph library?",
                "expected": "libs/langgraph/README.md",
                "acceptable": ["libs/langgraph/README.md", "README.md"],
            },
            {
                "query": "What is the checkpointing mechanism and state saving in LangGraph?",
                "expected": "libs/checkpoint/README.md",
                "acceptable": ["libs/checkpoint/README.md", "README.md"],
            },
        ],
    },
    {
        "repo": "fastapi/fastapi",
        "questions": [
            {
                "query": "How do I run tests and linters when developing FastAPI?",
                "expected": "docs/en/docs/contributing.md",
                "acceptable": ["docs/en/docs/contributing.md", "CONTRIBUTING.md"],
            },
            {
                "query": "How do I write and execute async tests in FastAPI?",
                "expected": "docs/en/docs/advanced/async-tests.md",
                "acceptable": ["docs/en/docs/advanced/async-tests.md", "docs/en/docs/contributing.md"],
            },
            {
                "query": "What is the tutorial roadmap and intro to FastAPI concepts?",
                "expected": "docs/en/docs/tutorial/index.md",
                "acceptable": ["docs/en/docs/tutorial/index.md", "README.md"],
            },
            {
                "query": "How do I report a sensitive security vulnerability?",
                "expected": ".github/ISSUE_TEMPLATE/privileged.yml",
                "acceptable": [".github/ISSUE_TEMPLATE/privileged.yml", "docs/en/docs/contributing.md"],
            },
            {
                "query": "How do Python type hints work in FastAPI and why are they used?",
                "expected": "docs/en/docs/python-types.md",
                "acceptable": ["docs/en/docs/python-types.md", "docs/en/docs/tutorial/index.md"],
            },
            {
                "query": "How can I help the FastAPI community and answer questions?",
                "expected": "docs/en/docs/help-fastapi.md",
                "acceptable": ["docs/en/docs/help-fastapi.md", "docs/en/docs/contributing.md"],
            },
            {
                "query": "What is FastAPI, what are its key features, and how do I install it?",
                "expected": "README.md",
                "acceptable": ["README.md", "docs/en/docs/tutorial/index.md"],
            },
        ],
    },
]


def evaluate_retrieval(benchmarks: List[Dict[str, Any]], offline: bool = False, top_k: int = 5) -> Dict[str, Any]:
    mode_str = "OFFLINE (Mock/Synthetic)" if offline else "REAL (Live ChromaDB + Gemini)"
    print("=" * 80)
    print(f"MODE: {mode_str}")
    print(f"Evaluating Top-{top_k} Retrieval Hit-Rate and Mean Reciprocal Rank (MRR)")
    print("=" * 80)

    total_questions = 0
    total_hits = 0
    total_reciprocal_rank = 0.0

    repo_summaries = []

    for b in benchmarks:
        repo = b["repo"]
        questions = b["questions"]
        repo_hits = 0
        repo_rr = 0.0

        print(f"\nEvaluating Target Repository: {repo} ({len(questions)} queries)")
        print("-" * 80)

        for q_idx, item in enumerate(questions, start=1):
            query = item["query"]
            expected = item["expected"]
            acceptable = item.get("acceptable", [expected])

            if offline:
                # Synthetic match for smoke testing
                results = [
                    {"file_path": expected, "heading": "Section", "score": 0.88},
                    {"file_path": "README.md", "heading": "Intro", "score": 0.65},
                ]
            else:
                # Real retrieval
                results = retrieve(query=query, repo=repo, k=top_k, min_score=0.2)

            retrieved_paths = [r["file_path"] for r in results]
            top3_paths = retrieved_paths[:3]

            # Determine hit and reciprocal rank
            hit = False
            rr = 0.0
            for rank, r_path in enumerate(retrieved_paths, start=1):
                if any(acc.lower() in r_path.lower() or r_path.lower() in acc.lower() for acc in acceptable):
                    hit = True
                    rr = 1.0 / rank
                    break

            if hit:
                repo_hits += 1
                total_hits += 1
            repo_rr += rr
            total_reciprocal_rank += rr
            total_questions += 1

            status_str = "HIT " if hit else "MISS"
            top3_str = ", ".join(top3_paths) if top3_paths else "(none)"
            print(f"[{status_str}] Q{q_idx:02d}: {query[:50]:<50}")
            print(f"       Expected: {expected}")
            print(f"       Top-3:    {top3_str} (RR={rr:.2f})")

        repo_hit_rate = (repo_hits / len(questions)) * 100.0 if questions else 0.0
        repo_mrr = (repo_rr / len(questions)) if questions else 0.0
        repo_summaries.append({
            "repo": repo,
            "questions": len(questions),
            "hits": repo_hits,
            "hit_rate": repo_hit_rate,
            "mrr": repo_mrr,
        })

    overall_hit_rate = (total_hits / total_questions) * 100.0 if total_questions else 0.0
    overall_mrr = (total_reciprocal_rank / total_questions) if total_questions else 0.0

    print("\n" + "=" * 80)
    print(f"EVALUATION SUMMARY — MODE: {mode_str}")
    print("=" * 80)
    print(f"{'Repository':<30} {'Queries':<10} {'Hits':<10} {'Hit-Rate':<12} {'MRR':<10}")
    print("-" * 72)
    for s in repo_summaries:
        print(f"{s['repo']:<30} {s['questions']:<10} {s['hits']:<10} {s['hit_rate']:>6.1f}%      {s['mrr']:>5.3f}")
    print("-" * 72)
    print(f"{'OVERALL TOTAL':<30} {total_questions:<10} {total_hits:<10} {overall_hit_rate:>6.1f}%      {overall_mrr:>5.3f}")
    print("=" * 80)

    return {
        "mode": "OFFLINE" if offline else "REAL",
        "total_questions": total_questions,
        "total_hits": total_hits,
        "overall_hit_rate": overall_hit_rate,
        "overall_mrr": overall_mrr,
        "repos": repo_summaries,
    }


def main():
    parser = argparse.ArgumentParser(description="Evaluate RAG documentation retrieval accuracy.")
    parser.add_argument("--repo", type=str, default=None, help="Specific repo to evaluate (e.g. encode/httpx)")
    parser.add_argument("--offline", action="store_true", default=False, help="Run offline synthetic test (CI smoke test only)")
    parser.add_argument("--top-k", type=int, default=5, help="Top-K retrieval limit")
    args = parser.parse_args()

    benchmarks = REAL_EVAL_BENCHMARKS
    if args.repo:
        benchmarks = [b for b in benchmarks if b["repo"].lower() == args.repo.lower()]
        if not benchmarks:
            print(f"Unknown repo: {args.repo}. Available: {[b['repo'] for b in REAL_EVAL_BENCHMARKS]}")
            sys.exit(1)

    results = evaluate_retrieval(benchmarks, offline=args.offline, top_k=args.top_k)

    if not args.offline and results["overall_hit_rate"] < 70.0:
        print(f"\nWARNING: Hit rate ({results['overall_hit_rate']:.1f}%) is below 70% threshold.")
        sys.exit(1)


if __name__ == "__main__":
    main()
