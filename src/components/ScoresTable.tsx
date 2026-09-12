import React, { useState } from "react";
import { Student, ScoreMap, ScoreDisplayMode } from "../types";
import { SUBJECTS, getTotal, getAvg, getRank, resultOf, gradeOf, fmtAvg, fmtTotal, fmtScore } from "../lib/constants";
import { ScoreDisplayToggle, GradeBadge } from "./ScoreDisplayToggle";

interface ScoresTableProps {
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  editMode: boolean;
  onUpdateScore: (studentId: string, subject: string, value: number | "") => void;
  onOpenPhotoModal: (id: string, name: string, gender: string) => void;
  honorPhotos: Record<string, string>;
  displayMode?: ScoreDisplayMode;
  onDisplayModeChange?: (mode: ScoreDisplayMode) => void;
}

export const ScoresTable: React.FC<ScoresTableProps> = ({
  students,
  scoresMap,
  editMode,
  onUpdateScore,
  onOpenPhotoModal,
  honorPhotos,
  displayMode: externalMode,
  onDisplayModeChange,
}) => {
  const [internalMode, setInternalMode] = useState<ScoreDisplayMode>("both");
  const mode = externalMode ?? internalMode;
  const setMode = (m: ScoreDisplayMode) => {
    setInternalMode(m);
    if (onDisplayModeChange) onDisplayModeChange(m);
  };

  if (!students.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-3xl mb-2">📝</div>
        <div className="text-xs font-semibold">មិនទាន់មានសិស្ស</div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3 space-y-2">
      {/* Control Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-2 rounded-xl border border-slate-200 shadow-2xs no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-800">📝 តារាងពិន្ទុប្រចាំខែ</span>
          <span className="text-slate-400">·</span>
          <span className="text-[11px] font-bold text-slate-500">{students.length} នាក់</span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreDisplayToggle mode={mode} onChange={setMode} compact={true} />
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-xs text-left text-slate-700 border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white font-bold text-[10px] whitespace-nowrap sticky top-0 z-20">
            <th className="py-3 px-2 text-center w-8 sticky left-0 z-30 bg-slate-800">ល.រ</th>
            <th className="py-3 px-2.5 text-left min-w-[140px] sticky left-8 z-30 bg-slate-800">គោត្តនាម-នាម</th>
            <th className="py-3 px-2 text-center w-10 sticky left-[172px] z-30 bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">ភេទ</th>
            {SUBJECTS.map((subj) => (
              <th key={subj} className="py-3 px-1.5 text-center min-w-[50px]">
                {subj}
              </th>
            ))}
            <th className="py-3 px-2 text-center bg-slate-700 w-16">ពិន្ទុសរុប</th>
            <th className={`py-3 px-2 text-center w-16 ${mode === 'avg' || mode === 'both' ? 'bg-blue-900 text-amber-300 font-black' : 'bg-slate-700'}`}>
              មធ្យមភាគ
            </th>
            <th className="py-3 px-2 text-center bg-slate-700 w-12">ចំ.ថ្នាក់</th>
            <th className="py-3 px-2 text-center w-14">លទ្ធផល</th>
            <th className={`py-3 px-2 text-center w-14 ${mode === 'grade' || mode === 'both' ? 'bg-amber-900 text-amber-200 font-black' : 'bg-slate-700'}`}>
              និទ្ទេស
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {students.map((s, idx) => {
            const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
            const photo = honorPhotos[s.id] || s.photoUrl;
            const total = getTotal(s.id, scoresMap);
            const avg = getAvg(s.id, students, scoresMap);
            const rank = getRank(s.id, students, scoresMap);
            const passFail = resultOf(avg);
            const grade = gradeOf(avg);
            const cellBg = idx % 2 === 0 ? "bg-slate-50" : "bg-white";

            return (
              <tr
                key={s.id}
                className={idx % 2 === 0 ? "bg-slate-50/50 hover:bg-blue-50/30" : "bg-white hover:bg-blue-50/30"}
              >
                <td className={`py-2.5 px-2 text-center text-slate-400 font-bold sticky left-0 z-10 ${cellBg}`}>{idx + 1}</td>

                {/* Name */}
                <td className={`py-2.5 px-2.5 text-left whitespace-nowrap font-bold text-slate-800 sticky left-8 z-10 ${cellBg}`}>
                  <div
                    onClick={() => onOpenPhotoModal(s.id, fullName, s.gender)}
                    className="flex items-center justify-start gap-1.5 cursor-pointer hover:text-blue-600"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-blue-400 bg-slate-100 flex items-center justify-center flex-shrink-0">
                      {photo ? (
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px]">{s.gender === "ស្រី" ? "👩" : "👨"}</span>
                      )}
                    </div>
                    <span className="text-left">{fullName}</span>
                  </div>
                </td>

                <td className={`py-2.5 px-1 text-center font-semibold text-slate-500 sticky left-[172px] z-10 ${cellBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                  {s.gender === "ស្រី" ? "👩" : "👨"}
                </td>

                {/* Subject score inputs/cells */}
                {SUBJECTS.map((subj) => {
                  const val = scoresMap[s.id]?.[subj] ?? "";
                  const subGrade = val !== "" && !isNaN(Number(val)) ? gradeOf(Number(val)) : null;

                  return (
                    <td key={subj} className="py-1 px-1 text-center">
                      {editMode ? (
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.25}
                          value={val}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              onUpdateScore(s.id, subj, "");
                              return;
                            }
                            let num = parseFloat(raw);
                            if (isNaN(num)) {
                              onUpdateScore(s.id, subj, "");
                              return;
                            }
                            if (num < 0) num = 0;
                            if (num > 10) num = 10;
                            onUpdateScore(s.id, subj, num);
                          }}
                          placeholder="—"
                          className="w-11 text-center border border-blue-300 rounded py-0.5 text-xs outline-none focus:border-blue-600 font-semibold"
                        />
                      ) : val === "" || val === undefined ? (
                        <span className="text-slate-300 font-bold">—</span>
                      ) : mode === "grade" ? (
                        subGrade ? (
                          <GradeBadge letter={subGrade.l} color={subGrade.c} size="xs" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )
                      ) : mode === "avg" ? (
                        <span
                          className={`font-bold ${
                            Number(val) >= 5 ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {fmtScore(val)}
                        </span>
                      ) : (
                        /* both */
                        <div className="inline-flex items-center justify-center gap-1">
                          <span
                            className={`font-bold ${
                              Number(val) >= 5 ? "text-emerald-700" : "text-red-600"
                            }`}
                          >
                            {fmtScore(val)}
                          </span>
                          {subGrade && subGrade.l !== "—" && (
                            <GradeBadge letter={subGrade.l} color={subGrade.c} size="xs" />
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}

                {/* Calculated fields */}
                <td className="py-2 px-2 text-center bg-slate-100 font-extrabold text-blue-900">
                  {fmtTotal(total)}
                </td>
                <td className="py-2 px-2 text-center bg-slate-100 font-extrabold text-indigo-900">
                  {mode === "grade" ? (
                    <GradeBadge letter={grade.l} color={grade.c} size="xs" />
                  ) : mode === "both" ? (
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>{fmtAvg(avg)}</span>
                      <GradeBadge letter={grade.l} color={grade.c} size="xs" />
                    </div>
                  ) : (
                    fmtAvg(avg)
                  )}
                </td>
                <td className="py-2 px-2 text-center bg-slate-100 font-extrabold text-slate-800">
                  {rank}
                </td>
                <td
                  className={`py-2 px-2 text-center font-bold text-[11px] ${
                    avg >= 5 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {passFail}
                </td>
                <td className="py-2 px-2 text-center">
                  {grade.l !== "—" ? (
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-white font-extrabold text-[11px]"
                      style={{ backgroundColor: grade.c }}
                    >
                      {grade.l}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-bold">—</span>
                  )}
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
