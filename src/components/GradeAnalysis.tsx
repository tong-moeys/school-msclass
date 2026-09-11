import React, { useState } from "react";
import { Student, ScoreMap } from "../types";
import { SUBJECTS, gradeOf, resultOf, truncate2, fmtAvg } from "../lib/constants";

interface GradeAnalysisProps {
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  selClass: string;
  semester: string;
  selMonth: number;
}

const GRADE_KEYS = ["A", "B", "C", "D", "E", "F"];

const GRADE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  A: { bg: "bg-emerald-100", text: "text-emerald-800", bar: "bg-emerald-500" },
  B: { bg: "bg-blue-100", text: "text-blue-800", bar: "bg-blue-500" },
  C: { bg: "bg-amber-100", text: "text-amber-800", bar: "bg-amber-500" },
  D: { bg: "bg-orange-100", text: "text-orange-800", bar: "bg-orange-500" },
  E: { bg: "bg-rose-100", text: "text-rose-800", bar: "bg-rose-500" },
  F: { bg: "bg-red-100", text: "text-red-900", bar: "bg-red-600" },
};

const SUBJ_GROUPS: Record<string, { label: string; indices: number[] }> = {
  all: { label: "មុខវិជ្ជាទាំងអស់ (មធ្យមភាគ)", indices: Array.from({ length: 15 }, (_, i) => i) },
  khmer: { label: "ភាសាខ្មែរ (ស្ដាប់·សរសេរ·អាន·និយាយ)", indices: [0, 1, 2, 3] },
  math: { label: "គណិតវិទ្យា (ចំនួន·រង្វាស់·ធរណី·ពីជ·ស្ថិតិ)", indices: [4, 5, 6, 7, 8] },
  sci: { label: "វិទ្យាសាស្ត្រ + សិក្សាសង្គម", indices: [9, 10] },
};

