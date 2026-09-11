import React from "react";
import { Student } from "../types";
import { calcAge } from "../lib/constants";

interface StudentTableProps {
  students: Student[];
  editMode: boolean;
  honorPhotos: Record<string, string>;
  onUpdateStudent: (id: string, updated: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
  onOpenPhotoModal: (id: string, name: string, gender: string) => void;
  onTriggerAutoSave: () => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  editMode,
  honorPhotos,
  onUpdateStudent,
  onDeleteStudent,
  onOpenPhotoModal,
  onTriggerAutoSave,
}) => {
  if (!students.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-3xl mb-2">👤</div>
        <div className="text-xs font-semibold">មិនទាន់មានសិស្ស — ចុច ➕ ដើម្បីបន្ថែម</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left text-slate-700 border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white font-bold text-[11px] whitespace-nowrap sticky top-0 z-20">
            <th className="py-3 px-2 text-center w-8 sticky left-0 z-30 bg-slate-800">ល.រ</th>
            <th className="py-3 px-2.5 text-left min-w-[160px] sticky left-8 z-30 bg-slate-800">គោត្តនាម-នាម</th>
            <th className="py-3 px-2 text-center w-16 sticky left-[192px] z-30 bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">ភេទ</th>
            <th className="py-3 px-2 text-center min-w-[110px]">ថ្ងៃខែឆ្នាំកំណើត</th>
            <th className="py-3 px-2 text-center w-14">អាយុ</th>
            <th className="py-3 px-2 text-left min-w-[100px]">ឈ្មោះឪពុក</th>
            <th className="py-3 px-2 text-left min-w-[90px]">មុខរបរឪពុក</th>
            <th className="py-3 px-2 text-left min-w-[100px]">ឈ្មោះម្តាយ</th>
            <th className="py-3 px-2 text-left min-w-[90px]">មុខរបរម្តាយ</th>
            <th className="py-3 px-2 text-left min-w-[90px] whitespace-nowrap">ភូមិ</th>
            <th className="py-3 px-2 text-left min-w-[90px] whitespace-nowrap">ឃុំ</th>
            <th className="py-3 px-2 text-left min-w-[90px] whitespace-nowrap">ស្រុក</th>
            <th className="py-3 px-2 text-left min-w-[90px] whitespace-nowrap">ខេត្ត</th>
            <th className="py-3 px-2 text-left min-w-[100px] whitespace-nowrap">ទូរស័ព្ទ</th>
            <th className="py-3 px-2 text-center w-12 sticky right-0 z-30 bg-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.3)]">លុប</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {students.map((s, idx) => {
            const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
            const photo = honorPhotos[s.id] || s.photoUrl;
            const computedAge = s.age || (s.dob ? calcAge(s.dob) : "");
            const cellBg = idx % 2 === 0 ? "bg-slate-50" : "bg-white";

            return (
              <tr
                key={s.id}
                className={idx % 2 === 0 ? "bg-slate-50/50 hover:bg-blue-50/30" : "bg-white hover:bg-blue-50/30"}
              >
                <td className={`py-2.5 px-2 text-center text-slate-400 font-bold sticky left-0 z-10 ${cellBg}`}>{idx + 1}</td>

                {/* Name & Photo */}
                <td className={`py-2.5 px-2.5 text-left sticky left-8 z-10 ${cellBg}`}>
                  {editMode ? (
                    <div className="flex gap-1 items-center justify-start">
                      <input
                        type="text"
                        value={s.lastName || ""}
                        onChange={(e) => {
                          onUpdateStudent(s.id, { lastName: e.target.value });
                          onTriggerAutoSave();
                        }}
                        placeholder="គោត្តនាម"
                        className="w-20 border border-blue-300 rounded px-1.5 py-1 text-xs outline-none focus:border-blue-600 font-semibold"
                      />
                      <input
                        type="text"
                        value={s.firstName || ""}
                        onChange={(e) => {
                          onUpdateStudent(s.id, { firstName: e.target.value });
                          onTriggerAutoSave();
                        }}
                        placeholder="នាម"
                        className="w-16 border border-blue-300 rounded px-1.5 py-1 text-xs outline-none focus:border-blue-600 font-semibold"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => onOpenPhotoModal(s.id, fullName, s.gender)}
                      className="flex items-center justify-start gap-2 font-bold text-slate-800 cursor-pointer hover:text-blue-600 group"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-blue-400 bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:border-blue-600 transition">
                        {photo ? (
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs">{s.gender === "ស្រី" ? "👩" : "👨"}</span>
                        )}
                      </div>
                      <span className="text-left">{fullName}</span>
                    </div>
                  )}
                </td>

                {/* Gender */}
                <td className={`py-2 px-2 text-center sticky left-[192px] z-10 ${cellBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                  {editMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        const newGender = s.gender === "ស្រី" ? "ប្រុស" : "ស្រី";
                        onUpdateStudent(s.id, { gender: newGender });
                        onTriggerAutoSave();
                      }}
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                        s.gender === "ស្រី" ? "bg-pink-100 text-pink-800 hover:bg-pink-200" : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                      }`}
                      title="ចុចដើម្បីប្តូរភេទ"
                    >
                      {s.gender === "ស្រី" ? "👩 ស្រី" : "👨 ប្រុស"}
                    </button>
                  ) : (
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.gender === "ស្រី" ? "bg-pink-100 text-pink-800" : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {s.gender === "ស្រី" ? "👩 ស្រី" : "👨 ប្រុស"}
                    </span>
                  )}
                </td>

                {/* Date of Birth */}
                <td className="py-2 px-2 text-center">
                  {editMode ? (
                    <input
                      type="date"
                      value={s.dob || ""}
                      onChange={(e) => {
                        const newDob = e.target.value;
                        const newAge = calcAge(newDob);
                        onUpdateStudent(s.id, { dob: newDob, age: newAge });
                        onTriggerAutoSave();
                      }}
                      className="border border-blue-300 rounded px-1.5 py-1 text-xs outline-none"
                    />
                  ) : (
                    <span className="text-slate-600">{s.dob || "—"}</span>
                  )}
                </td>

                {/* Age */}
                <td className="py-2 px-2 text-center">
                  {computedAge ? (
                    <span className="bg-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded text-[11px]">
                      {computedAge}ឆ្នាំ
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                {/* Parents Info & Address */}
                {(
                  [
                    "fatherName",
                    "fatherJob",
                    "motherName",
                    "motherJob",
                    "village",
                    "commune",
                    "district",
                    "province",
                    "phone",
                  ] as const
                ).map((field) => (
                  <td key={field} className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                    {editMode ? (
                      <input
                        type="text"
                        value={s[field] || ""}
                        onChange={(e) => {
                          onUpdateStudent(s.id, { [field]: e.target.value });
                          onTriggerAutoSave();
                        }}
                        className="w-full border border-blue-300 rounded px-1.5 py-1 text-xs outline-none min-w-[70px]"
                      />
                    ) : (
                      s[field] || "—"
                    )}
                  </td>
                ))}

                {/* Delete button (always accessible) */}
                <td className={`py-2 px-2 text-center sticky right-0 z-10 ${cellBg} shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                  <button
                    type="button"
                    onClick={() => onDeleteStudent(s.id)}
                    className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded px-2 py-1 text-xs font-bold transition flex items-center justify-center mx-auto shadow-2xs"
                    title={`លុបសិស្ស ${fullName}`}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
