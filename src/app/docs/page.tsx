"use client";

import { useState } from "react";

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState("quickstart");

  const tabs = [
    { id: "quickstart", label: "Quick Start" },
    { id: "authentication", label: "Authentication" },
    { id: "models", label: "Models" },
    { id: "examples", label: "Examples" },
    { id: "pricing", label: "Pricing" },
    { id: "security", label: "Security" },
  ];

  const codeExamples = {
    basic: `curl -X POST https://edgar.daybot.ca/api/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'`,
    
    conversation: `curl -X POST https://edgar.daybot.ca/api/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-4.1-opus",
    "messages": [
      {"role": "system", "content": "You are a helpful coding assistant."},
      {"role": "user", "content": "Write a Python function to calculate fibonacci numbers."},
      {"role": "assistant", "content": "Here's a Python function for fibonacci:"},
      {"role": "user", "content": "Can you make it more efficient?"}
    ]
  }'`,
    
    javascript: `const response = await fetch('https://edgar.daybot.ca/api/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-5',
    messages: [
      { role: 'user', content: 'Explain quantum computing in simple terms' }
    ]
  })
});

const data = await response.json();
console.log(data.result.choices[0].message.content);`,
    
    python: `import requests

response = requests.post(
    'https://edgar.daybot.ca/api/chat',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'model': 'gpt-5',
        'messages': [
            {'role': 'user', 'content': 'Write a haiku about programming'}
        ]
    }
)

data = response.json()
print(data['result']['choices'][0]['message']['content'])`,
    
    openai_python: `from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://edgar.daybot.ca/v1"
)

response = client.chat.completions.create(
    model="gpt-5",
    messages=[
        {"role": "user", "content": "Write a haiku about programming"}
    ]
)

print(response.choices[0].message.content)`,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Edgar API Documentation</h1>
        <p className="text-xl text-white/80">
          Unified access to the world&apos;s most powerful AI models through a single API
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-white/10 mb-8 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-white/60 hover:text-white/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Quick Start */}
      {activeTab === "quickstart" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">Quick Start</h2>
            <p className="text-white/80 mb-6">
              Get started with Edgar API in minutes. We provide unified access to GPT-5, Claude, and Gemini models through a single, consistent interface.
            </p>
            
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-white mb-3">1. Get Your API Key</h3>
              <p className="text-white/70 mb-4">
                Sign up and generate your API key from the dashboard. Your key will start with <code className="bg-white/10 px-2 py-1 rounded text-sm">edgar_</code>.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-white mb-3">2. Make Your First Request</h3>
              <p className="text-white/70 mb-4">
                Use any of our supported models with a simple HTTP request:
              </p>
              <div className="overflow-x-auto">
                <pre className="bg-black/40 border border-white/10 rounded-lg p-4 min-w-max">
                  <code className="text-green-400 text-sm whitespace-pre">{codeExamples.basic}</code>
                </pre>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">3. Handle the Response</h3>
              <p className="text-white/70 mb-4">
                Edgar returns a standardized response format with the AI model&apos;s output and usage information:
              </p>
              <div className="overflow-x-auto">
                <pre className="bg-black/40 border border-white/10 rounded-lg p-4 min-w-max">
                  <code className="text-green-400 text-sm whitespace-pre">{`{
  "provider": "openai",
  "model": "gpt-5",
  "result": {
    "choices": [{
      "message": {
        "content": "Hello! I'm doing well, thank you for asking. How can I help you today?"
      }
    }]
  },
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 15,
    "total_tokens": 23,
    "charged_tokens": 15,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Authentication */}
      {activeTab === "authentication" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Authentication</h2>
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-3">API Keys</h3>
            <p className="text-white/70 mb-4">
              All API requests require authentication using your API key. Include it in the Authorization header:
            </p>
            <div className="overflow-x-auto">
              <pre className="bg-black/40 border border-white/10 rounded-lg p-4 min-w-max">
                <code className="text-green-400 text-sm whitespace-pre">Authorization: Bearer edgar_YOUR_API_KEY_HERE</code>
              </pre>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <h4 className="text-yellow-400 font-medium mb-2">Security Best Practices</h4>
              <ul className="text-yellow-200/80 text-sm space-y-1">
                <li>• Never expose your API key in client-side code</li>
                <li>• Store keys securely in environment variables</li>
                <li>• Rotate keys regularly for enhanced security</li>
                <li>• Use different keys for different environments</li>
              </ul>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-3">Error Responses</h3>
            <div className="space-y-3">
              <div>
                <code className="text-red-400">401 Unauthorized</code>
                <p className="text-white/70 text-sm">Invalid or missing API key</p>
              </div>
              <div>
                <code className="text-red-400">402 Payment Required</code>
                <p className="text-white/70 text-sm">Token limit exceeded for your plan</p>
              </div>
              <div>
                <code className="text-red-400">429 Too Many Requests</code>
                <p className="text-white/70 text-sm">Rate limit exceeded</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Models */}
      {activeTab === "models" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Supported Models</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-2">GPT-5</h3>
              <p className="text-white/70 text-sm mb-3">OpenAI&apos;s most advanced model</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Model ID:</span>
                  <code className="text-purple-400">gpt-5</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Context:</span>
                  <span className="text-white/80">128K tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Best for:</span>
                  <span className="text-white/80">Complex reasoning, coding</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-2">Claude 4.1 Opus</h3>
              <p className="text-white/70 text-sm mb-3">Anthropic&apos;s most capable model</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Model ID:</span>
                  <code className="text-purple-400">claude-4.1-opus</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Context:</span>
                  <span className="text-white/80">200K tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Best for:</span>
                  <span className="text-white/80">Analysis, writing</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-2">Gemini 2.5 Pro</h3>
              <p className="text-white/70 text-sm mb-3">Google&apos;s latest model</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Model ID:</span>
                  <code className="text-purple-400">gemini-2.5-pro</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Context:</span>
                  <span className="text-white/80">1M tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Best for:</span>
                  <span className="text-white/80">Long documents, research</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-3">Model Selection</h3>
            <p className="text-white/70 mb-4">
              Simply specify the model ID in your request. Edgar automatically routes to the correct provider:
            </p>
            <div className="overflow-x-auto">
              <pre className="bg-black/40 border border-white/10 rounded-lg p-4 min-w-max">
                <code className="text-green-400 text-sm whitespace-pre">{`{
  "model": "gpt-5",  // or "claude-4.1-opus" or "gemini-2.5-pro"
  "messages": [...]
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Examples */}
      {activeTab === "examples" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Code Examples</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">JavaScript</h3>
              <p className="text-white/70 mb-4">Use Edgar API with JavaScript:</p>
              <div className="overflow-x-auto">
                <pre className="bg-black/40 border border-white/10 rounded-lg p-4 min-w-max">
                  <code className="text-green-400 text-sm whitespace-pre">{codeExamples.javascript}</code>
                </pre>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Python</h3>
              <p className="text-white/70 mb-4">Use Edgar API with Python:</p>
              <div className="overflow-x-auto">
                <pre className="bg-black/40 border border-white/10 rounded-lg p-4 min-w-max">
                  <code className="text-green-400 text-sm whitespace-pre">{codeExamples.python}</code>
                </pre>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Conversation</h3>
              <p className="text-white/70 mb-4">Multi-turn conversation example:</p>
              <div className="overflow-x-auto">
                <pre className="bg-black/40 border border-white/10 rounded-lg p-4 min-w-max">
                  <code className="text-green-400 text-sm whitespace-pre">{codeExamples.conversation}</code>
                </pre>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-3">Python (OpenAI Library)</h3>
              <p className="text-white/70 mb-4">Use the official OpenAI library with Edgar&apos;s API:</p>
              <div className="overflow-x-auto">
                <pre className="bg-black/40 border border-white/10 rounded-lg p-4 min-w-max">
                  <code className="text-green-400 text-sm whitespace-pre">{codeExamples.openai_python}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-2">Starter</h3>
              <p className="text-3xl font-bold text-white mb-2">Free</p>
              <p className="text-white/70 text-sm mb-4">Perfect for getting started</p>
              <ul className="space-y-2 text-sm text-white/80">
                <li>• 5,000 tokens/month</li>
                <li>• All models available</li>
                <li>• Basic support</li>
                <li>• Usage analytics</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-purple-500/30 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-2">Pro</h3>
              <p className="text-3xl font-bold text-white mb-2">$20</p>
              <p className="text-white/70 text-sm mb-4">For growing applications</p>
              <ul className="space-y-2 text-sm text-white/80">
                <li>• 2M tokens/month</li>
                <li>• Priority capacity</li>
                <li>• Faster response times</li>
                <li>• Advanced analytics</li>
              </ul>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-2">Max</h3>
              <p className="text-3xl font-bold text-white mb-2">$100</p>
              <p className="text-white/70 text-sm mb-4">For enterprise needs</p>
              <ul className="space-y-2 text-sm text-white/80">
                <li>• Unlimited tokens</li>
                <li>• Enterprise support</li>
                <li>• Custom integrations</li>
                <li>• SLA guarantees</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Security</h2>
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-3">Data Protection</h3>
            <p className="text-white/70 mb-4">
              Edgar prioritizes the security and privacy of your data. We implement industry-standard security measures to protect your information.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-white font-medium mb-2">Encryption</h4>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• TLS 1.3 encryption in transit</li>
                  <li>• AES-256 encryption at rest</li>
                  <li>• End-to-end request encryption</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Access Control</h4>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• API key authentication</li>
                  <li>• Rate limiting protection</li>
                  <li>• Request deduplication</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-3">Privacy</h3>
            <p className="text-white/70 mb-4">
              We respect your privacy and implement strict data handling practices:
            </p>
            <ul className="text-white/70 text-sm space-y-2">
              <li>• No data retention beyond billing requirements</li>
              <li>• No training on your data</li>
              <li>• GDPR and CCPA compliant</li>
              <li>• Data deletion on request</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
