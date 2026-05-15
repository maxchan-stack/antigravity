from duckduckgo_search import DDGS
import json

def test_simple():
    print("Testing DDGS direct call...")
    try:
        results = DDGS().text("python", max_results=3)
        print("Results found:")
        for r in results:
            print(r)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_simple()
