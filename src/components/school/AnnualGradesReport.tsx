import React from "react";
import { BASELINE_ANNUAL_CLASSES, AnnualClassStat } from "../../data/schoolOfficialData";
import { TeacherProfile } from "../../types";

interface AnnualGradesReportProps {
  teacher: TeacherProfile | null;
  dates: {
    d0: { lunar: string; solar: string };
    d1: { lunar: string; solar: string };
    d2: { lunar: string; solar: string };
  };
  reporterName?: string;
  clusterDirectorName?: string;
  schoolDirectorName?: string;
  customData?: Record<string, Partial<AnnualClassStat>>;
}

export const AnnualGradesReport: React.FC<AnnualGradesReportProps> = ({
  teacher,
  dates,
  reporterName = "លេង ចាន់ថាវ",
  clusterDirectorName = "ស្វាយ ចមេរ៉ាយ",
  schoolDirectorName,
  customData = {},
}) => {
  const province = teacher?.province || "បន្ទាយមានជ័យ";
  const district = teacher?.district || "ភ្នំស្រុក";
  const school = teacher?.school || "សាលាបឋមសិក្សា រោគ";
  const village = (teacher?.village || "រោគ").trim();
  const villagePrefix = village.startsWith("ភូមិ") ? `${village}, ` : `ភូមិ${village}, `;

  // Aggregate classes by grade level (1..6)
  const gradeMapping: Record<number, string[]> = {
    1: ["1A", "1B"],
    2: ["2A", "2B"],
    3: ["3A", "3B", "3ក"],
    4: ["4A", "4B"],
    5: ["5A", "5B"],
    6: ["6A", "6B", "ML", "HL"],
  };

  const gradeRows = [1, 2, 3, 4, 5, 6].map((gradeNum) => {
    const classList = gradeMapping[gradeNum] || [];
    const gradeStat = classList.reduce(
      (acc, cls) => {
        const base = BASELINE_ANNUAL_CLASSES.find((c) => c.cls === cls);
        const override = customData[cls];
        const r = override ? { ...base, ...override } : base;
        if (!r) return acc;
        return {
          total: acc.total + r.total,
          female: acc.female + r.female,
          examTotal: acc.examTotal + r.examTotal,
          examFemale: acc.examFemale + r.examFemale,
          passAvgTotal: acc.passAvgTotal + r.passAvgTotal,
          passAvgFemale: acc.passAvgFemale + r.passAvgFemale,
          retestTotal: acc.retestTotal + r.retestTotal,
          retestFemale: acc.retestFemale + r.retestFemale,
          passFinalTotal: acc.passFinalTotal + r.passFinalTotal,
          passFinalFemale: acc.passFinalFemale + r.passFinalFemale,
          repeatTotal: acc.repeatTotal + r.repeatTotal,
          repeatFemale: acc.repeatFemale + r.repeatFemale,
          dropTotal: acc.dropTotal + r.dropTotal,
          dropFemale: acc.dropFemale + r.dropFemale,
        };
      },
      {
        total: 0, female: 0,
        examTotal: 0, examFemale: 0,
        passAvgTotal: 0, passAvgFemale: 0,
        retestTotal: 0, retestFemale: 0,
        passFinalTotal: 0, passFinalFemale: 0,
        repeatTotal: 0, repeatFemale: 0,
        dropTotal: 0, dropFemale: 0,
      }
    );

    const gradeAvgs = classList
      .map((cls) => {
        const base = BASELINE_ANNUAL_CLASSES.find((c) => c.cls === cls);
        const override = customData[cls];
        const r = override ? { ...base, ...override } : base;
        return r && r.total > 0 && r.avg !== undefined && r.avg !== "—" && !isNaN(Number(r.avg)) && Number(r.avg) > 0
          ? Number(r.avg)
          : null;
      })
      .filter((v): v is number => v !== null);

    const gradeAvg = gradeAvgs.length > 0 ? (gradeAvgs.reduce((a, b) => a + b, 0) / gradeAvgs.length).toFixed(2) : "—";
    const gradeLetter = gradeAvg !== "—" ? (Number(gradeAvg) >= 8 ? "B" : Number(gradeAvg) >= 7 ? "C" : Number(gradeAvg) >= 6 ? "D" : "E") : "—";

    return { gradeNum, ...gradeStat, avg: gradeAvg, grade: gradeLetter };
  });

  const validAvgs = gradeRows
    .filter((r) => r.total > 0 && r.avg !== "—" && !isNaN(Number(r.avg)) && Number(r.avg) > 0)
    .map((r) => Number(r.avg));
  const schoolAvg = validAvgs.length > 0 ? (validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length).toFixed(2) : "—";
  const schoolGrade = validAvgs.length > 0 ? (Number(schoolAvg) >= 8 ? "B" : Number(schoolAvg) >= 7 ? "C" : Number(schoolAvg) >= 6 ? "D" : "E") : "—";

  const totals = gradeRows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      female: acc.female + r.female,
      examTotal: acc.examTotal + r.examTotal,
      examFemale: acc.examFemale + r.examFemale,
      passAvgTotal: acc.passAvgTotal + r.passAvgTotal,
      passAvgFemale: acc.passAvgFemale + r.passAvgFemale,
      retestTotal: acc.retestTotal + r.retestTotal,
      retestFemale: acc.retestFemale + r.retestFemale,
      passFinalTotal: acc.passFinalTotal + r.passFinalTotal,
      passFinalFemale: acc.passFinalFemale + r.passFinalFemale,
      repeatTotal: acc.repeatTotal + r.repeatTotal,
      repeatFemale: acc.repeatFemale + r.repeatFemale,
      dropTotal: acc.dropTotal + r.dropTotal,
      dropFemale: acc.dropFemale + r.dropFemale,
    }),
    {
      total: 0, female: 0,
      examTotal: 0, examFemale: 0,
      passAvgTotal: 0, passAvgFemale: 0,
      retestTotal: 0, retestFemale: 0,
      passFinalTotal: 0, passFinalFemale: 0,
      repeatTotal: 0, repeatFemale: 0,
      dropTotal: 0, dropFemale: 0,
    }
  );

  return (
    <div className="text-slate-900 bg-white leading-relaxed">
      {/* Official Header */}
      <div className="relative mb-6">
        <div className="text-center">
          <div className="text-sm font-black tracking-wider text-slate-900">ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div className="text-xs font-bold text-slate-800">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
          <div className="text-xs font-bold text-slate-600 mt-0.5">꧁ ༺ ༻ ꧂</div>
        </div>

        <div className="mt-3 sm:mt-1 text-xs font-bold text-slate-800 space-y-0.5">
          <div><span className="font-semibold">រដ្ឋបាលខេត្ត:</span> {province}</div>
          <div><span className="font-semibold">ការិយាល័យអប់រំ យុវជន និងកីឡា:</span> {district}</div>
          <div><span className="font-semibold">សាលារៀន:</span> {school}</div>
        </div>
      </div>

      {/* Main Title */}
      <div className="text-center my-4">
        <h2 className="text-base sm:text-lg font-black text-slate-950 font-hanuman">
          ៣. លទ្ធផលសិក្សាដំណាច់ឆ្នាំ
        </h2>
      </div>

      {/* Results Table By Grade Level (1..6) */}
      <div className="overflow-x-auto my-3">
        <table className="w-full border-collapse border-2 border-slate-900 text-xs text-center">
          <thead>
            <tr className="bg-slate-100/90 font-bold border-b border-slate-900">
              <th rowSpan={3} className="border border-slate-900 px-3 py-2 w-16 text-slate-950">
                ថ្នាក់ទី
              </th>
              <th colSpan={14} className="border border-slate-900 py-1.5 text-center font-black text-slate-950">
                លទ្ធផលសិក្សារបស់សិស្ស
              </th>
              <th colSpan={2} className="border border-slate-900 py-1.5 text-center font-black text-indigo-950 bg-indigo-50/80">
                ការវាយតម្លៃ
              </th>
            </tr>

            <tr className="bg-slate-50 font-bold border-b border-slate-900 text-[11px]">
              <th colSpan={2} className="border border-slate-900 py-1">សិស្សដំណាច់ឆ្នាំ</th>
              <th colSpan={2} className="border border-slate-900 py-1">សិស្សប្រឡង</th>
              <th colSpan={2} className="border border-slate-900 py-1">ជាប់មធ្យមភាគ</th>
              <th colSpan={2} className="border border-slate-900 py-1">ធ្វើតេស្តជាប់</th>
              <th colSpan={2} className="border border-slate-900 py-1">ជាប់ចុងឆ្នាំ</th>
              <th colSpan={2} className="border border-slate-900 py-1">សិស្សត្រួតថ្នាក់</th>
              <th colSpan={2} className="border border-slate-900 py-1">សិស្សបោះបង់</th>
              <th rowSpan={2} className="border border-slate-900 px-2 py-1 bg-indigo-50/80 text-indigo-950 font-black">មធ្យមភាគ</th>
              <th rowSpan={2} className="border border-slate-900 px-2 py-1 bg-indigo-50/80 text-indigo-950 font-black">និទ្ទេស</th>
            </tr>

            <tr className="bg-slate-50 text-[11px] font-semibold border-b border-slate-900">
              <th className="border border-slate-900 px-1 py-0.5 font-bold">សរុប</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold text-emerald-800">ស្រី</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold">សរុប</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold text-emerald-800">ស្រី</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold">សរុប</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold text-emerald-800">ស្រី</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold">សរុប</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold text-emerald-800">ស្រី</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold">សរុប</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold text-emerald-800">ស្រី</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold">សរុប</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold text-emerald-800">ស្រី</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold">សរុប</th>
              <th className="border border-slate-900 px-1 py-0.5 font-bold text-emerald-800">ស្រី</th>
            </tr>

            <tr className="bg-slate-100 text-[10px] font-bold border-b-2 border-slate-900 text-slate-700">
              <th className="border border-slate-900 px-1 py-0.5"></th>
              <th colSpan={2} className="border border-slate-900 py-0.5">A=5+6+7</th>
              <th colSpan={2} className="border border-slate-900 py-0.5">B=5+6</th>
              <th colSpan={2} className="border border-slate-900 py-0.5">3</th>
              <th colSpan={2} className="border border-slate-900 py-0.5">4</th>
              <th colSpan={2} className="border border-slate-900 py-0.5 text-emerald-900">5=3+4</th>
              <th colSpan={2} className="border border-slate-900 py-0.5">6</th>
              <th colSpan={2} className="border border-slate-900 py-0.5">7</th>
              <th colSpan={2} className="border border-slate-900 py-0.5 text-indigo-900 bg-indigo-50/50">ពិន្ទុ/កម្រិត</th>
            </tr>
          </thead>

          <tbody>
            {gradeRows.map((r) => (
              <tr key={r.gradeNum} className="hover:bg-slate-50 transition border-b border-slate-400">
                <td className="border border-slate-900 px-2 py-1.5 font-black text-slate-950 bg-slate-50">
                  {r.gradeNum}
                </td>
                <td className="border border-slate-900 px-1 py-1 font-bold">{r.total}</td>
                <td className="border border-slate-900 px-1 py-1 font-bold text-emerald-800">{r.female}</td>
                <td className="border border-slate-900 px-1 py-1">{r.examTotal}</td>
                <td className="border border-slate-900 px-1 py-1 text-emerald-800">{r.examFemale}</td>
                <td className="border border-slate-900 px-1 py-1">{r.passAvgTotal}</td>
                <td className="border border-slate-900 px-1 py-1 text-emerald-800">{r.passAvgFemale}</td>
                <td className="border border-slate-900 px-1 py-1">{r.retestTotal}</td>
                <td className="border border-slate-900 px-1 py-1 text-emerald-800">{r.retestFemale}</td>
                <td className="border border-slate-900 px-1 py-1 font-bold bg-emerald-50/60 text-emerald-950">
                  {r.passFinalTotal}
                </td>
                <td className="border border-slate-900 px-1 py-1 font-bold bg-emerald-50/60 text-emerald-800">
                  {r.passFinalFemale}
                </td>
                <td className="border border-slate-900 px-1 py-1 text-rose-900">{r.repeatTotal}</td>
                <td className="border border-slate-900 px-1 py-1 text-rose-800">{r.repeatFemale}</td>
                <td className="border border-slate-900 px-1 py-1">{r.dropTotal}</td>
                <td className="border border-slate-900 px-1 py-1 text-emerald-800">{r.dropFemale}</td>
                <td className="border border-slate-900 px-1 py-1 font-bold text-indigo-950 bg-indigo-50/30">{r.avg}</td>
                <td className="border border-slate-900 px-1 py-1 font-black text-blue-800 bg-indigo-50/30">{r.grade}</td>
              </tr>
            ))}

            <tr className="bg-slate-200/90 font-black text-slate-950 border-t-2 border-slate-900 text-[12px]">
              <td className="border border-slate-900 px-2 py-2 font-black">សរុប</td>
              <td className="border border-slate-900 px-1 py-2">{totals.total}</td>
              <td className="border border-slate-900 px-1 py-2 text-emerald-900">{totals.female}</td>
              <td className="border border-slate-900 px-1 py-2">{totals.examTotal}</td>
              <td className="border border-slate-900 px-1 py-2 text-emerald-900">{totals.examFemale}</td>
              <td className="border border-slate-900 px-1 py-2">{totals.passAvgTotal}</td>
              <td className="border border-slate-900 px-1 py-2 text-emerald-900">{totals.passAvgFemale}</td>
              <td className="border border-slate-900 px-1 py-2">{totals.retestTotal}</td>
              <td className="border border-slate-900 px-1 py-2 text-emerald-900">{totals.retestFemale}</td>
              <td className="border border-slate-900 px-1 py-2 font-black bg-emerald-100/80 text-emerald-950">
                {totals.passFinalTotal}
              </td>
              <td className="border border-slate-900 px-1 py-2 font-black bg-emerald-100/80 text-emerald-900">
                {totals.passFinalFemale}
              </td>
              <td className="border border-slate-900 px-1 py-2 text-rose-950">{totals.repeatTotal}</td>
              <td className="border border-slate-900 px-1 py-2 text-rose-900">{totals.repeatFemale}</td>
              <td className="border border-slate-900 px-1 py-2">{totals.dropTotal}</td>
              <td className="border border-slate-900 px-1 py-2 text-emerald-900">{totals.dropFemale}</td>
              <td className="border border-slate-900 px-1 py-2 font-black text-indigo-950 bg-indigo-100">{schoolAvg}</td>
              <td className="border border-slate-900 px-1 py-2 font-black text-blue-900 bg-indigo-100">{schoolGrade}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Official 3-Column Signatures Matching PDF 2 */}
      <div className="mt-8 pt-6 flex justify-between items-start text-xs text-center gap-4">
        <div className="flex-1">
          <div className="font-bold text-slate-900 text-sm">បានឃើញ និងឯកភាព</div>
          <div className="text-[11px] text-slate-700 mt-1">{dates.d2.lunar}</div>
          <div className="text-[11px] text-slate-800 font-medium">{villagePrefix}{dates.d2.solar}</div>
          <div className="font-bold text-slate-950 mt-3 text-sm">នាយកកម្រង</div>
          <div className="mt-16 font-bold text-slate-950 text-sm">{clusterDirectorName}</div>
        </div>

        <div className="flex-1">
          <div className="font-bold text-slate-900 text-sm">បានឃើញ និងពិនិត្យត្រឹមត្រូវ</div>
          <div className="text-[11px] text-slate-700 mt-1">{dates.d1.lunar}</div>
          <div className="text-[11px] text-slate-800 font-medium">{villagePrefix}{dates.d1.solar}</div>
          <div className="font-bold text-slate-950 mt-3 text-sm">នាយកសាលា</div>
          <div className="mt-16 font-bold text-slate-950 text-sm">{schoolDirectorName || teacher?.fullName || ""}</div>
        </div>

        <div className="flex-1">
          <div className="text-[11px] text-slate-700 mt-1">{dates.d0.lunar}</div>
          <div className="text-[11px] text-slate-800 font-medium">{villagePrefix}{dates.d0.solar}</div>
          <div className="font-bold text-slate-950 mt-3 text-sm">អ្នករៀបចំរបាយការណ៍</div>
          <div className="mt-16 font-bold text-slate-950 text-sm">{reporterName}</div>
        </div>
      </div>
    </div>
  );
};
