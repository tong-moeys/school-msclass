import React from "react";
import { BASELINE_PRI_DATA, PriGradeBlock } from "../../data/schoolOfficialData";
import { TeacherProfile } from "../../types";

interface PriScoresReportProps {
  teacher: TeacherProfile | null;
  reporterName?: string;
  reporterRole?: string;
  directorName?: string;
  directorPhone?: string;
  dates?: {
    d0: { lunar: string; solar: string };
    d1: { lunar: string; solar: string };
    d2: { lunar: string; solar: string };
  };
  customGradeBlocks?: PriGradeBlock[];
}

export const PriScoresReport: React.FC<PriScoresReportProps> = ({
  teacher,
  reporterName = "លេង ចាន់ថាវ",
  reporterRole = "គ្រូបង្រៀន",
  directorName,
  directorPhone = "0976858898",
  dates,
  customGradeBlocks,
}) => {
  const province = teacher?.province || "បន្ទាយមានជ័យ";
  const district = teacher?.district || "ភ្នំស្រុក";
  const commune = teacher?.commune || "ស្ពានស្រែង";
  const school = teacher?.school || "សាលាបឋមសិក្សា រោគ";
  const village = (teacher?.village || "រោគ").trim();
  const villagePrefix = village.startsWith("ភូមិ") ? `${village}, ` : `ភូមិ${village}, `;
  const phone = teacher?.phone || directorPhone;
  const director = directorName || teacher?.fullName || "";
  const displayBlocks = customGradeBlocks && customGradeBlocks.length > 0 ? customGradeBlocks : BASELINE_PRI_DATA;

  return (
    <div className="text-slate-900 bg-white leading-relaxed text-xs">
      {/* Official Header */}
      <div className="flex justify-between items-start mb-4">
        {/* Top Left: Department */}
        <div className="text-[11px] font-bold text-slate-800 leading-tight">
          <div>ក្រសួងអប់រំ យុវជន និងកីឡា</div>
          <div>នាយកដ្ឋានធានាគុណភាពអប់រំ</div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            អាសយដ្ឋាន៖ អគារលេខ 169 មហាវិថីព្រះនរោត្តម រាជធានីភ្នំពេញ
          </div>
        </div>

        {/* Center: National Motto */}
        <div className="text-center">
          <div className="text-sm font-black tracking-wider text-slate-950">ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div className="text-xs font-bold text-slate-800">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
          <div className="text-xs font-bold text-slate-600 mt-0.5">꧁ ༺ ༻ ꧂</div>
        </div>

        {/* Top Right: PRI Circle Emblem */}
        <div className="w-11 h-11 rounded-full border-2 border-slate-900 flex items-center justify-center font-black text-xs text-slate-900 shadow-2xs">
          PRI
        </div>
      </div>

      {/* Title */}
      <div className="text-center my-3">
        <h2 className="text-sm sm:text-base font-black text-slate-950 font-hanuman">
          តារាងសរុបពិន្ទុសិស្សតាមមុខវិជ្ជាសម្រាប់បឋមសិក្សា ( ពីថ្នាក់ទី១ដល់ថ្នាក់ទី៦ )
        </h2>
        <div className="text-xs font-black text-slate-900 mt-0.5">
          ឆ្នាំសិក្សា២០២៥-២០២៦
        </div>
      </div>

      {/* Red Instructions */}
      <div className="text-[10.5px] text-red-600 font-bold space-y-0.5 mb-3 leading-snug">
        <div>* សូមផ្ញើទៅការិយាល័យអប់រំក្រុង/ស្រុក/ខណ្ឌវិញឲ្យបានមុនថ្ងៃទី ១៥/១០/២០២៦ ម៉ោង០០:០០</div>
        <div>* សូមអានសេចក្តីណែនាំមុននឹងបំពេញ សូមបំពេញជាលេខអារ៉ាប់ ហើយបំពេញដោយប្រុងប្រយ័ត្ន</div>
      </div>

      {/* Metadata Bar */}
      <div className="border border-slate-900/60 p-2 rounded-sm text-[11px] font-bold text-slate-900 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50/50">
        <div>
          <span>អាសយដ្ឋាន: រាជធានី/ខេត្ត: </span>
          <span className="font-normal text-slate-800">{province}</span>
        </div>
        <div>
          <span>ក្រុង/ស្រុក/ខណ្ឌ: </span>
          <span className="font-normal text-slate-800">{district}</span>
        </div>
        <div>
          <span>ឃុំ/សង្កាត់: </span>
          <span className="font-normal text-slate-800">{commune}</span>
        </div>
        <div>
          <span>សាលារៀន: </span>
          <span className="font-normal text-slate-800">{school}</span>
        </div>
        <div>
          <span>ឈ្មោះនាយក/នាយិកា: </span>
          <span className="font-normal text-slate-800">{director}</span>
        </div>
        <div>
          <span>ទូរស័ព្ទ: </span>
          <span className="font-normal text-slate-800">{phone}</span>
        </div>
      </div>

      {/* Tables for each Grade 1 to 6 */}
      <div className="space-y-6">
        {displayBlocks.map((block) => (
          <div key={block.gradeNum} className="space-y-1">
            <div className="font-black text-slate-950 text-xs">
              ថ្នាក់ទី{block.gradeNum}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-900 text-center text-[10.5px]">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-900">
                    <th rowSpan={2} className="border border-slate-900 px-2 py-1 text-left w-36">
                      មុខវិជ្ជា
                    </th>
                    <th rowSpan={2} className="border border-slate-900 px-1 py-1 w-10">
                      ភេទ
                    </th>
                    <th colSpan={11} className="border border-slate-900 py-0.5">
                      ចំនួនសិស្សស្រី/ប្រុសតាមកម្រិតពិន្ទុ និងមុខវិជ្ជា
                    </th>
                    <th rowSpan={2} className="border border-slate-900 px-1 py-1 w-12 font-bold">
                      សរុប
                    </th>
                    <th rowSpan={2} className="border border-slate-900 px-1 py-1 w-14 font-bold">
                      ចំនួន<br />សិស្សជាប់
                    </th>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-b border-slate-900">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <th key={score} className="border border-slate-900 px-1 py-0.5 w-6">
                        {score}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {block.subjects.map((sub, sIdx) => {
                    const isEven = Math.floor(sIdx / 2) % 2 === 0;
                    return (
                      <tr
                        key={`${sub.subject}-${sub.gender}`}
                        className={`border-b border-slate-400 ${isEven ? "bg-white" : "bg-slate-50/40"}`}
                      >
                        {/* Only print subject name on the female (first) row */}
                        {sub.gender === "ស្រី" ? (
                          <td
                            rowSpan={2}
                            className="border border-slate-900 px-2 py-1 text-left font-bold text-slate-950 align-middle bg-white"
                          >
                            {sub.subject}
                          </td>
                        ) : null}

                        <td
                          className={`border border-slate-900 px-1 py-1 font-bold ${
                            sub.gender === "ស្រី" ? "text-emerald-800" : "text-blue-800"
                          }`}
                        >
                          {sub.gender}
                        </td>

                        {sub.scores.map((val, scIdx) => (
                          <td key={scIdx} className="border border-slate-900 px-1 py-1">
                            {val > 0 ? val : ""}
                          </td>
                        ))}

                        <td className="border border-slate-900 px-1 py-1 font-black bg-slate-100/60">
                          {sub.total}
                        </td>
                        <td className="border border-slate-900 px-1 py-1 font-black bg-emerald-50 text-emerald-950">
                          {sub.pass}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Official 2-Column Signatures Section Matching Page 2 of PDF 3/4 */}
      <div className="mt-10 pt-6 flex justify-between items-start text-xs gap-8 border-t border-slate-300">
        {/* Left: School Director Approval & Stamp */}
        <div className="flex-1 space-y-2">
          <div className="font-bold text-slate-950 text-sm">
            សាលារៀន ពិនិត្យ និង ឯកភាពដោយនាយកសាលារៀន
          </div>
          <div className="w-20 h-20 rounded-full border border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-500 my-2">
            ត្រាសាលារៀន
          </div>
          <div className="space-y-1 text-slate-800 text-[11px]">
            <div>ហត្ថលេខា: .....................................................</div>
            <div>ឈ្មោះ: {director || "....................................................."}</div>
            <div>ថ្ងៃទី: {dates ? `${villagePrefix}${dates.d1.solar}` : "........................................................."}</div>
          </div>
        </div>

        {/* Right: Filled By Reporter */}
        <div className="flex-1 space-y-2 text-left sm:text-right">
          <div className="font-bold text-slate-950 text-sm">
            បំពេញដោយ: <span className="font-bold text-slate-900">{reporterName}</span>
          </div>
          <div className="h-14"></div>
          <div className="space-y-1 text-slate-800 text-[11px]">
            <div>ហត្ថលេខា: .....................................................</div>
            <div>ឈ្មោះ: <span className="font-bold">{reporterName}</span></div>
            <div>តួនាទី: <span className="font-medium">{reporterRole}</span> &nbsp;&nbsp; ថ្ងៃទី: {dates ? `${villagePrefix}${dates.d0.solar}` : "........................"}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
