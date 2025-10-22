#!/usr/bin/env python3
import requests
import json

# Login
login_data = {
    "email": "admin@fulexo.com",
    "password": "demo123"
}

print("=== LOGIN TEST ===")
response = requests.post(
    "http://localhost:3000/api/auth/login",
    json=login_data,
    headers={"Content-Type": "application/json"}
)

print(f"Status Code: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

if response.status_code == 200 or response.status_code == 201:
    print("\n✓ LOGIN BASARILI!")
    cookies = response.cookies
    print(f"Cookies: {cookies}")
    
    # Test dashboard endpoint
    print("\n=== DASHBOARD TEST ===")
    dash_response = requests.get(
        "http://localhost:3000/api/dashboard/stats",
        cookies=cookies
    )
    print(f"Status: {dash_response.status_code}")
    if dash_response.status_code == 200:
        print(f"Dashboard Data: {json.dumps(dash_response.json(), indent=2)}")
else:
    print("\n✗ LOGIN BASARISIZ!")

