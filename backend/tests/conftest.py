import sys
from pathlib import Path
import pytest

# Add backend directory to sys.path so 'app' imports seamlessly from anywhere
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

@pytest.fixture(autouse=True)
def speedup_test_rate_limiter():
    from app.rag_engine import rag_engine
    orig_interval = rag_engine.rate_limiter.min_interval
    rag_engine.rate_limiter.min_interval = 0.0
    yield
    rag_engine.rate_limiter.min_interval = orig_interval
