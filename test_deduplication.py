#!/usr/bin/env python3
"""
Test script to verify deduplication is working
"""

import os
import time
import requests
from openai import OpenAI

# Replace with your actual API key
API_KEY = "edgar_bzKGUp5bxfwje3YTN2f9fNwktjbuR336"  # Replace this!

def test_deduplication():
    print("🧪 Testing deduplication...")
    
    client = OpenAI(
        api_key=API_KEY,
        base_url="https://edgar.daybot.ca/v1"
    )
    
    # Test 1: Single request
    print("\n1️⃣ Making single request...")
    try:
        response1 = client.chat.completions.create(
            model="gpt-5",
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=10
        )
        print(f"✅ Response: {response1.choices[0].message.content}")
        print(f"📊 Usage: {response1.usage}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Rapid duplicate requests (should be blocked)
    print("\n2️⃣ Making rapid duplicate requests (should be blocked)...")
    for i in range(3):
        try:
            response = client.chat.completions.create(
                model="gpt-5",
                messages=[{"role": "user", "content": "Say hello"}],
                max_tokens=10
            )
            print(f"❌ Request {i+1} succeeded (should have been blocked)")
        except Exception as e:
            if "Duplicate request detected" in str(e):
                print(f"✅ Request {i+1} correctly blocked as duplicate")
            else:
                print(f"❌ Unexpected error: {e}")
    
    # Test 3: Different content (should work)
    print("\n3️⃣ Making request with different content...")
    try:
        response3 = client.chat.completions.create(
            model="gpt-5",
            messages=[{"role": "user", "content": "Say goodbye"}],
            max_tokens=10
        )
        print(f"✅ Response: {response3.choices[0].message.content}")
        print(f"📊 Usage: {response3.usage}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 4: Wait and try again (should work)
    print("\n4️⃣ Waiting 6 seconds and trying again...")
    time.sleep(6)
    try:
        response4 = client.chat.completions.create(
            model="gpt-5",
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=10
        )
        print(f"✅ Response: {response4.choices[0].message.content}")
        print(f"📊 Usage: {response4.usage}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    if API_KEY == "edgar_YOUR_API_KEY_HERE":
        print("❌ Please replace API_KEY with your actual Edgar API key")
    else:
        test_deduplication()
