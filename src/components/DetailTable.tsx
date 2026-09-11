import React from "react";
import { Student, ScoreMap } from "../types";
import { SEMESTERS, MONTHS, fmtAvg, gradeOf, buildRankedList } from "../lib/constants";

interface DetailTableProps {
  students: Student[];
  semesterId: string;
  onSemesterChange: (semId: string) => void;
  allMonthsScores: Record<string, Record<string, ScoreMap>>; // key: `${semId}_${monthIdx}`
}

export const DetailTable: React.FC<DetailTableProps> = ({
  students,
  semesterId,
  onSemesterChange,
  allMonthsScores,
}) => {
  if (!students.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-3xl mb-2">📊</div>
        <div className="text-xs font-semibold">មិនទាន់មានសិស្ស</div>
      </div>
    );
  }

  const cs = SEMESTERS.find((s) => s.id === semesterId) || SEMESTERS[0];
  const months = cs.months;

  const getMonthAvg = (sid: string, mIdx: number) => {
    const key = `${semesterId}_${mIdx}`;
    const monthData = allMonthsScores[key] || {};
    const stuScores = monthData[sid] || {};
    const keys = Object.keys(stuScores).filter((k) => stuScores[k] !== "" && !isNaN(Number(stuScores[k])));
    if (!keys.length) return null;
    const sum = keys.reduce((acc, k) => acc + Number(stuScores[k]), 0);
    return sum / keys.length;
  };

  const ranked = buildRankedList(students, {});

  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-2 mb-2.5 no-print flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <span>📅 ជ្រើសរើសឆមាស:</span>
          <select
            value={semesterId}
            onChange={(e) => onSemesterChange(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs cursor-pointer"
          >
            {SEMESTERS.filter((s) => s.id !== "annual").map((sm) => (
              <option key={sm.id} value={sm.id}>
                {sm.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-xs text-left text-slate-700 border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white font-bold text-[10px] whitespace-nowrap">
              <th className="py-2.5 px-2 text-center w-8">ល.រ</th>
              <th className="py-2.5 px-2.5 text-left min-w-[140px]">គោត្តនាម-នាម</th>
              <th className="py-2.5 px-2 text-center w-10">ភេទ</th>
              <th className="py-2.5 px-2 text-center min-w-[90px]">ថ្ងៃខែឆ្នាំកំណើត</th>
              {months.map((mIdx) => (
                <th key={mIdx} className="py-2.5 px-2 text-center min-w-[55px]">
                  ខែ{MONTHS[mIdx]}
                </th>
              ))}
              <th className="py-2.5 px-2 text-center bg-blue-900 text-white min-w-[70px]">
                ម.ប្រចាំខែ
              </th>
              <th className="py-2.5 px-2 text-center bg-indigo-950 text-white min-w-[70px]">
                ម.ប្រចាំឆមាស
              </th>
              <th className="py-2.5 px-2 text-center w-12">ចំ.ថ្នាក់</th>
              <th className="py-2.5 px-2 text-center w-12">និទ្ទេស</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {ranked.map((s, idx) => {
              const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
              const mAvgs = months.map((m) => getMonthAvg(s.id, m));
              const validMAvgs = mAvgs.filter((v): v is number => v !== null);

              const monthlyAvg =
                validMAvgs.length > 0
                  ? validMAvgs.reduce((a, b) => a + b, 0) / validMAvgs.length
                  : null;

              const semAvg = monthlyAvg;
              const grade = gradeOf(semAvg ?? 0);

              return (
                <tr key={s.id} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                  <td className="py-2.5 px-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-2.5 px-2.5 text-left font-bold text-slate-800">{fullName}</td>
                  <td className="py-2.5 px-2 text-center">{s.gender === "ស្រី" ? "👩" : "👨"}</td>
                  <td className="py-2.5 px-2 text-center text-slate-500">{s.dob || "—"}</td>

                  {months.map((mIdx, i) => {
                    const v = mAvgs[i];
                    return (
                      <td key={mIdx} className="py-2.5 px-2 text-center font-bold">
                        {v !== null ? (
                          <span className={v >= 5 ? "text-emerald-600" : "text-red-600"}>
                            {fmtAvg(v)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="py-2.5 px-2 text-center bg-blue-50 font-extrabold text-blue-900">
                    {monthlyAvg !== null ? fmtAvg(monthlyAvg) : "—"}
                  </td>
                  <td className="py-2.5 px-2 text-center bg-indigo-50 font-extrabold text-indigo-950">
                    {semAvg !== null ? fmtAvg(semAvg) : "—"}
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold text-slate-700">{s._rank || idx + 1}</td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-white font-extrabold text-[11px]"
                      style={{ backgroundColor: grade.c }}
                    >
                      {grade.l}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