export const GradeAnalysis: React.FC<GradeAnalysisProps> = ({
  students,
  scoresMap,
  selClass,
}) => {
  const [grpKey, setGrpKey] = useState<string>("all");

  if (!students.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-3xl mb-2">🎯</div>
        <div className="text-xs font-semibold">មិនទាន់មានសិស្ស</div>
      </div>
    );
  }

  const grp = SUBJ_GROUPS[grpKey];

  const getSubjAvg = (sid: string) => {
    const vals = grp.indices
      .map((i) => scoresMap[sid]?.[SUBJECTS[i]])
      .filter((v) => v !== "" && v !== undefined && !isNaN(Number(v)));
    if (!vals.length) return null;
    return truncate2(vals.reduce((a, b) => a + Number(b), 0) / vals.length);
  };

  const rows = students.map((s) => {
    const avg = getSubjAvg(s.id);
    const g = avg !== null ? gradeOf(avg) : null;
    return { ...s, avg, grade: g?.l || null };
  });

  const validRows = rows.filter((r) => r.grade !== null);
  const totalEvaluated = validRows.length;

  const counts: Record<string, { total: number; f: number; m: number }> = {};
  GRADE_KEYS.forEach((g) => {
    counts[g] = { total: 0, f: 0, m: 0 };
  });

  validRows.forEach((r) => {
    if (!r.grade) return;
    counts[r.grade].total++;
    if (r.gender === "ស្រី") counts[r.grade].f++;
    else counts[r.grade].m++;
  });

  const passCount = GRADE_KEYS.filter((g) => g !== "F").reduce(
    (acc, g) => acc + counts[g].total,
    0
  );
  const failCount = counts["F"].total;
  const passFemale = GRADE_KEYS.filter((g) => g !== "F").reduce(
    (acc, g) => acc + counts[g].f,
    0
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm no-print">
        <div>
          <h2 className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5">
            <span>🎯</span> វិភាគនិទ្ទេស A–F
          </h2>
          <p className="text-xs text-slate-500 font-medium">ថ្នាក់ទី {selClass}</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700">មុខវិជ្ជា:</label>
          <select
            value={grpKey}
            onChange={(e) => setGrpKey(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-950 outline-none focus:border-blue-600 bg-slate-50"
          >
            <option value="all">មុខវិជ្ជាទាំងអស់</option>
            <option value="khmer">📖 ភាសាខ្មែរ</option>
            <option value="math">🔢 គណិតវិទ្យា</option>
            <option value="sci">🔬 វិទ្យា+សង្គម</option>
          </select>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-sky-900">{students.length}</div>
          <div className="text-[11px] font-bold text-slate-500 mt-0.5">សិស្សសរុប</div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-emerald-700">
            {passCount}
            <span className="text-xs font-semibold ml-1">
              ({totalEvaluated > 0 ? ((passCount / totalEvaluated) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="text-[11px] font-bold text-slate-500 mt-0.5">✅ ជាប់</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-red-600">
            {failCount}
            <span className="text-xs font-semibold ml-1">
              ({totalEvaluated > 0 ? ((failCount / totalEvaluated) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          <div className="text-[11px] font-bold text-slate-500 mt-0.5">❌ ធ្លាក់ (F)</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
          <div className="text-sm font-black text-purple-900">
            👩{passFemale} / 👦{passCount - passFemale}
          </div>
          <div className="text-[11px] font-bold text-slate-500 mt-0.5">ស្រី/ប្រុស ជាប់</div>
        </div>
      </div>

      {/* Grade distribution progress bars */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-extrabold text-blue-950 text-xs">📊 {grp.label}</h3>

        {GRADE_KEYS.map((g) => {
          const c = counts[g];
          const pct = totalEvaluated > 0 ? (c.total / totalEvaluated) * 100 : 0;
          const gc = GRADE_COLORS[g];

          return (
            <div key={g} className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-xl ${gc.bg} flex items-center justify-center font-black text-sm ${gc.text} flex-shrink-0`}
              >
                {g}
              </div>

              <div className="flex-1 min-w-0">
                <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full ${gc.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${pct.toFixed(1)}%` }}
                  />
                </div>
                <div className="flex gap-3 text-[10px] font-bold text-slate-500">
                  <span className="text-pink-600">👩 {c.f}</span>
                  <span className="text-blue-600">👦 {c.m}</span>
                </div>
              </div>

              <div className="min-w-[80px] text-right text-xs font-bold">
                <span className={gc.text}>{c.total}នាក់</span>
                <span className="text-slate-400 font-normal text-[11px] ml-1">
                  ({pct.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Student List grouped by Grade */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-800 text-white font-extrabold text-xs">
          📋 បញ្ជីសិស្សតាមនិទ្ទេស
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2 px-3 text-center w-10">ល.រ</th>
                <th className="py-2 px-3 text-left">ឈ្មោះសិស្ស</th>
                <th className="py-2 px-3 text-center w-12">ភេទ</th>
                <th className="py-2 px-3 text-center w-20">មធ្យមភាគ</th>
                <th className="py-2 px-3 text-center w-16">និទ្ទេស</th>
                <th className="py-2 px-3 text-center w-16">លទ្ធផល</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {validRows
                .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
                .map((r, i) => {
                  const gc = GRADE_COLORS[r.grade || "F"];
                  const pass = (r.avg ?? 0) >= 5;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-400 font-semibold">{i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">
                        {r.lastName} {r.firstName}
                      </td>
                      <td className="py-2 px-3 text-center">{r.gender === "ស្រី" ? "👩" : "👨"}</td>
                      <td className="py-2 px-3 text-center font-extrabold text-slate-900">
                        {r.avg !== null ? fmtAvg(r.avg) : "—"}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] ${gc.bg} ${gc.text}`}
                        >
                          {r.grade}
                        </span>
                      </td>
                      <td
                        className={`py-2 px-3 text-center font-bold ${
                          pass ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {resultOf(r.avg ?? 0)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
