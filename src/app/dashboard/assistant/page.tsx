'use client';

export default function AssistantPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">AI Assistant</h1>
      <p className="mb-4">Interact with an AI assistant to troubleshoot issues and get recommendations across your catalog.</p>
      <ul className="list-disc list-inside space-y-2">
        <li>Ask why audits failed and how to fix them.</li>
        <li>Receive SEO, pricing and description suggestions.</li>
        <li>Get guidance on workflow and next steps.</li>
        <li>Context-aware and tailored to your tenant.</li>
      </ul>
    </div>
  );
}
