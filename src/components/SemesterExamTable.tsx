import React, { useState } from "react";
import { Student, ScoreMap, SemesterExamRecord, DomainGrades } from "../types";
import {
  EXAM_SUBJECTS, EVAL_DOMAINS,
  fmtAvg, fmtTotal, fmtScore, gradeOf, resultOf, truncate2, toKhNum,
  getSemesterExamTotal, getSemesterExamAvg,
  computeStudentSemesterMonthlyAvg, computeStudentSemesterFinalAvg,
  deriveDomainLetter
} from "../lib/constants";
import * as XLSX from "xlsx";
import { printHTML } from "../lib/printUtils";
import { SemesterExamImportModal } from "./Modals/SemesterExamImportModal";

interface SemesterExamTableProps {
  students: Student[];
  semesterId: "s1" | "s2";
  onSemesterChange: (semId: "s1" | "s2") => void;
  examRecords: Record<string, SemesterExamRecord>; // sid -> { scores, domains, remarks }
  allMonthsScores: Record<string, Record<string, ScoreMap>>;
  editMode: boolean;
  onUpdateExamScore: (studentId: string, subject: string, value: number | "") => void;
  onUpdateExamDomain: (studentId: string, domainKey: keyof DomainGrades, value: string) => void;
  onUpdateExamRemark: (studentId: string, remark: string) => void;
  onAutoPopulateDomains: (semesterId: "s1" | "s2") => void;
  onImportExamScores?: (semId: "s1" | "s2", scoresByStudent: Record<string, Record<string, number | "">>) => Promise<void>;
  onOpenPhotoModal: (id: string, name: string, gender: string) => void;
  honorPhotos: Record<string, string>;
  schoolName?: string;
  teacherName?: string;
  className?: string;
  toast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const SemesterExamTable: React.FC<SemesterExamTableProps> = ({
  students,
  semesterId,
  onSemesterChange,
  examRecords,
  allMonthsScores,
  editMode,
  onUpdateExamScore,
  onUpdateExamDomain,
  onUpdateExamRemark,
  onAutoPopulateDomains,
  onImportExamScores,
  onOpenPhotoModal,
  honorPhotos,
  schoolName = "សាលាបឋមសិក្សា",
  teacherName = "",
  className = "",
  toast = () => {},
}) => {
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const semLabel = semesterId === "s1" ? "ឆមាសទី១" : "ឆមាសទី២";

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (filterGender !== "all" && s.gender !== filterGender) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const fullName = `${s.lastName || ""} ${s.firstName || ""} ${s.code || ""}`.toLowerCase();
      if (!fullName.includes(q)) return false;
    }
    return true;
  });

  // Build ranking for this semester
  const studentScoresMap: Record<string, ScoreMap> = {};
  students.forEach((s) => {
    studentScoresMap[s.id] = examRecords[s.id]?.scores || {};
  });

  const studentsWithMetrics = students.map((s) => {
    const eTot = getSemesterExamTotal(s.id, studentScoresMap);
    const eAvg = getSemesterExamAvg(s.id, studentScoresMap);
    const mAvg = computeStudentSemesterMonthlyAvg(s.id, semesterId, allMonthsScores);
    const semFinalAvg = computeStudentSemesterFinalAvg(s.id, semesterId, allMonthsScores, studentScoresMap);
    return {
      student: s,
      eTot,
      eAvg,
      mAvg,
      semFinalAvg,
    };
  });

  // Sort and assign rank (Highest score first -> Rank 1, 2, 3...)
  const sorted = [...studentsWithMetrics]
    .filter((item) => item.semFinalAvg !== null && item.semFinalAvg > 0)
    .sort((a, b) => {
      const scoreA = a.semFinalAvg ?? -1;
      const scoreB = b.semFinalAvg ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
    });

  const rankMap: Record<string, number | string> = {};
  sorted.forEach((item, idx) => {
    if (idx > 0 && item.semFinalAvg === sorted[idx - 1].semFinalAvg) {
      rankMap[item.student.id] = rankMap[sorted[idx - 1].student.id];
    } else {
      rankMap[item.student.id] = idx + 1;
    }
  });

  // Export to Excel
  const handleExportExcel = () => {
    const headers = [
      "ល.រ", "គោត្តនាម និងនាម", "ភេទ",
      ...EXAM_SUBJECTS,
      "ពិន្ទុប្រឡងសរុប", "មធ្យមភាគប្រឡង", "មធ្យមភាគប្រចាំខែ", "មធ្យមភាគប្រចាំឆមាស",
      "ចំណាត់ថ្នាក់", "លទ្ធផល", "និទ្ទេស",
      "ចំណេះដឹង", "បំណិន-បំណេះធ្វើ", "តម្លៃ-សីលធម៌", "សមត្ថភាព-ការចូលរួម", "សេចក្តីផ្សេងៗ"
    ];

    const dataRows = students.map((s, idx) => {
      const rec = examRecords[s.id] || { scores: {} };
      const sMap = rec.scores || {};
      const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
      const eTot = getSemesterExamTotal(s.id, studentScoresMap);
      const eAvg = getSemesterExamAvg(s.id, studentScoresMap);
      const mAvg = computeStudentSemesterMonthlyAvg(s.id, semesterId, allMonthsScores);
      const semFinalAvg = computeStudentSemesterFinalAvg(s.id, semesterId, allMonthsScores, studentScoresMap);
      const rank = rankMap[s.id] ?? "—";
      const res = semFinalAvg !== null ? resultOf(semFinalAvg) : "—";
      const g = semFinalAvg !== null ? gradeOf(semFinalAvg).l : "—";

      const subScores = EXAM_SUBJECTS.map((subj) => sMap[subj] !== undefined && sMap[subj] !== "" ? fmtScore(sMap[subj]) : "");

      const dom = rec.domains || {};
      const dKnow = dom.knowledge || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "");
      const dSkills = dom.skills || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "");
      const dVal = dom.values || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "");
      const dPart = dom.participation || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "");

      return [
        idx + 1,
        fullName,
        s.gender || "",
        ...subScores,
        eTot > 0 ? fmtTotal(eTot) : "",
        eAvg !== null ? fmtAvg(eAvg) : "",
        mAvg !== null ? fmtAvg(mAvg) : "",
        semFinalAvg !== null ? fmtAvg(semFinalAvg) : "",
        rank,
        res,
        g,
        dKnow,
        dSkills,
        dVal,
        dPart,
        rec.remarks || ""
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([
      [`តារាងស្រង់ពិន្ទុប្រឡង${semLabel} - ថ្នាក់ ${className}`],
      [`សាលាបឋមសិក្សា: ${schoolName} | គ្រូបង្រៀន: ${teacherName}`],
      [],
      headers,
      ...dataRows
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `ប្រឡង_${semesterId}`);
    XLSX.writeFile(wb, `តារាងប្រឡង_${semesterId}_ថ្នាក់_${className}.xlsx`);
  };

  // Print Official Table
  const handlePrint = () => {
    const tableRows = students.map((s, idx) => {
      const rec = examRecords[s.id] || { scores: {} };
      const sMap = rec.scores || {};
      const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
      const eTot = getSemesterExamTotal(s.id, studentScoresMap);
      const eAvg = getSemesterExamAvg(s.id, studentScoresMap);
      const mAvg = computeStudentSemesterMonthlyAvg(s.id, semesterId, allMonthsScores);
      const semFinalAvg = computeStudentSemesterFinalAvg(s.id, semesterId, allMonthsScores, studentScoresMap);
      const rank = rankMap[s.id] ?? "—";
      const res = semFinalAvg !== null ? resultOf(semFinalAvg) : "—";
      const g = semFinalAvg !== null ? gradeOf(semFinalAvg).l : "—";

      const dom = rec.domains || {};
      const dKnow = dom.knowledge || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "—");
      const dSkills = dom.skills || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "—");
      const dVal = dom.values || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "—");
      const dPart = dom.participation || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "—");

      const subjTds = EXAM_SUBJECTS.map((subj) => {
        const val = sMap[subj] !== undefined && sMap[subj] !== "" ? fmtScore(sMap[subj]) : "—";
        return `<td style="border:1px solid #334155;padding:3px;text-align:center;font-size:10px;">${val}</td>`;
      }).join("");

      return `
        <tr style="height:22px;">
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-size:10px;">${idx + 1}</td>
          <td style="border:1px solid #334155;padding:3px 5px;text-align:left;font-size:10.5px;font-weight:bold;white-space:nowrap;">${fullName}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-size:10px;">${s.gender === "ស្រី" ? "ស្រី" : "ប្រុស"}</td>
          ${subjTds}
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-weight:bold;font-size:10px;background:#f8fafc;">${eTot > 0 ? fmtTotal(eTot) : "—"}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-weight:bold;font-size:10px;background:#f1f5f9;">${eAvg !== null ? fmtAvg(eAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-weight:bold;font-size:10px;background:#eff6ff;">${mAvg !== null ? fmtAvg(mAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-weight:bold;font-size:10.5px;background:#e0e7ff;color:#1e1b4b;">${semFinalAvg !== null ? fmtAvg(semFinalAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-weight:bold;font-size:10px;">${rank}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-size:10px;font-weight:bold;color:${res === 'ជាប់' ? '#15803d' : '#b91c1c'};">${res}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-weight:bold;font-size:10px;">${g}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-size:9.5px;">${dKnow}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-size:9.5px;">${dSkills}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-size:9.5px;">${dVal}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-size:9.5px;">${dPart}</td>
          <td style="border:1px solid #334155;padding:3px;text-align:center;font-size:9.5px;">${rec.remarks || ""}</td>
        </tr>
      `;
    }).join("");

    const totalStudents = students.length;
    const femaleStudents = students.filter((s) => s.gender === "ស្រី").length;
    const maleStudents = totalStudents - femaleStudents;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>តារាងស្រង់ពិន្ទុប្រឡង${semLabel}</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          body { font-family: 'Hanuman', 'Battambang', sans-serif; margin: 0; color: #000; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { border: 1px solid #334155; padding: 4px 2px; font-size: 9.5px; background: #f1f5f9; text-align: center; }
          .hdr-title { text-align: center; font-size: 14px; font-weight: bold; margin-top: 5px; }
          .meta-row { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div style="text-align:center;line-height:1.4;">
          <div style="font-weight:bold;font-size:12px;">ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div style="font-weight:bold;font-size:11px;">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
          <div style="font-family:cursive;font-size:12px;">***</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div>${schoolName}</div>
            <div>ថ្នាក់ទី: <strong>${className}</strong> | គ្រូបង្រៀន: <strong>${teacherName}</strong></div>
          </div>
          <div class="hdr-title">
            តារាងស្រង់ពិន្ទុប្រឡង${semLabel}
          </div>
          <div style="text-align:right;">
            <div>សិស្សសរុប: <strong>${totalStudents}</strong> នាក់ (ស្រី: <strong>${femaleStudents}</strong> នាក់)</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width:24px;">ល.រ</th>
              <th rowspan="2" style="min-width:110px;">គោត្តនាម-នាម</th>
              <th rowspan="2" style="width:28px;">ភេទ</th>
              <th colspan="${EXAM_SUBJECTS.length}">ពិន្ទុប្រឡងឆមាស (១១ មុខវិជ្ជា)</th>
              <th colspan="4" style="background:#e2e8f0;">លទ្ធផលប្រចាំឆមាស</th>
              <th rowspan="2" style="width:36px;">ចំ.ថ្នាក់</th>
              <th rowspan="2" style="width:36px;">លទ្ធផល</th>
              <th rowspan="2" style="width:30px;">និទ្ទេស</th>
              <th colspan="4" style="background:#fef3c7;">និទ្ទេសតាមផ្នែក</th>
              <th rowspan="2" style="min-width:50px;">ផ្សេងៗ</th>
            </tr>
            <tr>
              ${EXAM_SUBJECTS.map((s) => `<th style="font-size:8.5px;max-width:45px;">${s}</th>`).join("")}
              <th style="font-size:8.5px;background:#f8fafc;">សរុបប្រឡង</th>
              <th style="font-size:8.5px;background:#f1f5f9;">ម.ប្រឡង</th>
              <th style="font-size:8.5px;background:#eff6ff;">ម.ប្រចាំខែ</th>
              <th style="font-size:8.5px;background:#e0e7ff;font-weight:bold;">ម.ឆមាស</th>
              <th style="font-size:8px;">ចំណេះដឹង</th>
              <th style="font-size:8px;">បំណិន</th>
              <th style="font-size:8px;">តម្លៃ</th>
              <th style="font-size:8px;">ការចូលរួម</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div style="display:flex;justify-content:space-between;margin-top:25px;font-size:10.5px;">
          <div style="text-align:center;width:200px;">
            <div>បានឃើញ និងឯកភាព</div>
            <div style="font-weight:bold;margin-top:4px;">នាយកកម្រង</div>
          </div>
          <div style="text-align:center;width:200px;">
            <div>បានឃើញ និងពិនិត្យត្រឹមត្រូវ</div>
            <div style="font-weight:bold;margin-top:4px;">នាយកសាលា</div>
          </div>
          <div style="text-align:center;width:200px;">
            <div>ថ្ងៃទី........ ខែ........ ឆ្នាំ២០២៦</div>
            <div style="font-weight:bold;margin-top:4px;">គ្រូប្រចាំថ្នាក់</div>
            <div style="margin-top:35px;font-weight:bold;">${teacherName}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printHTML(html);
  };

  if (!students.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <div className="text-3xl mb-2">📑</div>
        <div className="text-xs font-semibold">មិនទាន់មានសិស្សក្នុងថ្នាក់</div>
      </div>
    );
  }

  // Summary Metrics
  const totalCount = students.length;
  const femaleCount = students.filter((s) => s.gender === "ស្រី").length;
  const maleCount = totalCount - femaleCount;

  let passCount = 0;
  let failCount = 0;
  let semAvgsSum = 0;
  let semAvgsCount = 0;

  students.forEach((s) => {
    const semFinalAvg = computeStudentSemesterFinalAvg(s.id, semesterId, allMonthsScores, studentScoresMap);
    if (semFinalAvg !== null) {
      semAvgsSum += semFinalAvg;
      semAvgsCount++;
      if (semFinalAvg >= 5.0) passCount++;
      else failCount++;
    }
  });

  const classAvg = semAvgsCount > 0 ? truncate2(semAvgsSum / semAvgsCount) : 0;

  return (
    <div className="p-2 sm:p-3 space-y-2">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Semester Switcher */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => onSemesterChange("s1")}
              className={`px-3 py-1 rounded-md text-xs font-black transition ${
                semesterId === "s1"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📘 ឆមាសទី១ (Semester 1)
            </button>
            <button
              onClick={() => onSemesterChange("s2")}
              className={`px-3 py-1 rounded-md text-xs font-black transition ${
                semesterId === "s2"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📙 ឆមាសទី២ (Semester 2)
            </button>
          </div>

          {/* Quick Metrics Badges */}
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span>👥 {totalCount} នាក់ (ស្រី {femaleCount})</span>
            <span>·</span>
            <span className="text-emerald-700">✅ ជាប់: {passCount}</span>
            <span>·</span>
            <span className="text-red-600">❌ ធ្លាក់: {failCount}</span>
            <span>·</span>
            <span className="text-blue-900">📊 ម.ថ្នាក់: {fmtAvg(classAvg)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {onImportExamScores && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold text-xs px-2.5 py-1 rounded-lg transition shadow-xs flex items-center gap-1"
              title={`នាំចូលពិន្ទុប្រឡង${semLabel} ពី Excel/JSON`}
            >
              📥 នាំចូលពិន្ទុ (Import)
            </button>
          )}

          <button
            onClick={() => onAutoPopulateDomains(semesterId)}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs px-2.5 py-1 rounded-lg transition shadow-xs flex items-center gap-1"
            title="បំពេញនិទ្ទេសតាមផ្នែកដោយស្វ័យប្រវត្តិតាមពិន្ទុមធ្យមភាគ"
          >
            ⚡ បំពេញនិទ្ទេសស្វ័យប្រវត្តិ
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-2.5 py-1 rounded-lg transition shadow-xs flex items-center gap-1"
            title="ទាញយកជា Excel"
          >
            📥 Excel
          </button>

          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1 rounded-lg transition shadow-xs flex items-center gap-1"
            title="បោះពុម្ពតារាងប្រឡងឆមាស"
          >
            🖨️ បោះពុម្ព (Print)
          </button>
        </div>
      </div>

      {/* Filter / Search mini-bar */}
      <div className="flex items-center justify-between gap-2 text-xs no-print">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <input
            type="text"
            placeholder="🔍 ស្វែងរកឈ្មោះសិស្ស..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-blue-500 font-semibold"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-500">ភេទ:</span>
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold outline-none"
          >
            <option value="all">ទាំងអស់</option>
            <option value="ប្រុស">ប្រុស</option>
            <option value="ស្រី">ស្រី</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-xs text-left text-slate-700 border-collapse">
          <thead>
            {/* Top Hierarchical Header */}
            <tr className="bg-slate-900 text-white font-black text-[10px] whitespace-nowrap">
              <th rowSpan={2} className="py-2 px-1 text-center w-8 sticky left-0 z-30 bg-slate-900 border-r border-slate-800">ល.រ</th>
              <th rowSpan={2} className="py-2 px-2 text-left min-w-[140px] sticky left-8 z-30 bg-slate-900 border-r border-slate-800">គោត្តនាម-នាម</th>
              <th rowSpan={2} className="py-2 px-1 text-center w-10 sticky left-[172px] z-30 bg-slate-900 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">ភេទ</th>
              
              {/* 11 Exam Subjects */}
              <th colSpan={EXAM_SUBJECTS.length} className="py-1.5 px-2 text-center bg-blue-950 text-blue-200 border-b border-blue-800 font-extrabold">
                📑 ពិន្ទុប្រឡងឆមាស (១១ មុខវិជ្ជា)
              </th>

              {/* Semester Results */}
              <th colSpan={4} className="py-1.5 px-2 text-center bg-indigo-950 text-indigo-200 border-b border-indigo-800 font-extrabold">
                📊 លទ្ធផលប្រចាំ{semLabel}
              </th>

              <th rowSpan={2} className="py-2 px-1 text-center w-12 bg-slate-800 text-white">ចំ.ថ្នាក់</th>
              <th rowSpan={2} className="py-2 px-1 text-center w-14 bg-slate-800 text-white">លទ្ធផល</th>
              <th rowSpan={2} className="py-2 px-1 text-center w-12 bg-slate-800 text-white">និទ្ទេស</th>

              {/* Domain Evaluations */}
              <th colSpan={4} className="py-1.5 px-2 text-center bg-amber-950 text-amber-200 border-b border-amber-800 font-extrabold">
                🎯 និទ្ទេសតាមផ្នែក
              </th>

              <th rowSpan={2} className="py-2 px-2 text-center min-w-[80px] bg-slate-900 text-white">សេចក្តីផ្សេងៗ</th>
            </tr>

            {/* Sub-headers */}
            <tr className="bg-slate-800 text-white font-bold text-[9.5px] whitespace-nowrap">
              {EXAM_SUBJECTS.map((subj) => (
                <th key={subj} className="py-2 px-1 text-center min-w-[48px] border-r border-slate-700 font-bold">
                  {subj}
                </th>
              ))}
              
              {/* Result sub headers */}
              <th className="py-2 px-1 text-center min-w-[50px] bg-blue-900 text-blue-100">សរុបប្រឡង</th>
              <th className="py-2 px-1 text-center min-w-[50px] bg-blue-900 text-blue-100">ម.ប្រឡង</th>
              <th className="py-2 px-1 text-center min-w-[55px] bg-indigo-900 text-indigo-100">ម.ប្រចាំខែ</th>
              <th className="py-2 px-1 text-center min-w-[55px] bg-indigo-950 text-amber-300 font-black">ម.ឆមាស</th>

              {/* Domains */}
              <th className="py-2 px-1 text-center min-w-[45px] bg-amber-900 text-amber-100">ចំណេះដឹង</th>
              <th className="py-2 px-1 text-center min-w-[45px] bg-amber-900 text-amber-100">បំណិន</th>
              <th className="py-2 px-1 text-center min-w-[45px] bg-amber-900 text-amber-100">តម្លៃ</th>
              <th className="py-2 px-1 text-center min-w-[45px] bg-amber-900 text-amber-100">ការចូលរួម</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredStudents.map((s, idx) => {
              const rec = examRecords[s.id] || { scores: {} };
              const sScores = rec.scores || {};
              const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
              const photo = honorPhotos[s.id] || s.photoUrl;

              const eTot = getSemesterExamTotal(s.id, studentScoresMap);
              const eAvg = getSemesterExamAvg(s.id, studentScoresMap);
              const mAvg = computeStudentSemesterMonthlyAvg(s.id, semesterId, allMonthsScores);
              const semFinalAvg = computeStudentSemesterFinalAvg(s.id, semesterId, allMonthsScores, studentScoresMap);
              const rank = rankMap[s.id] ?? "—";
              const passFail = semFinalAvg !== null ? resultOf(semFinalAvg) : "—";
              const grade = semFinalAvg !== null ? gradeOf(semFinalAvg) : { l: "—", c: "#64748b" };

              const dom = rec.domains || {};
              const dKnow = dom.knowledge || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "");
              const dSkills = dom.skills || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "");
              const dVal = dom.values || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "");
              const dPart = dom.participation || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "");

              const cellBg = idx % 2 === 0 ? "bg-slate-50/60" : "bg-white";

              return (
                <tr key={s.id} className={`${idx % 2 === 0 ? "bg-slate-50/40" : "bg-white"} hover:bg-blue-50/30 transition`}>
                  {/* Row No */}
                  <td className={`py-2 px-1 text-center text-slate-400 font-bold sticky left-0 z-10 ${cellBg} border-r border-slate-200`}>
                    {idx + 1}
                  </td>

                  {/* Student Name */}
                  <td className={`py-2 px-2 text-left whitespace-nowrap font-bold text-slate-800 sticky left-8 z-10 ${cellBg} border-r border-slate-200`}>
                    <div
                      onClick={() => onOpenPhotoModal(s.id, fullName, s.gender)}
                      className="flex items-center justify-start gap-1.5 cursor-pointer hover:text-blue-600"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-blue-400 bg-slate-100 flex items-center justify-center shrink-0">
                        {photo ? (
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px]">{s.gender === "ស្រី" ? "👩" : "👨"}</span>
                        )}
                      </div>
                      <span className="truncate max-w-[120px]">{fullName}</span>
                    </div>
                  </td>

                  {/* Gender */}
                  <td className={`py-2 px-1 text-center font-semibold text-slate-500 sticky left-[172px] z-10 ${cellBg} border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                    {s.gender === "ស្រី" ? "👩" : "👨"}
                  </td>

                  {/* 11 Exam Subjects */}
                  {EXAM_SUBJECTS.map((subj) => {
                    const val = sScores[subj] ?? "";
                    return (
                      <td key={subj} className="py-1 px-1 text-center border-r border-slate-100">
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
                                onUpdateExamScore(s.id, subj, "");
                                return;
                              }
                              let num = parseFloat(raw);
                              if (isNaN(num)) {
                                onUpdateExamScore(s.id, subj, "");
                                return;
                              }
                              if (num < 0) num = 0;
                              if (num > 10) num = 10;
                              onUpdateExamScore(s.id, subj, num);
                            }}
                            placeholder="—"
                            className="w-10 text-center border border-blue-300 rounded py-0.5 text-xs outline-none focus:border-blue-600 font-semibold"
                          />
                        ) : (
                          <span className={`font-bold ${Number(val) >= 5 ? "text-emerald-700" : val !== "" ? "text-red-600" : "text-slate-300"}`}>
                            {val !== "" && val !== undefined ? fmtScore(val) : "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Exam Total */}
                  <td className="py-2 px-1 text-center bg-blue-50 font-extrabold text-blue-900 border-r border-blue-100">
                    {eTot > 0 ? fmtTotal(eTot) : "—"}
                  </td>

                  {/* Exam Avg */}
                  <td className="py-2 px-1 text-center bg-blue-50/80 font-extrabold text-blue-950 border-r border-blue-100">
                    {eAvg !== null ? fmtAvg(eAvg) : "—"}
                  </td>

                  {/* Monthly Avg in S1/S2 */}
                  <td className="py-2 px-1 text-center bg-indigo-50 font-extrabold text-indigo-900 border-r border-indigo-100">
                    {mAvg !== null ? fmtAvg(mAvg) : "—"}
                  </td>

                  {/* Semester Final Avg */}
                  <td className="py-2 px-1 text-center bg-indigo-100 font-black text-indigo-950 border-r border-indigo-200">
                    {semFinalAvg !== null ? fmtAvg(semFinalAvg) : "—"}
                  </td>

                  {/* Rank */}
                  <td className="py-2 px-1 text-center font-black text-slate-800 bg-slate-50 border-r border-slate-200">
                    {rank}
                  </td>

                  {/* Pass/Fail */}
                  <td className={`py-2 px-1 text-center font-extrabold text-[11px] border-r border-slate-200 ${passFail === 'ជាប់' ? 'text-emerald-600' : passFail === 'ធ្លាក់' ? 'text-red-600' : 'text-slate-400'}`}>
                    {passFail}
                  </td>

                  {/* Grade */}
                  <td className="py-2 px-1 text-center border-r border-slate-200">
                    {grade.l !== "—" ? (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded-full text-white font-black text-[10px]"
                        style={{ backgroundColor: grade.c }}
                      >
                        {grade.l}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Domains: Knowledge, Skills, Values, Participation */}
                  {(["knowledge", "skills", "values", "participation"] as const).map((dKey) => {
                    const currentVal = dom[dKey] || (semFinalAvg !== null ? deriveDomainLetter(semFinalAvg) : "");
                    return (
                      <td key={dKey} className="py-1 px-1 text-center bg-amber-50/30 border-r border-amber-100">
                        {editMode ? (
                          <select
                            value={currentVal}
                            onChange={(e) => onUpdateExamDomain(s.id, dKey, e.target.value)}
                            className="bg-white border border-amber-300 rounded text-[10.5px] font-bold px-1 py-0.5 outline-none"
                          >
                            <option value="">—</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                            <option value="E">E</option>
                            <option value="F">F</option>
                          </select>
                        ) : (
                          <span className="font-extrabold text-amber-950 text-xs">
                            {currentVal || "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Remarks */}
                  <td className="py-1 px-1.5 text-center">
                    {editMode ? (
                      <input
                        type="text"
                        value={rec.remarks || ""}
                        onChange={(e) => onUpdateExamRemark(s.id, e.target.value)}
                        placeholder="ផ្សេងៗ..."
                        className="w-full text-left border border-slate-300 rounded px-1 py-0.5 text-[11px] outline-none focus:border-blue-500 font-medium"
                      />
                    ) : (
                      <span className="text-slate-600 text-[10.5px] font-medium">
                        {rec.remarks || "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Bottom Summary Row */}
          <tfoot>
            <tr className="bg-slate-900 text-white font-extrabold text-[10px] whitespace-nowrap">
              <td colSpan={3} className="py-2.5 px-3 text-center sticky left-0 z-20 bg-slate-900 border-r border-slate-800">
                មធ្យមភាគថ្នាក់សរុប (Class Averages)
              </td>
              {EXAM_SUBJECTS.map((subj) => {
                const vals = students
                  .map((s) => studentScoresMap[s.id]?.[subj])
                  .filter((v): v is number => v !== undefined && v !== "" && v !== null && !isNaN(Number(v)));
                const avg = vals.length > 0 ? truncate2(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                return (
                  <td key={subj} className="py-2.5 px-1 text-center text-amber-300 border-r border-slate-800">
                    {avg !== null ? fmtAvg(avg) : "—"}
                  </td>
                );
              })}
              <td colSpan={2} className="py-2.5 px-2 text-center text-blue-300 border-r border-slate-800">
                ម.ប្រឡង: {fmtAvg(classAvg)}
              </td>
              <td colSpan={2} className="py-2.5 px-2 text-center text-indigo-300 border-r border-slate-800">
                ជាប់: {passCount} / ធ្លាក់: {failCount}
              </td>
              <td colSpan={7} className="py-2.5 px-2 text-center text-slate-400">
                សរុប: {totalCount} នាក់
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Import Semester Exam Scores Modal */}
      {onImportExamScores && (
        <SemesterExamImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          students={students}
          semesterId={semesterId}
          existingExamRecords={examRecords}
          onImportExamScores={onImportExamScores}
          toast={toast}
          className={className}
        />
      )}
    </div>
  );
};
