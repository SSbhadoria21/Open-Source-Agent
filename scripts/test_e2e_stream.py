#!/usr/bin/env python3
"""
End-to-End Pipeline Verification Script (Task 3).
Connects to the FastAPI application and verifies:
1. Full SSE event stream with live Gemini LLM + RAG retrieval
2. Event order: pipeline_start -> agent_status -> indexing_docs -> retrieved_context -> complete
3. Plan grounding: [file_path] citations in steps, non-empty sources array
4. HTTP 200 check for every source_url
5. Timing comparison: Run 1 vs Run 2 (cache hit within 24h)
"""
import sys
import os
import time
import json
import asyncio
from typing import List, Dict, Any
import urllib.request

# Ensure backend directory is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import httpx
from app.main import app

TARGET_REPO = "https://github.com/fastapi/fastapi"
TARGET_ISSUE = "https://github.com/fastapi/fastapi/issues/12010"


async def run_stream_test(run_label: str) -> Dict[str, Any]:
    print(f"\n{'='*70}")
    print(f"STARTING {run_label}")
    print(f"Target Repo:  {TARGET_REPO}")
    print(f"Target Issue: {TARGET_ISSUE}")
    print(f"{'='*70}")

    events = []
    start_time = time.perf_counter()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://localhost:8000", timeout=120.0) as client:
        params = {
            "repo_url": TARGET_REPO,
            "issue_url": TARGET_ISSUE,
            "skill_level": "intermediate",
        }
        
        async with client.stream("GET", "/api/v1/contributor/fix-plan-stream", params=params) as response:
            assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"
            
            current_event_name = "message"
            buffer = ""

            async for line in response.aiter_lines():
                line = line.strip()
                if not line:
                    continue

                if line.startswith("event:"):
                    current_event_name = line.split(":", 1)[1].strip()
                elif line.startswith("data:"):
                    data_str = line.split(":", 1)[1].strip()
                    try:
                        parsed_data = json.loads(data_str)
                    except Exception:
                        parsed_data = data_str
                    
                    events.append({
                        "event": current_event_name,
                        "data": parsed_data,
                    })
                    print(f"  [EVENT] {current_event_name:<18} -> {str(parsed_data)[:90]}...")

    elapsed = time.perf_counter() - start_time
    print(f"\n{run_label} Elapsed Time: {elapsed:.2f}s")
    print(f"Total SSE Events Received: {len(events)}")
    return {"label": run_label, "elapsed": elapsed, "events": events}


def verify_run(result: Dict[str, Any]) -> Dict[str, Any]:
    events = result["events"]
    event_names = [e["event"] for e in events]

    print("\n--- Event Sequence Validation ---")
    print("Received event names:", " -> ".join(event_names))

    # 1. Event order check
    expected_milestones = ["pipeline_start", "agent_status", "indexing_docs", "retrieved_context", "complete"]
    current_idx = 0
    all_ordered = True
    for milestone in expected_milestones:
        if milestone in event_names[current_idx:]:
            next_idx = event_names.index(milestone, current_idx)
            current_idx = next_idx
            print(f"  [PASS] Milestone '{milestone}' encountered at index {current_idx}")
        else:
            print(f"  [FAIL] Milestone '{milestone}' NOT found in order!")
            all_ordered = False

    # 2. Complete event inspection
    complete_events = [e for e in events if e["event"] == "complete"]
    assert complete_events, "No 'complete' event was emitted!"
    final_payload = complete_events[-1]["data"]
    fix_plan = final_payload.get("fix_plan", {})

    print("\n--- Fix Plan Verification ---")
    title = fix_plan.get("title", "(no title)")
    steps = fix_plan.get("steps", [])
    sources = fix_plan.get("sources", [])

    print(f"Plan Title: {title}")
    print(f"Number of Steps: {len(steps)}")
    print(f"Sources Count: {len(sources)}")

    # 3. Check [file_path] citations in steps
    citation_found = False
    for step in steps:
        step_text = json.dumps(step)
        if "[" in step_text and "]" in step_text:
            citation_found = True
            break
    print(f"Brackets/Citations found in plan: {citation_found}")

    # 4. Verify sources array is non-empty
    has_sources = len(sources) > 0
    print(f"Sources list populated: {has_sources}")
    for s in sources:
        print(f"  - {s.get('file_path')}: {s.get('source_url')}")

    # 5. Verify every source_url returns HTTP 200
    print("\n--- Validating Source URLs (HTTP 200) ---")
    urls_valid = True
    for s in sources:
        url = s.get("source_url")
        if not url:
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"  [HTTP {resp.status}] {url}")
                if resp.status != 200:
                    urls_valid = False
        except Exception as e:
            print(f"  [ERROR] {url}: {e}")
            urls_valid = False

    return {
        "ordered": all_ordered,
        "citation_found": citation_found,
        "has_sources": has_sources,
        "urls_valid": urls_valid,
        "fix_plan": fix_plan,
        "elapsed": result["elapsed"],
    }


async def main_async():
    # Run 1 (Cold / First run)
    result1 = await run_stream_test("RUN 1 (Cold / Initial Indexing)")
    v1 = verify_run(result1)

    # Run 2 (Warm / Cache hit)
    result2 = await run_stream_test("RUN 2 (Warm / 24h Freshness Cache Hit)")
    v2 = verify_run(result2)

    print("\n" + "="*70)
    print("TIMING COMPARISON")
    print(f"Run 1 (Cold): {result1['elapsed']:.2f}s")
    print(f"Run 2 (Warm): {result2['elapsed']:.2f}s")
    speedup = ((result1['elapsed'] - result2['elapsed']) / result1['elapsed']) * 100.0 if result1['elapsed'] > 0 else 0
    print(f"Difference:   {result1['elapsed'] - result2['elapsed']:.2f}s faster ({speedup:.1f}% reduction)")
    print("="*70)

    # Check that Run 2 indexing skipped or was cached
    run2_indexing_events = [e["data"] for e in result2["events"] if e["event"] == "indexing_docs"]
    print("Run 2 Indexing Messages:")
    for msg in run2_indexing_events:
        print(f"  - {msg}")


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
