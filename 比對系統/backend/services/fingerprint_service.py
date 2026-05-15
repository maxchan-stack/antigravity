import logging
import re
from datasketch import MinHash
from typing import List, Set

logger = logging.getLogger(__name__)

class FingerprintService:
    def __init__(self):
        self.num_perm = 128  # Number of permutations for MinHash

    def get_shingles(self, text: str, k: int = 5) -> Set[str]:
        """
        Generate k-shingles (n-grams) from text.
        """
        # Normalize text: lowercase, remove non-alphanumeric
        text = text.lower()
        text = re.sub(r'[^\w\s]', '', text)
        words = text.split()
        
        if len(words) < k:
            return set([' '.join(words)])
            
        shingles = set()
        for i in range(len(words) - k + 1):
            shingle = ' '.join(words[i:i+k])
            shingles.add(shingle)
        return shingles

    def generate_minhash(self, text: str) -> MinHash:
        """
        Generate MinHash signature for text.
        """
        m = MinHash(num_perm=self.num_perm)
        shingles = self.get_shingles(text)
        
        for s in shingles:
            m.update(s.encode('utf8'))
            
        return m

    def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Compute Jaccard similarity between two texts using MinHash.
        """
        m1 = self.generate_minhash(text1)
        m2 = self.generate_minhash(text2)
        return m1.jaccard(m2)

fingerprint_service = FingerprintService()
