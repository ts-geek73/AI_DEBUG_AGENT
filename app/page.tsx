"use client";

import { useState, useEffect } from "react";
import type { AnalysisResult } from "@/lib/schemas";
import { AnalysisResultSchema } from "@/lib/schemas";
import { DebugForm } from "./components/DebugForm";
import { ResultsPanel } from "./components/ResultsPanel";

const SESSION_KEY = "lastAnalysis";

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On mount, restore result from sessionStorage if present and valid — Requirement 6.6
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = AnalysisResultSchema.safeParse(parsed);
        if (validated.success) {
          setResult(validated.data);
        }
        // Silently discard if invalid or schema mismatch
      }
    } catch {
      // Silently discard invalid JSON
    }
  }, []);

  // Called by DebugForm on successful analysis — Requirement 6.5
  const handleResult = (newResult: AnalysisResult) => {
    setResult(newResult);
    setError(null);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newResult));
    } catch {
      // sessionStorage may be unavailable (e.g. private browsing quota exceeded); ignore
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">AI Debug Agent</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste your code and error message to get an AI-powered root cause analysis.
        </p>
      </header>

      <section aria-label="Debug form">
        <DebugForm onResult={handleResult} />
      </section>

      {result && (
        <section aria-label="Analysis results">
          <ResultsPanel result={result} />
        </section>
      )}
    </main>
  );
}
