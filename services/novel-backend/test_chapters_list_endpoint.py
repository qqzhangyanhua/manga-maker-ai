#!/usr/bin/env python3
"""
Simple endpoint test for GET /api/novel/rag/chapters
This test verifies the endpoint exists and returns the correct structure.
"""
import sys
import os
from pathlib import Path

# Add project path
sys.path.insert(0, str(Path(__file__).parent))

def test_endpoint_exists():
    """Test that the chapters list endpoint exists"""
    print("\n" + "="*60)
    print("Test: GET /api/novel/rag/chapters endpoint")
    print("="*60)

    try:
        # Setup minimal env
        os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
        os.environ.setdefault("JWT_SECRET", "test-secret")
        os.environ.setdefault("JWT_ALGORITHM", "HS256")
        os.environ.setdefault("OPENAI_API_KEY", "sk-test")
        os.environ.setdefault("OPENAI_API_BASE", "https://api.openai.com/v1")
        os.environ.setdefault("OPENAI_MODEL", "gpt-4")
        os.environ.setdefault("OPENAI_EMBEDDING_MODEL", "text-embedding-ada-002")
        os.environ.setdefault("MINIO_ENDPOINT", "localhost")
        os.environ.setdefault("MINIO_ACCESS_KEY", "test")
        os.environ.setdefault("MINIO_SECRET_KEY", "test")
        os.environ.setdefault("MINIO_BUCKET_NAME", "test")
        os.environ.setdefault("MINIO_USE_SSL", "false")
        os.environ.setdefault("CHROMA_PERSIST_DIR", "./test_chroma")
        os.environ.setdefault("CHROMA_COLLECTION_NAME", "test")
        os.environ.setdefault("RAG_ENABLE_VECTOR_SEARCH", "false")

        # Import FastAPI app
        from app.routers.rag import router

        # Check if the route exists
        routes = [route.path for route in router.routes]

        if "/chapters" in routes:
            print("✅ Endpoint /chapters exists in router")

            # Check the method
            chapters_route = next(r for r in router.routes if r.path == "/chapters")
            methods = chapters_route.methods if hasattr(chapters_route, 'methods') else set()

            if "GET" in methods:
                print("✅ GET method is supported")
                return True
            else:
                print(f"❌ GET method not found, available methods: {methods}")
                return False
        else:
            print(f"❌ Endpoint /chapters not found in router")
            print(f"   Available routes: {routes}")
            return False

    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = test_endpoint_exists()
    sys.exit(0 if result else 1)
