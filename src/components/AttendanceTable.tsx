import React from "react";
import { Student, AttendanceMap } from "../types";

interface AttendanceTableProps {
  students: Student[];
  attendanceMap: Record<string, AttendanceMap>;
  editMode: boolean;
  onToggleAttendance: (studentId: string, day: number) => void;
  onOpenPhotoModal: (id: string, name: string, gender: string) => void;
  honorPhotos: Record<string, string>;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  students,
  attendanceMap,
  editMode,
  onToggleAttendance,
  onOpenPhotoModal,
  honorPhotos,
}) => {
  if (!students.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-3xl mb-2">✅</div>
        <div className="text-xs font-semibold">មិនទាន់មានសិស្ស</div>
      </div>
    );
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const getAtt = (sid: string, day: number) => attendanceMap[sid]?.[day] ?? "";
  const cntAtt = (sid: string, type: "P" | "A") =>
    days.filter((d) => getAtt(sid, d) === type).length;

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-4 bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-semibold">
        <span className="text-emerald-700">✅ P = មានច្បាប់ (Present)</span>
        <span className="text-red-600">❌ A = ឥតច្បាប់ (Absent)</span>
        {editMode && <span className="text-slate-500">· ចុចលើប្រអប់ដើម្បីកែប្រែ</span>}
      </div>

      <table className="w-full text-xs text-left text-slate-700 border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white font-bold text-[10px] whitespace-nowrap sticky top-0 z-20">
            <th className="py-3 px-2 text-center w-8 sticky left-0 z-30 bg-slate-800">ល.រ</th>
            <th className="py-3 px-2.5 text-left min-w-[140px] sticky left-8 z-30 bg-slate-800">គោត្តនាម-នាម</th>
            <th className="py-3 px-2 text-center w-10 sticky left-[172px] z-30 bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">ភេទ</th>
            {days.map((d) => (
              <th key={d} className="py-3 px-1 text-center w-6 text-[9px]">
                {d}
              </th>
            ))}
            <th className="py-3 px-2 text-center bg-emerald-800 text-white w-12">ច្បាប់</th>
            <th className="py-3 px-2 text-center bg-red-800 text-white w-12">អត់</th>
            <th className="py-3 px-2 text-center bg-slate-700 text-white w-12">សរុប</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {students.map((s, idx) => {
            const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
            const photo = honorPhotos[s.id] || s.photoUrl;
            const p = cntAtt(s.id, "P");
            const a = cntAtt(s.id, "A");
            const cellBg = idx % 2 === 0 ? "bg-slate-50" : "bg-white";

            return (
              <tr
                key={s.id}
                className={idx % 2 === 0 ? "bg-slate-50/50 hover:bg-blue-50/30" : "bg-white hover:bg-blue-50/30"}
              >
                <td className={`py-2.5 px-2 text-center text-slate-400 font-bold sticky left-0 z-10 ${cellBg}`}>{idx + 1}</td>

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

                {days.map((day) => {
                  const val = getAtt(s.id, day);
                  let bg = "bg-transparent";
                  let text = "text-slate-300";

                  if (val === "P") {
                    bg = "bg-emerald-100";
                    text = "text-emerald-700 font-bold";
                  } else if (val === "A") {
                    bg = "bg-red-100";
                    text = "text-red-600 font-bold";
                  }

                  return (
                    <td
                      key={day}
                      onClick={() => editMode && onToggleAttendance(s.id, day)}
                      className={`py-1 px-1 text-center transition ${bg} ${
                        editMode ? "cursor-pointer hover:opacity-75" : ""
                      }`}
                    >
                      <span className={text}>{val || "·"}</span>
                    </td>
                  );
                })}

                <td className="py-1.5 px-2 text-center bg-slate-100 font-bold text-emerald-700">
                  {p}
                </td>
                <td className="py-1.5 px-2 text-center bg-slate-100 font-bold text-red-600">
                  {a}
                </td>
                <td className="py-1.5 px-2 text-center bg-slate-200 font-extrabold text-slate-800">
                  {p + a}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
