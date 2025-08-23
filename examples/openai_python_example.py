#!/usr/bin/env python3
"""
Example: Using the OpenAI Python library with Edgar API

This example shows how to use the official OpenAI Python library
with Edgar's unified API to access GPT-5, Claude, and Gemini models.

Install the OpenAI library:
    pip install openai

Usage:
    python openai_python_example.py
"""

from openai import OpenAI

# Initialize the client with Edgar's API
client = OpenAI(
    api_key="edgar_YOUR_API_KEY_HERE",  # Replace with your Edgar API key
    base_url="https://edgar.daybot.ca/v1"
)

def test_gpt5():
    """Test GPT-5 model"""
    print("🤖 Testing GPT-5...")
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "user", "content": "Write a short poem about coding"}
        ],
        max_tokens=100,
        temperature=0.7
    )
    print(f"Response: {response.choices[0].message.content}")
    print(f"Usage: {response.usage}")
    print()

def test_claude():
    """Test Claude model"""
    print("🧠 Testing Claude...")
    response = client.chat.completions.create(
        model="claude-4.1-opus",
        messages=[
            {"role": "system", "content": "You are a helpful coding assistant."},
            {"role": "user", "content": "Explain recursion in simple terms"}
        ],
        max_tokens=150,
        temperature=0.3
    )
    print(f"Response: {response.choices[0].message.content}")
    print(f"Usage: {response.usage}")
    print()

def test_gemini():
    """Test Gemini model"""
    print("💎 Testing Gemini...")
    response = client.chat.completions.create(
        model="gemini-2.5-pro",
        messages=[
            {"role": "user", "content": "What are the benefits of using multiple AI models?"}
        ],
        max_tokens=200,
        temperature=0.5
    )
    print(f"Response: {response.choices[0].message.content}")
    print(f"Usage: {response.usage}")
    print()

def test_conversation():
    """Test multi-turn conversation"""
    print("💬 Testing conversation...")
    
    # First message
    response1 = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "user", "content": "What is the capital of France?"}
        ]
    )
    answer1 = response1.choices[0].message.content
    print(f"Q: What is the capital of France?")
    print(f"A: {answer1}")
    
    # Follow-up question
    response2 = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "user", "content": "What is the capital of France?"},
            {"role": "assistant", "content": answer1},
            {"role": "user", "content": "What is the population of that city?"}
        ]
    )
    answer2 = response2.choices[0].message.content
    print(f"Q: What is the population of that city?")
    print(f"A: {answer2}")
    print()

if __name__ == "__main__":
    print("🚀 Edgar API - OpenAI Library Example")
    print("=" * 50)
    
    try:
        test_gpt5()
        test_claude()
        test_gemini()
        test_conversation()
        
        print("✅ All tests completed successfully!")
        print("\n💡 Tips:")
        print("- Replace 'edgar_YOUR_API_KEY_HERE' with your actual API key")
        print("- You can use any model: gpt-5, claude-4.1-opus, gemini-2.5-pro")
        print("- The API automatically routes to the correct provider")
        print("- Only completion tokens are charged (output only)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nMake sure to:")
        print("1. Replace the API key with your actual Edgar API key")
        print("2. Install the OpenAI library: pip install openai")
        print("3. Check your internet connection")
