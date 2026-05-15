from googlesearch import search
import sys

def debug_google():
    print("Testing connection to Google...")
    try:
        # Intentionally simple call
        generator = search("python", num_results=1, advanced=True)
        item = next(generator)
        print(f"Success! Found: {item.title} ({item.url})")
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_google()
