import asyncio
import asyncpg
from core.config import settings

async def test_connection():
    print(f"Testing connection to: {settings.DATABASE_URL[:50]}...")
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL, timeout=10)
        print("✅ Connection successful!")
        
        # Test query
        result = await conn.fetchval("SELECT COUNT(*) FROM places")
        print(f"📊 Places count: {result}")
        
        await conn.close()
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection())
