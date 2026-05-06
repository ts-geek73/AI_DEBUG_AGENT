import type { Suggestion } from "@/lib/schemas";

interface SuggestionCardProps {
  suggestion: Suggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900">{suggestion.title}</h3>

      {/* Explanation */}
      <p className="text-sm text-gray-600 leading-relaxed">{suggestion.explanation}</p>

      {/* Before */}
      <div className="space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-red-600">Before</h4>
        <pre className="overflow-x-auto rounded-md bg-red-50 border border-red-100 p-3 text-sm text-gray-800">
          <code>{suggestion.before}</code>
        </pre>
      </div>

      {/* After */}
      <div className="space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-green-600">After</h4>
        <pre className="overflow-x-auto rounded-md bg-green-50 border border-green-100 p-3 text-sm text-gray-800">
          <code>{suggestion.after}</code>
        </pre>
      </div>
    </div>
  );
}
