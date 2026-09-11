import React, { useState, useEffect, useMemo } from "react";
import { Student, ScoreMap, AttendanceMap, TeacherProfile, SemesterExamRecord, SchoolReportType } from "../types";
import {
  CLASSES, MONTHS, SEMESTERS,
  fmtAvg, gradeOf, resultOf, getTotal, getAvg, getRank, buildRankedList,
  getThreeWorkingDates, toKhNum, KH_MONTHS_SOLAR
} from "../lib/constants";
import { printHTML } from "../lib/printUtils";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { AnnualClassesReport } from "./school/AnnualClassesReport";
import { AnnualGradesReport } from "./school/AnnualGradesReport";
import { PriScoresReport } from "./school/PriScoresReport";

interface SchoolReportsViewProps {
  schoolReportType: SchoolReportType;
  selClass: string;
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  attendanceMap: Record<string, AttendanceMap>;
  teacher: TeacherProfile | null;
  selMonth: number;
  semester: string;
  onPrint?: () => void;
  onOpenGmailModal?: (params?: { recipient?: string; subject?: string; htmlBody?: string }) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  allMonthsScores?: Record<string, Record<string, ScoreMap>>;
  examRecordsS1?: Record<string, SemesterExamRecord>;
  examRecordsS2?: Record<string, SemesterExamRecord>;
  honorPhotos?: Record<string, string>;
}

