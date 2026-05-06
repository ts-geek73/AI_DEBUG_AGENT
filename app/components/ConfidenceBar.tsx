interface ConfidenceBarProps {
  score: number;
  confidenceLabel: "High" | "Medium" | "Low";
}

const colorMap = {
  High: {
    bar: "bg-green-500",
    badgeText: "text-green-700",
    badgeBg: "bg-green-100",
  },
  Medium: {
    bar: "bg-yellow-500",
    badgeText: "text-yellow-700",
    badgeBg: "bg-yellow-100",
  },
  Low: {
    bar: "bg-red-500",
    badgeText: "text-red-700",
    badgeBg: "bg-red-100",
  },
} as const;

export function ConfidenceBar({ score, confidenceLabel }: ConfidenceBarProps) {
  const colors = colorMap[confidenceLabel];
  const clampedScore = Math.min(100, Math.max(0, score));

  return (
    <div className="flex items-center gap-3">
      {/* Progress bar */}
      <div
        className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence: ${clampedScore}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>

      {/* Score */}
      <span className="text-sm font-medium text-gray-700 w-10 text-right">
        {clampedScore}%
      </span>

      {/* Badge */}
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.badgeBg} ${colors.badgeText}`}
      >
        {confidenceLabel}
      </span>
    </div>
  );
}
