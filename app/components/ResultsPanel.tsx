import type { AnalysisResult } from "@/lib/schemas";
import { ConfidenceBar } from "./ConfidenceBar";
import { SuggestionCard } from "./SuggestionCard";

interface ResultsPanelProps {
  result: AnalysisResult;
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Root cause card — Requirement 6.1 */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Root Cause
        </h2>
        <p className="text-gray-900 leading-relaxed">{result.rootCause}</p>
      </div>

      {/* Confidence bar — Requirements 6.2, 6.3 */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Confidence
        </h2>
        <ConfidenceBar
          score={result.confidence}
          confidenceLabel={result.confidenceLabel}
        />
        {result.confidenceReason && (
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            {result.confidenceReason}
          </p>
        )}
      </div>

      {/* Suggestions list — Requirement 6.4 */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Suggestions
        </h2>
        {result.suggestions.map((suggestion, index) => (
          <SuggestionCard key={index} suggestion={suggestion} />
        ))}
      </div>
    </div>
  );
}