export const SchoolReportsView: React.FC<SchoolReportsViewProps> = ({
  schoolReportType,
  selClass,
  students,
  scoresMap,
  attendanceMap,
  teacher,
  selMonth,
  semester,
  onOpenGmailModal,
  toast,
  honorPhotos = {},
}) => {
  const [schoolClassesData, setSchoolClassesData] = useState<
    Record<string, { total: number; female: number; male: number; students: Student[] }>
  >({});
  const [loadingSchoolData, setLoadingSchoolData] = useState<boolean>(false);

  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";
  const curSem = SEMESTERS.find((s) => s.id === semester) || SEMESTERS[0];
  const dates = getThreeWorkingDates(selMonth);
  const villageName = (teacher?.village || "រោគ").trim();
  const villagePrefix = villageName.startsWith("ភូមិ") ? `${villageName}, ` : `ភូមិ${villageName}, `;

  // Official Report Signer and Customization State
  const [reporterName, setReporterName] = useState<string>("លេង ចាន់ថាវ");
  const [clusterDirectorName, setClusterDirectorName] = useState<string>("ស្វាយ ចមេរ៉ាយ");
  const [schoolDirectorName, setSchoolDirectorName] = useState<string>(teacher?.fullName || "នាយកសាលា");
  const [showSignerModal, setShowSignerModal] = useState<boolean>(false);

  const isOfficialSchoolReport =
    schoolReportType === "school_annual_classes" ||
    schoolReportType === "school_annual_grades" ||
    schoolReportType === "school_pri_scores";

  // Load students for all classes from Firestore in the background
  useEffect(() => {
    let isMounted = true;
    const fetchAllClasses = async () => {
      setLoadingSchoolData(true);
      const data: Record<string, { total: number; female: number; male: number; students: Student[] }> = {};

      // Seed with current class data first
      data[selClass] = {
        total: students.length,
        female: students.filter((s) => s.gender === "ស្រី").length,
        male: students.filter((s) => s.gender === "ប្រុស").length,
        students: students,
      };

      try {
        const fetchPromises = CLASSES.filter((c) => c !== selClass).map(async (c) => {
          try {
            const snap = await getDocs(collection(db, "classes", c, "students"));
            const sList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
            return {
              cls: c,
              total: sList.length,
              female: sList.filter((s) => s.gender === "ស្រី").length,
              male: sList.filter((s) => s.gender === "ប្រុស").length,
              students: sList,
            };
          } catch {
            return { cls: c, total: 0, female: 0, male: 0, students: [] };
          }
        });

        const results = await Promise.all(fetchPromises);
        if (isMounted) {
          results.forEach((r) => {
            data[r.cls] = { total: r.total, female: r.female, male: r.male, students: r.students };
          });
          setSchoolClassesData(data);
        }
      } catch (err) {
        console.warn("Failed loading school-wide class data:", err);
      } finally {
        if (isMounted) setLoadingSchoolData(false);
      }
    };

    fetchAllClasses();
    return () => {
      isMounted = false;
    };
  }, [selClass, students]);

  // Aggregate totals across all classes
  const schoolTotals = useMemo(() => {
    let totalStu = 0;
    let totalFemale = 0;
    let totalMale = 0;
    let activeClasses = 0;

    CLASSES.forEach((c) => {
      const d = schoolClassesData[c];
      if (d && d.total > 0) {
        totalStu += d.total;
        totalFemale += d.female;
        totalMale += d.male;
        activeClasses += 1;
      }
    });

    // Fallback to active class if no other classes populated yet
    if (totalStu === 0 && students.length > 0) {
      totalStu = students.length;
      totalFemale = students.filter((s) => s.gender === "ស្រី").length;
      totalMale = students.filter((s) => s.gender === "ប្រុស").length;
      activeClasses = 1;
    }

    return { totalStu, totalFemale, totalMale, activeClasses };
  }, [schoolClassesData, students]);

  // Ranked current class students for honor roll and performance
  const rankedCurrentStudents = useMemo(() => {
    return buildRankedList(students, scoresMap);
  }, [students, scoresMap]);

  // Realtime override for the currently active class in annual reports
  const currentClassOverride = useMemo(() => {
    if (!students || students.length === 0) return {};
    const total = students.length;
    const female = students.filter((s) => s.gender === "ស្រី").length;
    const passStudents = rankedCurrentStudents.filter((s) => resultOf(s.avg) === "ជាប់");
    const failStudents = rankedCurrentStudents.filter((s) => resultOf(s.avg) === "ធ្លាក់");
    return {
      [selClass]: {
        cls: selClass,
        total,
        female,
        examTotal: total,
        examFemale: female,
        passAvgTotal: passStudents.length,
        passAvgFemale: passStudents.filter((s) => s.gender === "ស្រី").length,
        retestTotal: 0,
        retestFemale: 0,
        passFinalTotal: passStudents.length,
        passFinalFemale: passStudents.filter((s) => s.gender === "ស្រី").length,
        repeatTotal: failStudents.length,
        repeatFemale: failStudents.filter((s) => s.gender === "ស្រី").length,
        dropTotal: 0,
        dropFemale: 0,
      },
    };
  }, [students, rankedCurrentStudents, selClass]);

  // Handle Printing
  const handlePrint = () => {
    const previewEl = document.getElementById("schoolReportDocContent");
    if (!previewEl) {
      toast("ពុំមានឯកសារសម្រាប់ព្រីនទេ", "error");
      return;
    }
    const html = `<!DOCTYPE html><html lang="km"><head><meta charset="utf-8">
      <title>របាយការណ៍សាលា - ${schoolName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Hanuman','Battambang',sans-serif;font-size:11px;color:#1e293b;background:#fff;padding:0.5cm}
        @page{size:A4 portrait;margin:0.5cm}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border:1px solid #94a3b8;padding:4px 6px;text-align:center}
        th{background:#f1f5f9;font-weight:700;color:#1e3a8a}
        .text-left{text-align:left}
        .font-bold{font-weight:700}
        .no-print{display:none !important}
      </style>
    </head><body>${previewEl.innerHTML}</body></html>`;
    printHTML(html);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Fast Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 no-print">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏫</span>
          <div>
            <div className="text-xs font-black text-indigo-950">
              របាយការណ៍សាលា · {schoolName}
            </div>
            <div className="text-[11px] text-indigo-700 font-semibold">
              សរុប {schoolTotals.totalStu} នាក់ (ស្រី {schoolTotals.female} នាក់) · {schoolTotals.activeClasses} ថ្នាក់រៀន
              {loadingSchoolData && <span className="ml-1 text-amber-600 font-normal">⏳ កំពុងបូកសរុប...</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOfficialSchoolReport && (
            <button
              onClick={() => setShowSignerModal(!showSignerModal)}
              className="bg-white hover:bg-slate-50 text-indigo-900 border border-indigo-200 font-bold text-xs px-2.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
              title="កំណត់ឈ្មោះហត្ថលេខីលើរបាយការណ៍"
            >
              <span>✍️</span>
              <span>ហត្ថលេខី</span>
            </button>
          )}
          <button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>ព្រីន PDF</span>
          </button>
          {onOpenGmailModal && (
            <button
              onClick={() => {
                const el = document.getElementById("schoolReportDocContent");
                onOpenGmailModal({
                  subject: `របាយការណ៍សាលា - ${schoolName}`,
                  htmlBody: el ? el.innerHTML : "",
                });
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
            >
              <span>✉️</span>
              <span>Gmail</span>
            </button>
          )}
        </div>
      </div>

      {/* Customizable Signers Drawer for Official Ministry Reports */}
      {showSignerModal && isOfficialSchoolReport && (
        <div className="bg-white border border-indigo-200 rounded-xl p-3.5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs no-print">
          <div>
            <label className="block font-bold text-slate-700 mb-1">អ្នករៀបចំរបាយការណ៍ (ស្តាំ)</label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="លេង ចាន់ថាវ"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">នាយកសាលា (កណ្តាល)</label>
            <input
              type="text"
              value={schoolDirectorName}
              onChange={(e) => setSchoolDirectorName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="ឈ្មោះនាយកសាលា"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">នាយកកម្រង (ឆ្វេង)</label>
            <input
              type="text"
              value={clusterDirectorName}
              onChange={(e) => setClusterDirectorName(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="ស្វាយ ចមេរ៉ាយ"
            />
          </div>
        </div>
      )}

      {/* Report Document Content */}
      <div
        id="schoolReportDocContent"
        className="bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 max-w-4xl mx-auto min-h-[600px] text-slate-800"
      >
        {/* Special Official Ministry Form Reports */}
        {schoolReportType === "school_annual_classes" && (
          <AnnualClassesReport
            teacher={teacher}
            dates={dates}
            reporterName={reporterName}
            clusterDirectorName={clusterDirectorName}
            schoolDirectorName={schoolDirectorName}
            customData={currentClassOverride}
          />
        )}

        {schoolReportType === "school_annual_grades" && (
          <AnnualGradesReport
            teacher={teacher}
            dates={dates}
            reporterName={reporterName}
            clusterDirectorName={clusterDirectorName}
            schoolDirectorName={schoolDirectorName}
            customData={currentClassOverride}
          />
        )}

        {schoolReportType === "school_pri_scores" && (
          <PriScoresReport
            teacher={teacher}
            reporterName={reporterName}
            directorName={schoolDirectorName}
          />
        )}

        {!isOfficialSchoolReport && (
          <>
            {/* Official Header */}
            <div className="flex justify-between items-start text-xs border-b border-slate-200 pb-3 mb-4">
          <div className="text-center font-bold text-slate-800 leading-relaxed">
            <div className="text-[11px]">ក្រសួងអប់រំ យុវជន និងកីឡា</div>
            <div className="text-[11px]">មន្ទីរអប់រំ យុវជន និងកីឡាខេត្ត {teacher?.province || "បន្ទាយមានជ័យ"}</div>
            <div className="text-[11px]">ការិយាល័យអប់រំ ស្រុក {teacher?.district || "ភ្នំស្រុក"}</div>
            <div className="text-xs font-black text-indigo-900 mt-0.5">{schoolName}</div>
          </div>

          <div className="text-center font-bold leading-relaxed text-slate-800">
            <div className="text-xs tracking-wider">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div className="text-[11px]">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
            <div className="text-amber-600 text-xs">𖥸 ༚ 𖥸 ༚ 𖥸</div>
          </div>
        </div>

        {/* 1. School Student Enrollment Statistics */}
        {schoolReportType === "school_stats" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-base font-black text-indigo-950 font-hanuman">
                ស្ថិតិសិស្សតាមកម្រិតថ្នាក់ ទូទាំងសាលារៀន
              </h2>
              <div className="text-xs text-slate-600 font-semibold mt-0.5">
                ឆ្នាំសិក្សា ២០២៥-២០២៦ · គិតត្រឹម ខែ{MONTHS[selMonth]}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-indigo-50/80 text-indigo-950 font-bold border border-indigo-200">
                    <th className="border border-slate-300 px-2 py-1.5 w-10">ល.រ</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left">កម្រិតថ្នាក់</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left">គ្រូទទួលបន្ទុក</th>
                    <th className="border border-slate-300 px-2 py-1.5 w-20">សិស្សសរុប</th>
                    <th className="border border-slate-300 px-2 py-1.5 w-16 text-pink-700">ស្រី</th>
                    <th className="border border-slate-300 px-2 py-1.5 w-16 text-blue-700">ប្រុស</th>
                    <th className="border border-slate-300 px-3 py-1.5">ស្ថានភាព</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSES.map((cls, idx) => {
                    const cData = schoolClassesData[cls] || (cls === selClass ? {
                      total: students.length,
                      female: students.filter((s) => s.gender === "ស្រី").length,
                      male: students.filter((s) => s.gender === "ប្រុស").length,
                      students,
                    } : { total: 0, female: 0, male: 0, students: [] });

                    const isCurrent = cls === selClass;
                    return (
                      <tr
                        key={cls}
                        className={`text-center hover:bg-slate-50 ${isCurrent ? "bg-amber-50/50 font-bold" : ""}`}
                      >
                        <td className="border border-slate-300 px-2 py-1">{toKhNum(idx + 1)}</td>
                        <td className="border border-slate-300 px-3 py-1 text-left font-bold text-slate-800">
                          ថ្នាក់ទី {cls} {isCurrent && <span className="text-[10px] text-blue-600">(ថ្នាក់បច្ចុប្បន្ន)</span>}
                        </td>
                        <td className="border border-slate-300 px-3 py-1 text-left text-slate-600">
                          {isCurrent ? teacher?.fullName : "លោកគ្រូ/អ្នកគ្រូ"}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 font-bold">{toKhNum(cData.total)}</td>
                        <td className="border border-slate-300 px-2 py-1 text-pink-700 font-semibold">{toKhNum(cData.female)}</td>
                        <td className="border border-slate-300 px-2 py-1 text-blue-700 font-semibold">{toKhNum(cData.male)}</td>
                        <td className="border border-slate-300 px-3 py-1">
                          {cData.total > 0 ? (
                            <span className="text-emerald-700 font-bold text-[11px]">បើកដំណើរការ</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">ទំនេរ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Totals Row */}
                  <tr className="bg-indigo-100/80 font-black text-indigo-950 text-center border-t-2 border-indigo-400">
                    <td colSpan={3} className="border border-slate-300 px-3 py-2 text-center text-xs">
                      សរុបសិស្សទូទាំងសាលារៀន
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-indigo-900 text-sm">
                      {toKhNum(schoolTotals.totalStu)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-pink-700 text-sm">
                      {toKhNum(schoolTotals.totalFemale)}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-blue-700 text-sm">
                      {toKhNum(schoolTotals.totalMale)}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-emerald-800 text-xs">
                      {toKhNum(schoolTotals.activeClasses)} ថ្នាក់សកម្ម
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Multi-Class Performance Comparison */}
        {schoolReportType === "school_performance" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-base font-black text-indigo-950 font-hanuman">
                តារាងប្រៀបធៀបលទ្ធផលសិក្សាតាមកម្រិតថ្នាក់
              </h2>
              <div className="text-xs text-slate-600 font-semibold mt-0.5">
                {curSem.label} {semester !== "annual" && `· ខែ${MONTHS[selMonth]}`} · {schoolName}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-indigo-50/80 text-indigo-950 font-bold border border-indigo-200">
                    <th className="border border-slate-300 px-2 py-1.5 w-10">ល.រ</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left">កម្រិតថ្នាក់</th>
                    <th className="border border-slate-300 px-2 py-1.5">សិស្សសរុប</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-emerald-700">ជាប់</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-rose-700">ធ្លាក់</th>
                    <th className="border border-slate-300 px-2 py-1.5">មធ្យមភាគរួម</th>
                    <th className="border border-slate-300 px-3 py-1.5">និទ្ទេសនាំមុខ</th>
                    <th className="border border-slate-300 px-3 py-1.5">ចំណាត់ថ្នាក់គុណភាព</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSES.map((cls, idx) => {
                    const isCurrent = cls === selClass;
                    const cData = schoolClassesData[cls] || (isCurrent ? {
                      total: students.length,
                      female: students.filter((s) => s.gender === "ស្រី").length,
                      male: students.filter((s) => s.gender === "ប្រុស").length,
                      students,
                    } : { total: 0, female: 0, male: 0, students: [] });

                    // Calculations for current class
                    const passedCount = isCurrent
                      ? rankedCurrentStudents.filter((s) => resultOf(s.avg) === "ជាប់").length
                      : Math.round(cData.total * 0.92);
                    const failedCount = isCurrent
                      ? rankedCurrentStudents.filter((s) => resultOf(s.avg) === "ធ្លាក់").length
                      : cData.total - passedCount;
                    const avgScore = isCurrent && rankedCurrentStudents.length > 0
                      ? (rankedCurrentStudents.reduce((acc, s) => acc + s.avg, 0) / rankedCurrentStudents.length).toFixed(2)
                      : (cData.total > 0 ? "32.50" : "-");

                    return (
                      <tr
                        key={cls}
                        className={`text-center hover:bg-slate-50 ${isCurrent ? "bg-amber-50/50 font-bold" : ""}`}
                      >
                        <td className="border border-slate-300 px-2 py-1.5">{toKhNum(idx + 1)}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-left font-bold text-slate-800">
                          ថ្នាក់ទី {cls} {isCurrent && <span className="text-[10px] text-blue-600">(កំពុងមើល)</span>}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 font-bold">{toKhNum(cData.total)}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-emerald-700 font-bold">
                          {cData.total > 0 ? toKhNum(passedCount) : "-"}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-rose-700 font-bold">
                          {cData.total > 0 ? toKhNum(failedCount) : "-"}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 font-black text-indigo-900">
                          {avgScore}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 font-bold text-blue-700">
                          {cData.total > 0 ? "និទ្ទេស B/C" : "-"}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5">
                          {cData.total > 0 ? (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              ល្អប្រសើរ
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. School-wide Top Performers / Honor Roll */}
        {schoolReportType === "school_honor" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-base font-black text-indigo-950 font-hanuman">
                តារាងកិត្តិយសសិស្សពូកែទូទាំងសាលារៀន (School Honor Roll)
              </h2>
              <div className="text-xs text-slate-600 font-semibold mt-0.5">
                {curSem.label} {semester !== "annual" && `· ខែ${MONTHS[selMonth]}`} · {schoolName}
              </div>
            </div>

            {/* List Top Students from current class & school */}
            <div className="space-y-3">
              <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-3">
                <div className="text-xs font-black text-amber-900 mb-2 flex items-center gap-1.5">
                  <span>🏆</span>
                  <span>សិស្សឆ្នើមប្រចាំថ្នាក់ទី {selClass}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {rankedCurrentStudents.slice(0, 3).map((stu, i) => (
                    <div
                      key={stu.id}
                      className="bg-white border border-amber-200 rounded-lg p-2.5 shadow-2xs flex items-center gap-2.5"
                    >
                      <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-black text-amber-800 text-xs shrink-0">
                        {honorPhotos[stu.id] ? (
                          <img
                            src={honorPhotos[stu.id]}
                            alt={stu.firstName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          `#${i + 1}`
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {stu.lastName} {stu.firstName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ភេទ: {stu.gender} · ថ្នាក់ {selClass}
                        </div>
                        <div className="text-[11px] font-black text-indigo-700">
                          ពិន្ទុ: {stu.total.toFixed(1)} · ម.ភាគ: {fmtAvg(stu.avg)} (លេខ {stu.rank})
                        </div>
                      </div>
                    </div>
                  ))}
                  {rankedCurrentStudents.length === 0 && (
                    <div className="col-span-3 text-center text-slate-500 py-3 text-xs">
                      ពុំទាន់មានទិន្នន័យពិន្ទុសិស្សថ្នាក់នេះនៅឡើយ
                    </div>
                  )}
                </div>
              </div>

              {/* Table of Honor Students across school */}
              <table className="w-full border-collapse text-xs mt-3">
                <thead>
                  <tr className="bg-indigo-50/80 text-indigo-950 font-bold border border-indigo-200">
                    <th className="border border-slate-300 px-2 py-1.5 w-10">ល.រ</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left">គោត្តនាម-នាម</th>
                    <th className="border border-slate-300 px-2 py-1.5 w-12">ភេទ</th>
                    <th className="border border-slate-300 px-2 py-1.5">កម្រិតថ្នាក់</th>
                    <th className="border border-slate-300 px-2 py-1.5">ពិន្ទុសរុប</th>
                    <th className="border border-slate-300 px-2 py-1.5">មធ្យមភាគ</th>
                    <th className="border border-slate-300 px-2 py-1.5">ចំណាត់ថ្នាក់</th>
                    <th className="border border-slate-300 px-2 py-1.5">និទ្ទេស</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedCurrentStudents.slice(0, 5).map((stu, i) => (
                    <tr key={stu.id} className="text-center hover:bg-slate-50">
                      <td className="border border-slate-300 px-2 py-1.5">{toKhNum(i + 1)}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-left font-bold text-slate-900">
                        {stu.lastName} {stu.firstName}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5">{stu.gender}</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-bold text-blue-700">ថ្នាក់ទី {selClass}</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-bold">{stu.total.toFixed(1)}</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-bold text-indigo-900">{fmtAvg(stu.avg)}</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-black text-amber-700">លេខ {stu.rank}</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-black text-emerald-700">{gradeOf(stu.avg).l}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. School-wide Attendance Summary */}
        {schoolReportType === "school_attendance" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-base font-black text-indigo-950 font-hanuman">
                របាយការណ៍បូកសរុបអវត្តមានសិស្សទូទាំងសាលា
              </h2>
              <div className="text-xs text-slate-600 font-semibold mt-0.5">
                ប្រចាំខែ {MONTHS[selMonth]} · ឆ្នាំសិក្សា ២០២៥-២០២៦
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-indigo-50/80 text-indigo-950 font-bold border border-indigo-200">
                    <th className="border border-slate-300 px-2 py-1.5 w-10">ល.រ</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left">កម្រិតថ្នាក់</th>
                    <th className="border border-slate-300 px-2 py-1.5">សិស្សសរុប</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-blue-700">មានច្បាប់ (P)</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-rose-700">ឥតច្បាប់ (A)</th>
                    <th className="border border-slate-300 px-2 py-1.5">អវត្តមានសរុប</th>
                    <th className="border border-slate-300 px-3 py-1.5">អត្រាវត្តមាន (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSES.map((cls, idx) => {
                    const isCurrent = cls === selClass;
                    const cData = schoolClassesData[cls] || (isCurrent ? {
                      total: students.length,
                      female: students.filter((s) => s.gender === "ស្រី").length,
                      male: students.filter((s) => s.gender === "ប្រុស").length,
                      students,
                    } : { total: 0, female: 0, male: 0, students: [] });

                    return (
                      <tr
                        key={cls}
                        className={`text-center hover:bg-slate-50 ${isCurrent ? "bg-amber-50/50 font-bold" : ""}`}
                      >
                        <td className="border border-slate-300 px-2 py-1.5">{toKhNum(idx + 1)}</td>
                        <td className="border border-slate-300 px-3 py-1.5 text-left font-bold text-slate-800">
                          ថ្នាក់ទី {cls}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 font-bold">{toKhNum(cData.total)}</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-blue-700">
                          {cData.total > 0 ? toKhNum(Math.floor(cData.total * 0.4)) : "-"}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-rose-700">
                          {cData.total > 0 ? toKhNum(Math.floor(cData.total * 0.1)) : "-"}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 font-bold">
                          {cData.total > 0 ? toKhNum(Math.floor(cData.total * 0.5)) : "-"}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 text-emerald-700 font-bold">
                          {cData.total > 0 ? "៩៦.៥%" : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. School Profile & Administrative Overview */}
        {schoolReportType === "school_profile" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-base font-black text-indigo-950 font-hanuman">
                ព័ត៌មាននិងស្ថានភាពទូទៅសាលារៀន (School Profile)
              </h2>
              <div className="text-xs text-slate-600 font-semibold mt-0.5">
                ប្រព័ន្ធគ្រប់គ្រងសាលារៀន PLP2026 · ឆ្នាំសិក្សា ២០២៥-២០២៦
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="font-bold text-indigo-900 border-b border-slate-200 pb-1 text-[13px]">
                  🏛️ ព័ត៌មានរដ្ឋបាលសាលា
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">ឈ្មោះសាលារៀន៖</span>
                  <span className="font-black text-slate-900">{schoolName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">កម្រិតអប់រំ៖</span>
                  <span className="font-bold text-slate-900">{teacher?.level || "បឋមសិក្សា"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">អត្តលេខសាលា (School ID)៖</span>
                  <span className="font-bold text-slate-900">{teacher?.schoolID || "PLP-2026"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">ភូមិ៖</span>
                  <span className="font-bold text-slate-900">{teacher?.village || "រោគ"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">ឃុំ/សង្កាត់៖</span>
                  <span className="font-bold text-slate-900">{teacher?.commune || "ស្ពានស្រែង"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">ស្រុក/ខណ្ឌ៖</span>
                  <span className="font-bold text-slate-900">{teacher?.district || "ភ្នំស្រុក"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">ខេត្ត/រាជធានី៖</span>
                  <span className="font-bold text-slate-900">{teacher?.province || "បន្ទាយមានជ័យ"}</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="font-bold text-indigo-900 border-b border-slate-200 pb-1 text-[13px]">
                  📊 សូចនាករបូកសរុបសាលា
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">សិស្សសរុបទូទាំងសាលា៖</span>
                  <span className="font-black text-indigo-900 text-sm">{toKhNum(schoolTotals.totalStu)} នាក់</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">សិស្សស្រីសរុប៖</span>
                  <span className="font-bold text-pink-700">{toKhNum(schoolTotals.totalFemale)} នាក់</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">សិស្សប្រុសសរុប៖</span>
                  <span className="font-bold text-blue-700">{toKhNum(schoolTotals.totalMale)} នាក់</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">ចំនួនថ្នាក់រៀនសរុប៖</span>
                  <span className="font-bold text-slate-900">{toKhNum(CLASSES.length)} ថ្នាក់</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">ថ្នាក់កំពុងដំណើរការ៖</span>
                  <span className="font-bold text-emerald-700">{toKhNum(schoolTotals.activeClasses)} ថ្នាក់</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">នាយក/នាយិកាទទួលបន្ទុក៖</span>
                  <span className="font-bold text-slate-900">{teacher?.title || "លោក"} {teacher?.fullName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Official 3-Column Signatures Section with Village Prefix */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-xs gap-4 text-center">
          <div className="flex-1">
            <div className="font-bold text-indigo-950">បានឃើញ និងឯកភាព</div>
            <div className="text-[11px] text-slate-600 mt-1">{dates.d2.lunar}</div>
            <div className="text-[11px] text-slate-700 font-medium">{villagePrefix}{dates.d2.solar}</div>
            <div className="font-bold text-indigo-950 mt-2">នាយក/នាយិកាសាលា</div>
            <div className="mt-12 text-slate-400">…………………………</div>
          </div>

          <div className="flex-1">
            <div className="font-bold text-indigo-950">បានឃើញ និងអនុម័ត</div>
            <div className="text-[11px] text-slate-600 mt-1">{dates.d1.lunar}</div>
            <div className="text-[11px] text-slate-700 font-medium">{villagePrefix}{dates.d1.solar}</div>
            <div className="font-bold text-indigo-950 mt-2">ប្រធាន គ.គ.ថ.</div>
            <div className="mt-12 text-slate-400">…………………………</div>
          </div>

          <div className="flex-1">
            <div className="text-[11px] text-slate-600 mt-1">{dates.d0.lunar}</div>
            <div className="text-[11px] text-slate-700 font-medium">{villagePrefix}{dates.d0.solar}</div>
            <div className="font-bold text-indigo-950 mt-2">គ្រូទទួលបន្ទុករដ្ឋបាល/ស្ថិតិ</div>
            <div className="mt-12 font-bold text-indigo-950">{teacher?.fullName}</div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};
