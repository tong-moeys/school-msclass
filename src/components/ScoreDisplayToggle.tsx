import React from "react";
import { ScoreDisplayMode } from "../types";
import { gradeOf } from "../lib/constants";

interface ScoreDisplayToggleProps {
  mode: ScoreDisplayMode;
  onChange: (mode: ScoreDisplayMode) => void;
  compact?: boolean;
}

export const ScoreDisplayToggle: React.FC<ScoreDisplayToggleProps> = ({
  mode,
  onChange,
  compact = false,
}) => {
  return (
    <div
      className={`inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 select-none ${
        compact ? "text-[10px]" : "text-xs"
      }`}
      title="ប្ដូរទម្រង់បង្ហាញពិន្ទុ៖ មធ្យមភាគ / និទ្ទេស / ទាំងពីរ"
    >
      <span className="text-slate-500 font-extrabold px-1.5 hidden md:inline text-[10px]">
        បង្ហាញ:
      </span>
      <button
        type="button"
        onClick={() => onChange("avg")}
        className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
          mode === "avg"
            ? "bg-white text-blue-700 shadow-xs border border-slate-200/70"
            : "text-slate-600 hover:text-slate-900"
        }`}
        title="បង្ហាញជាពិន្ទុមធ្យមភាគ (Average)"
      >
        <span className="text-[11px]">📊</span>
        <span>មធ្យមភាគ</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("grade")}
        className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
          mode === "grade"
            ? "bg-white text-emerald-700 shadow-xs border border-slate-200/70"
            : "text-slate-600 hover:text-slate-900"
        }`}
        title="បង្ហាញជានិទ្ទេស A, B, C, D, E, F (Grade)"
      >
        <span className="text-[11px]">🎖️</span>
        <span>និទ្ទេស</span>
      </button>

      <button
        type="button"
        onClick={() => onChange("both")}
        className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
          mode === "both"
            ? "bg-white text-purple-700 shadow-xs border border-slate-200/70"
            : "text-slate-600 hover:text-slate-900"
        }`}
        title="បង្ហាញទាំងពិន្ទុមធ្យមភាគ និងនិទ្ទេស (Both)"
      >
        <span className="text-[11px]">🔄</span>
        <span>ទាំងពីរ</span>
      </button>
    </div>
  );
};

export const GradeBadge: React.FC<{
  letter: string;
  color?: string;
  size?: "xs" | "sm" | "md";
}> = ({ letter, color, size = "xs" }) => {
  if (!letter || letter === "—") {
    return <span className="text-slate-300 font-bold">—</span>;
  }
  const defaultColors: Record<string, string> = {
    A: "#15803d",
    B: "#1d4ed8",
    C: "#b45309",
    D: "#c2410c",
    E: "#dc2626",
    F: "#7f1d1d",
  };
  const c = color || defaultColors[letter.toUpperCase()] || "#475569";
  const sizeClasses =
    size === "xs"
      ? "px-1.5 py-0.5 text-[9px] min-w-[18px]"
      : size === "sm"
      ? "px-2 py-0.5 text-[10px] min-w-[22px]"
      : "px-2.5 py-1 text-xs min-w-[28px]";

  return (
    <span
      className={`inline-flex items-center justify-center font-black rounded-md text-white shadow-2xs leading-none ${sizeClasses}`}
      style={{ backgroundColor: c }}
    >
      {letter}
    </span>
  );
};

export const ScoreOrGradeCell: React.FC<{
  score: number | string | null | undefined;
  isAverage?: boolean;
  mode?: ScoreDisplayMode;
  className?: string;
}> = ({ score, isAverage = false, mode = "both", className = "" }) => {
  if (score === null || score === undefined || score === "" || isNaN(Number(score))) {
    return <span className={`text-slate-300 font-bold ${className}`}>—</span>;
  }
  const num = Number(score);
  const formatted = isAverage ? num.toFixed(2) : (num % 1 === 0 ? String(num) : num.toFixed(2));
  const grade = gradeOf(num);

  if (mode === "grade") {
    return <GradeBadge letter={grade.l} color={grade.c} size="xs" />;
  }

  if (mode === "avg") {
    return (
      <span
        className={`font-extrabold ${
          num >= 5 ? "text-slate-800" : "text-red-600"
        } ${className}`}
      >
        {formatted}
      </span>
    );
  }

  // both
  return (
    <div className={`inline-flex items-center justify-center gap-1 ${className}`}>
      <span
        className={`font-bold ${
          num >= 5 ? "text-slate-800" : "text-red-600"
        }`}
      >
        {formatted}
      </span>
      <GradeBadge letter={grade.l} color={grade.c} size="xs" />
    </div>
  );
};
