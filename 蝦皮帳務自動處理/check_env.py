try:
    import msoffcrypto
    print("msoffcrypto is available")
except ImportError:
    print("msoffcrypto is NOT available")

try:
    import pandas
    print("pandas is available")
except ImportError:
    print("pandas is NOT available")
