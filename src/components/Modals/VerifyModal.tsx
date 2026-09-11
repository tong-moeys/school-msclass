import React from "react";
import { Student, ScoreMap } from "../../types";
import { getAvg, getRank, gradeOf, resultOf, fmtAvg } from "../../lib/constants";

interface VerifyModalProps {
  isOpen: boolean;
  student: Student | null;
  selClass: string;
  schoolName: string;
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  onClose: () => void;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({
  isOpen,
  student,
  selClass,
  schoolName,
  students,
  scoresMap,
  onClose,
}) => {
  if (!isOpen || !student) return null;

  const annualAvg = getAvg(student.id, students, scoresMap);
  const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
  const grade = avgVal !== null ? gradeOf(avgVal) : { l: "—", c: "#6b7280" };
  const rank = getRank(student.id, students, scoresMap);
  const resultText = avgVal !== null ? resultOf(avgVal) : "—";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border-2 border-emerald-500 text-center animate-fade-in"
      >
        <div className="text-4xl mb-2">✅</div>
        <h3 className="text-emerald-700 font-black text-base mb-1">
          ព័ត៌មានផ្ទៀងផ្ទាត់ត្រឹមត្រូវ
        </h3>
        <p className="text-[11px] text-slate-500 font-medium mb-4">
          Credential Verification Status: Verified
        </p>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-left text-xs leading-relaxed text-slate-800 space-y-1.5 font-medium">
          <div>
            <strong>ឈ្មោះសិស្ស ៖</strong> {student.lastName} {student.firstName} ({student.gender})
          </div>
          <div>
            <strong>ថ្ងៃខែឆ្នាំកំណើត ៖</strong> {student.dob || "—"}
          </div>
          <div>
            <strong>ថ្នាក់ទី ៖</strong> {selClass} · {schoolName}
          </div>

          <div className="border-t border-dashed border-emerald-300 my-2 pt-2 flex flex-wrap gap-2">
            <span>
              <strong>មធ្យមភាគ ៖</strong> {avgVal !== null ? fmtAvg(avgVal) : "—"}
            </span>
            <span>|</span>
            <span>
              <strong>និទ្ទេស ៖</strong>{" "}
              <span className="font-black" style={{ color: grade.c }}>
                {grade.l}
              </span>
            </span>
            <span>|</span>
            <span>
              <strong>ចំណាត់ថ្នាក់ ៖</strong> {rank}
            </span>
          </div>

          <div>
            <strong>លទ្ធផលចុងក្រោយ ៖</strong>{" "}
            <span
              className={`font-extrabold ${
                resultText === "ជាប់" ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {resultText}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 bg-emerald-700 text-white font-extrabold text-xs px-6 py-2 rounded-xl hover:bg-emerald-800 transition"
        >
          បិទ (Close)
        </button>
      </div>
    </div>
  );
};
