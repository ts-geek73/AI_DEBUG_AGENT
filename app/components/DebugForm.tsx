"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/schemas";

interface DebugFormProps {
  onResult: (result: AnalysisResult) => void;
}

interface ValidationErrors {
  code?: string;
  language?: string;
  error?: string;
}

export function DebugForm({ onResult }: DebugFormProps) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const validateFields = (): boolean => {
    const errors: ValidationErrors = {};

    if (!code.trim()) {
      errors.code = "Code is required";
    }

    if (!error.trim()) {
      errors.error = "Error message is required";
    }

    if (!language) {
      errors.language = "Language is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setApiError(null);
    setValidationErrors({});

    // Validate fields
    if (!validateFields()) {
      return;
    }

    // Start loading
    setIsLoading(true);

    try {
      const response = await fetch("/api/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          language,
          error,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        setApiError(data.error || "An error occurred");
        setIsLoading(false);
        return;
      }

      // Success - pass result up via callback
      setApiError(null);
      onResult(data);
    } catch (err) {
      setApiError("Failed to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* API Error Banner */}
      {apiError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{apiError}</p>
        </div>
      )}

      {/* Code Textarea */}
      <div className="space-y-2">
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Code
        </label>
        <textarea
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={`w-full rounded-md border ${
            validationErrors.code ? "border-red-300" : "border-gray-300"
          } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono`}
          rows={10}
          placeholder="Paste your code here..."
          disabled={isLoading}
        />
        {validationErrors.code && (
          <p className="text-sm text-red-600">{validationErrors.code}</p>
        )}
      </div>

      {/* Language Selector */}
      <div className="space-y-2">
        <label htmlFor="language" className="block text-sm font-medium text-gray-700">
          Language
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className={`w-full rounded-md border ${
            validationErrors.language ? "border-red-300" : "border-gray-300"
          } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          disabled={isLoading}
        >
          <option value="">Select a language...</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
        </select>
        {validationErrors.language && (
          <p className="text-sm text-red-600">{validationErrors.language}</p>
        )}
      </div>

      {/* Error Textarea */}
      <div className="space-y-2">
        <label htmlFor="error" className="block text-sm font-medium text-gray-700">
          Error Message
        </label>
        <textarea
          id="error"
          value={error}
          onChange={(e) => setError(e.target.value)}
          className={`w-full rounded-md border ${
            validationErrors.error ? "border-red-300" : "border-gray-300"
          } px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono`}
          rows={4}
          placeholder="Paste the error message here..."
          disabled={isLoading}
        />
        {validationErrors.error && (
          <p className="text-sm text-red-600">{validationErrors.error}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors ${
          isLoading
            ? "bg-blue-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Analyzing...
          </span>
        ) : (
          "Analyze"
        )}
      </button>
    </form>
  );
}
