import asyncio
from db.supabase_client import SupabaseClient

async def test_rest_api():
    print("Testing Supabase REST API...")
    try:
        client = SupabaseClient()
        
        # Test: Get places
        places = await client._query_places_fallback(37.5665, 126.9780, 5000, 10)
        print(f"Success! Found {len(places)} places")
        
        if places:
            print(f"First place: {places[0].get('name', 'Unknown')}")
        
        return True
    except Exception as e:
        print(f"Failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_rest_api())
