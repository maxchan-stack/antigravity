from services.web_search_service import web_search_service
import sys

def test_crawler():
    query = "python"
    print(f"--- 1. Testing Google Search with query: '{query}' (Should exclude zhihu.com) ---")
    
    # 1. Test Search
    results = web_search_service.search_web(query, max_results=3)
    
    if not results:
        print("❌ No results found. Search might be blocked or failing.")
        return

    print(f"✅ Found {len(results)} results:")
    for i, res in enumerate(results):
        print(f"   [{i+1}] {res.get('title')} ({res.get('href')})")

    # 2. Test Crawl
    target_url = results[0]['href']
    print(f"\n--- 2. Testing Crawl on first result: {target_url} ---")
    
    content = web_search_service.crawl_url(target_url)
    
    if content:
        print(f"✅ Successfully crawled {len(content)} characters.")
        print(f"   Preview: {content[:200]}...")
    else:
        print("❌ Failed to crawl content (might be protected by anti-bot or timeout).")

if __name__ == "__main__":
    test_crawler()
