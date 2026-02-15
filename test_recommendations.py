import requests

r = requests.post(
    'http://localhost:8000/api/v1/recommendations',
    json={
        'role_type': 'explorer',
        'current_location': {
            'latitude': 37.5665,
            'longitude': 126.9780
        },
        'mood': {
            'mood_text': 'curious',
            'intensity': 0.7
        }
    }
)

data = r.json()
print(f"Data source: {data['data_source']}")
print(f"Total candidates: {data['total_candidates']}")
print(f"Places: {len(data['recommendations'])}")
