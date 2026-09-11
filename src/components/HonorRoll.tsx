import React from "react";
import { Student, ScoreMap } from "../types";
import { buildRankedList, getAvg, gradeOf, fmtAvg } from "../lib/constants";
import { buildHonorAllPrintHTML, buildHonorTop5PrintHTML } from "../lib/printUtilsHelpers";
import { printHTML } from "../lib/printUtils";

interface HonorRollProps {
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  honorPhotos: Record<string, string>;
  selClass: string;
  semester: string;
  selMonth: number;
  teacher: any;
  onOpenPhotoModal: (id: string, name: string, gender: string) => void;
}

export const HonorRoll: React.FC<HonorRollProps> = ({
  students,
  scoresMap,
  honorPhotos,
  selClass,
  semester,
  selMonth,
  teacher,
  onOpenPhotoModal,
}) => {
  if (!students.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-3xl mb-2">🏆</div>
        <div className="text-xs font-semibold">មិនទាន់មានសិស្ស</div>
      </div>
    );
  }

  const ranked = buildRankedList(students, scoresMap);
  const MEDAL = ["🥇", "🥈", "🥉", "④", "⑤"];

  const handlePrintAll = () => {
    const html = buildHonorAllPrintHTML(ranked, honorPhotos, selClass, semester, selMonth, teacher, scoresMap);
    printHTML(html);
  };

  const handlePrintTop5 = () => {
    const html = buildHonorTop5PrintHTML(ranked, honorPhotos, selClass, semester, selMonth, teacher, scoresMap);
    printHTML(html);
  };

  return (
    <div className="p-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 mb-4 shadow-sm no-print">
        <div>
          <h2 className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5">
            <span>🏆</span> តារាងកិត្តិយស (Honor Roll)
          </h2>
          <p className="text-xs text-slate-500 font-medium">ថ្នាក់ទី {selClass}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrintAll}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1 shadow-sm"
          >
            <span>🖨️</span> ព្រីន តារាងទាំងអស់
          </button>
          <button
            onClick={handlePrintTop5}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1 shadow-sm"
          >
            <span>🥇</span> ព្រីន Rank 1–5
          </button>
        </div>
      </div>

      {/* Grid of Student Honor Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {ranked.map((s) => {
          const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
          const avg = getAvg(s.id, students, scoresMap);
          const grade = gradeOf(avg);
          const photo = honorPhotos[s.id] || s.photoUrl;
          const rank = s._rank || 1;
          const isTop3 = rank <= 3;
          const medal = rank <= 5 ? MEDAL[rank - 1] : "";

          const borderCol =
            rank === 1
              ? "border-amber-400 bg-amber-50/20"
              : rank === 2
              ? "border-slate-300 bg-slate-50/50"
              : rank === 3
              ? "border-amber-700 bg-amber-50/10"
              : "border-slate-200 bg-white";

          return (
            <div
              key={s.id}
              className={`border-2 rounded-2xl p-3 text-center relative shadow-sm hover:shadow-md transition ${borderCol}`}
            >
              {medal && (
                <div className="absolute -top-3 right-2 text-2xl drop-shadow">{medal}</div>
              )}

              <div className="text-[10px] font-extrabold text-slate-400 mb-1 text-left">
                #{rank}
              </div>

              {/* Avatar circle */}
              <div
                onClick={() => onOpenPhotoModal(s.id, fullName, s.gender)}
                className="w-20 h-20 rounded-full mx-auto mb-2 overflow-hidden border-2 border-slate-300 bg-slate-100 flex items-center justify-center cursor-pointer relative group flex-shrink-0"
              >
                {photo ? (
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{s.gender === "ស្រី" ? "👩" : "👨"}</span>
                )}
                <div className="absolute inset-0 bg-black/40 text-white text-[9px] font-bold flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition">
                  📷 កែរូប
                </div>
              </div>

              <div className="font-extrabold text-xs text-blue-950 truncate mb-1" title={fullName}>
                {fullName}
              </div>

              <div className="text-sm font-black text-indigo-900 mb-1">{fmtAvg(avg)}</div>

              <div
                className="inline-block px-2.5 py-0.5 rounded-full text-white font-black text-[10px]"
                style={{ backgroundColor: grade.c }}
              >
                និទ្ទេស {grade.l}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
