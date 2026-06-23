from app.agents.repo_agent import analyze_repository
import json

def test():
    # Let's analyze a small open source repo, or this repo itself if it was on github
    repo_url = "https://github.com/tiangolo/fastapi"
    print(f"Testing Repo Agent against {repo_url}...")
    
    result = analyze_repository(repo_url)
    print("\nResult:")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    test()
