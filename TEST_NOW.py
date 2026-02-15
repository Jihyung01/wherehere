import requests
import json

print("=" * 60)
print("WhereHere API Test")
print("=" * 60)

# 1. Health check
print("\n1. Health Check...")
health = requests.get("http://localhost:8000/health").json()
print(f"   Database: {health['database']}")
print(f"   Status: {health['status']}")

# 2. Recommendations test
print("\n2. Recommendations Test...")
response = requests.post(
    "http://localhost:8000/api/v1/recommendations",
    json={
        "role_type": "explorer",
        "current_location": {
            "latitude": 37.5665,
            "longitude": 126.9780
        },
        "mood": {
            "mood_text": "curious",
            "intensity": 0.7
        }
    }
)

data = response.json()
print(f"\n   Data Source: {data['data_source']}")
print(f"   Total Candidates: {data['total_candidates']}")
print(f"   Recommendations: {len(data['recommendations'])}")

if data['recommendations']:
    print(f"\n   First recommendation:")
    place = data['recommendations'][0]
    print(f"      Name: {place['name']}")
    print(f"      Address: {place['address']}")
    print(f"      Category: {place['category']}")

print("\n" + "=" * 60)
if data['data_source'] == 'database_rest':
    print("SUCCESS! Using real Supabase data!")
elif data['data_source'] == 'mock':
    print("FAIL: Still using mock data...")
print("=" * 60)
