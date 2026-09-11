import React, { useState } from "react";
import { Student, ScoreMap, SemesterExamRecord, DomainGrades } from "../types";
import {
  EXAM_SUBJECTS, EVAL_DOMAINS,
  fmtAvg, fmtTotal, fmtScore, gradeOf, resultOf, truncate2, toKhNum,
  getSemesterExamTotal, getSemesterExamAvg,
  computeStudentSemesterMonthlyAvg, computeStudentSemesterFinalAvg,
  computeStudentAnnualAvg, deriveDomainLetter
} from "../lib/constants";
import * as XLSX from "xlsx";
import { printHTML } from "../lib/printUtils";

interface MasterSemesterAnnualTableProps {
  students: Student[];
  allMonthsScores: Record<string, Record<string, ScoreMap>>; // key: `${semId}_${monthIdx}`
  examRecordsS1: Record<string, SemesterExamRecord>;
  examRecordsS2: Record<string, SemesterExamRecord>;
  annualRemarks?: Record<string, string>;
  editMode: boolean;
  onUpdateExamScore?: (semId: "s1" | "s2", studentId: string, subject: string, value: number | "") => void;
  onUpdateExamDomain?: (semId: "s1" | "s2", studentId: string, domainKey: keyof DomainGrades, value: string) => void;
  onUpdateAnnualRemark?: (studentId: string, remark: string) => void;
  onOpenPhotoModal: (id: string, name: string, gender: string) => void;
  honorPhotos: Record<string, string>;
  schoolName?: string;
  teacherName?: string;
  className?: string;
}

export const MasterSemesterAnnualTable: React.FC<MasterSemesterAnnualTableProps> = ({
  students,
  allMonthsScores,
  examRecordsS1,
  examRecordsS2,
  annualRemarks = {},
  editMode,
  onUpdateExamScore,
  onUpdateExamDomain,
  onUpdateAnnualRemark,
  onOpenPhotoModal,
  honorPhotos,
  schoolName = "សាលាបឋមសិក្សា",
  teacherName = "",
  className = "",
}) => {
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [viewScope, setViewScope] = useState<"all" | "s1" | "s2" | "annual">("all");

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

  // Extract score maps for calculation
  const s1ScoresMap: Record<string, ScoreMap> = {};
  const s2ScoresMap: Record<string, ScoreMap> = {};
  students.forEach((s) => {
    s1ScoresMap[s.id] = examRecordsS1[s.id]?.scores || {};
    s2ScoresMap[s.id] = examRecordsS2[s.id]?.scores || {};
  });

  // 1. Calculate Semester 1 Rankings
  const s1WithMetrics = students.map((s) => {
    const s1FinalAvg = computeStudentSemesterFinalAvg(s.id, "s1", allMonthsScores, s1ScoresMap);
    return { id: s.id, s1FinalAvg, lastName: s.lastName };
  });
  const s1Sorted = [...s1WithMetrics]
    .filter((item) => item.s1FinalAvg !== null && item.s1FinalAvg > 0)
    .sort((a, b) => {
      const scoreA = a.s1FinalAvg ?? -1;
      const scoreB = b.s1FinalAvg ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (a.lastName || "").localeCompare(b.lastName || "", "km");
    });
  const s1RankMap: Record<string, number | string> = {};
  s1Sorted.forEach((item, idx) => {
    if (idx > 0 && item.s1FinalAvg === s1Sorted[idx - 1].s1FinalAvg) {
      s1RankMap[item.id] = s1RankMap[s1Sorted[idx - 1].id];
    } else {
      s1RankMap[item.id] = idx + 1;
    }
  });

  // 2. Calculate Semester 2 Rankings
  const s2WithMetrics = students.map((s) => {
    const s2FinalAvg = computeStudentSemesterFinalAvg(s.id, "s2", allMonthsScores, s2ScoresMap);
    return { id: s.id, s2FinalAvg, lastName: s.lastName };
  });
  const s2Sorted = [...s2WithMetrics]
    .filter((item) => item.s2FinalAvg !== null && item.s2FinalAvg > 0)
    .sort((a, b) => {
      const scoreA = a.s2FinalAvg ?? -1;
      const scoreB = b.s2FinalAvg ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (a.lastName || "").localeCompare(b.lastName || "", "km");
    });
  const s2RankMap: Record<string, number | string> = {};
  s2Sorted.forEach((item, idx) => {
    if (idx > 0 && item.s2FinalAvg === s2Sorted[idx - 1].s2FinalAvg) {
      s2RankMap[item.id] = s2RankMap[s2Sorted[idx - 1].id];
    } else {
      s2RankMap[item.id] = idx + 1;
    }
  });

  // 3. Calculate Annual Rankings
  const annualWithMetrics = students.map((s) => {
    const annualAvg = computeStudentAnnualAvg(s.id, allMonthsScores, s1ScoresMap, s2ScoresMap);
    return { id: s.id, annualAvg, lastName: s.lastName };
  });
  const annualSorted = [...annualWithMetrics]
    .filter((item) => item.annualAvg !== null && item.annualAvg > 0)
    .sort((a, b) => {
      const scoreA = a.annualAvg ?? -1;
      const scoreB = b.annualAvg ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (a.lastName || "").localeCompare(b.lastName || "", "km");
    });
  const annualRankMap: Record<string, number | string> = {};
  annualSorted.forEach((item, idx) => {
    if (idx > 0 && item.annualAvg === annualSorted[idx - 1].annualAvg) {
      annualRankMap[item.id] = annualRankMap[annualSorted[idx - 1].id];
    } else {
      annualRankMap[item.id] = idx + 1;
    }
  });

  // Overall Statistics
  const totalStudents = students.length;
  const femaleStudents = students.filter((s) => s.gender === "ស្រី").length;
  const maleStudents = totalStudents - femaleStudents;

  let annualPassCount = 0;
  let annualFailCount = 0;
  students.forEach((s) => {
    const avg = computeStudentAnnualAvg(s.id, allMonthsScores, s1ScoresMap, s2ScoresMap);
    if (avg !== null) {
      if (avg >= 5.0) annualPassCount++;
      else annualFailCount++;
    }
  });

  // Export Complete Multi-Level Excel Sheet
  const handleExportExcel = () => {
    // Header Row 1
    const row1 = [
      "ល.រ", "គោត្តនាម និងនាម", "ភេទ",
      ...Array(11).fill("ឆមាសទី១ (ពិន្ទុប្រឡង)"),
      "ឆមាសទី១", "ឆមាសទី១", "ឆមាសទី១", "ឆមាសទី១",
      "ឆមាសទី១", "ឆមាសទី១", "ឆមាសទី១", "ឆមាសទី១",
      ...Array(11).fill("ឆមាសទី២ (ពិន្ទុប្រឡង)"),
      "ឆមាសទី២", "ឆមាសទី២", "ឆមាសទី២", "ឆមាសទី២",
      "ឆមាសទី២", "ឆមាសទី២", "ឆមាសទី២", "ឆមាសទី២",
      "ប្រចាំឆ្នាំ", "ប្រចាំឆ្នាំ", "ប្រចាំឆ្នាំ", "ប្រចាំឆ្នាំ", "ប្រចាំឆ្នាំ", "ប្រចាំឆ្នាំ",
      "សេចក្តីផ្សេងៗ"
    ];

    // Header Row 2
    const row2 = [
      "", "", "",
      ...EXAM_SUBJECTS,
      "ម.ប្រឡង", "ម.ប្រចាំខែ", "ម.ប្រចាំឆមាស", "ចំណាត់ថ្នាក់",
      "ចំណេះដឹង", "បំណិន-បំណេះធ្វើ", "តម្លៃ-សីលធម៌", "សមត្ថភាព-ការចូលរួម",
      ...EXAM_SUBJECTS,
      "ម.ប្រឡង", "ម.ប្រចាំខែ", "ម.ប្រចាំឆមាស", "ចំណាត់ថ្នាក់",
      "ចំណេះដឹង", "បំណិន-បំណេះធ្វើ", "តម្លៃ-សីលធម៌", "សមត្ថភាព-ការចូលរួម",
      "មធ្យមភាគប្រចាំឆ្នាំ", "ចំណាត់ថ្នាក់",
      "ចំណេះដឹង", "បំណិន-បំណេះធ្វើ", "តម្លៃ-សីលធម៌", "សមត្ថភាព-ការចូលរួម",
      ""
    ];

    const dataRows = students.map((s, idx) => {
      const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
      const rec1 = examRecordsS1[s.id] || { scores: {} };
      const rec2 = examRecordsS2[s.id] || { scores: {} };

      // S1 Data
      const s1Scores = EXAM_SUBJECTS.map((sb) => rec1.scores?.[sb] !== undefined && rec1.scores[sb] !== "" ? rec1.scores[sb] : "");
      const s1EAvg = getSemesterExamAvg(s.id, s1ScoresMap);
      const s1MAvg = computeStudentSemesterMonthlyAvg(s.id, "s1", allMonthsScores);
      const s1FinalAvg = computeStudentSemesterFinalAvg(s.id, "s1", allMonthsScores, s1ScoresMap);
      const s1Rank = s1RankMap[s.id] ?? "—";
      const s1Dom = rec1.domains || {};

      // S2 Data
      const s2Scores = EXAM_SUBJECTS.map((sb) => rec2.scores?.[sb] !== undefined && rec2.scores[sb] !== "" ? rec2.scores[sb] : "");
      const s2EAvg = getSemesterExamAvg(s.id, s2ScoresMap);
      const s2MAvg = computeStudentSemesterMonthlyAvg(s.id, "s2", allMonthsScores);
      const s2FinalAvg = computeStudentSemesterFinalAvg(s.id, "s2", allMonthsScores, s2ScoresMap);
      const s2Rank = s2RankMap[s.id] ?? "—";
      const s2Dom = rec2.domains || {};

      // Annual Data
      const annualAvg = computeStudentAnnualAvg(s.id, allMonthsScores, s1ScoresMap, s2ScoresMap);
      const annualRank = annualRankMap[s.id] ?? "—";

      return [
        idx + 1,
        fullName,
        s.gender || "",
        ...s1Scores,
        s1EAvg !== null ? fmtAvg(s1EAvg) : "",
        s1MAvg !== null ? fmtAvg(s1MAvg) : "",
        s1FinalAvg !== null ? fmtAvg(s1FinalAvg) : "",
        s1Rank,
        s1Dom.knowledge || (s1FinalAvg !== null ? deriveDomainLetter(s1FinalAvg) : ""),
        s1Dom.skills || (s1FinalAvg !== null ? deriveDomainLetter(s1FinalAvg) : ""),
        s1Dom.values || (s1FinalAvg !== null ? deriveDomainLetter(s1FinalAvg) : ""),
        s1Dom.participation || (s1FinalAvg !== null ? deriveDomainLetter(s1FinalAvg) : ""),
        ...s2Scores,
        s2EAvg !== null ? fmtAvg(s2EAvg) : "",
        s2MAvg !== null ? fmtAvg(s2MAvg) : "",
        s2FinalAvg !== null ? fmtAvg(s2FinalAvg) : "",
        s2Rank,
        s2Dom.knowledge || (s2FinalAvg !== null ? deriveDomainLetter(s2FinalAvg) : ""),
        s2Dom.skills || (s2FinalAvg !== null ? deriveDomainLetter(s2FinalAvg) : ""),
        s2Dom.values || (s2FinalAvg !== null ? deriveDomainLetter(s2FinalAvg) : ""),
        s2Dom.participation || (s2FinalAvg !== null ? deriveDomainLetter(s2FinalAvg) : ""),
        annualAvg !== null ? fmtAvg(annualAvg) : "",
        annualRank,
        annualAvg !== null ? deriveDomainLetter(annualAvg) : "",
        annualAvg !== null ? deriveDomainLetter(annualAvg) : "",
        annualAvg !== null ? deriveDomainLetter(annualAvg) : "",
        annualAvg !== null ? deriveDomainLetter(annualAvg) : "",
        annualRemarks[s.id] || (annualAvg !== null && annualAvg >= 5.0 ? "ឡើងថ្នាក់" : annualAvg !== null ? "ត្រួតថ្នាក់" : "")
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([
      [`តារាងស្រង់ពិន្ទុប្រចាំឆមាស និងឆ្នាំ - ថ្នាក់ ${className}`],
      [`សាលាបឋមសិក្សា: ${schoolName} | គ្រូបង្រៀន: ${teacherName} | សិស្សសរុប: ${totalStudents} នាក់ (ស្រី: ${femaleStudents} នាក់)`],
      [],
      row1,
      row2,
      ...dataRows
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ស្រង់ពិន្ទុឆមាស_និង_ឆ្នាំ");
    XLSX.writeFile(wb, `តារាងស្រង់ពិន្ទុប្រចាំឆមាស_និង_ឆ្នាំ_ថ្នាក់_${className}.xlsx`);
  };

  // Official Landscape Print matching Image 1
  const handlePrint = () => {
    const rowsHtml = students.map((s, idx) => {
      const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
      const rec1 = examRecordsS1[s.id] || { scores: {} };
      const rec2 = examRecordsS2[s.id] || { scores: {} };

      // S1
      const s1ScoresTds = EXAM_SUBJECTS.map((sb) => {
        const val = rec1.scores?.[sb] !== undefined && rec1.scores[sb] !== "" ? rec1.scores[sb] : "—";
        return `<td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8.5px;">${val}</td>`;
      }).join("");
      const s1EAvg = getSemesterExamAvg(s.id, s1ScoresMap);
      const s1MAvg = computeStudentSemesterMonthlyAvg(s.id, "s1", allMonthsScores);
      const s1FinalAvg = computeStudentSemesterFinalAvg(s.id, "s1", allMonthsScores, s1ScoresMap);
      const s1Rank = s1RankMap[s.id] ?? "—";
      const s1Dom = rec1.domains || {};

      // S2
      const s2ScoresTds = EXAM_SUBJECTS.map((sb) => {
        const val = rec2.scores?.[sb] !== undefined && rec2.scores[sb] !== "" ? rec2.scores[sb] : "—";
        return `<td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8.5px;">${val}</td>`;
      }).join("");
      const s2EAvg = getSemesterExamAvg(s.id, s2ScoresMap);
      const s2MAvg = computeStudentSemesterMonthlyAvg(s.id, "s2", allMonthsScores);
      const s2FinalAvg = computeStudentSemesterFinalAvg(s.id, "s2", allMonthsScores, s2ScoresMap);
      const s2Rank = s2RankMap[s.id] ?? "—";
      const s2Dom = rec2.domains || {};

      // Annual
      const annualAvg = computeStudentAnnualAvg(s.id, allMonthsScores, s1ScoresMap, s2ScoresMap);
      const annualRank = annualRankMap[s.id] ?? "—";
      const remark = annualRemarks[s.id] || (annualAvg !== null && annualAvg >= 5.0 ? "ឡើងថ្នាក់" : annualAvg !== null ? "ត្រួតថ្នាក់" : "");

      return `
        <tr style="height:20px;">
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:9px;">${idx + 1}</td>
          <td style="border:1px solid #334155;padding:2px 4px;text-align:left;font-size:9.5px;font-weight:bold;white-space:nowrap;">${fullName}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:9px;">${s.gender === "ស្រី" ? "ស្រី" : "ប្រុស"}</td>
          
          <!-- S1 -->
          ${s1ScoresTds}
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-weight:bold;font-size:8.5px;background:#f8fafc;">${s1EAvg !== null ? fmtAvg(s1EAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-weight:bold;font-size:8.5px;background:#f1f5f9;">${s1MAvg !== null ? fmtAvg(s1MAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-weight:bold;font-size:9px;background:#e0e7ff;color:#1e1b4b;">${s1FinalAvg !== null ? fmtAvg(s1FinalAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-weight:bold;font-size:8.5px;">${s1Rank}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${s1Dom.knowledge || (s1FinalAvg !== null ? deriveDomainLetter(s1FinalAvg) : "—")}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${s1Dom.skills || (s1FinalAvg !== null ? deriveDomainLetter(s1FinalAvg) : "—")}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${s1Dom.values || (s1FinalAvg !== null ? deriveDomainLetter(s1FinalAvg) : "—")}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${s1Dom.participation || (s1FinalAvg !== null ? deriveDomainLetter(s1FinalAvg) : "—")}</td>

          <!-- S2 -->
          ${s2ScoresTds}
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-weight:bold;font-size:8.5px;background:#f8fafc;">${s2EAvg !== null ? fmtAvg(s2EAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-weight:bold;font-size:8.5px;background:#f1f5f9;">${s2MAvg !== null ? fmtAvg(s2MAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-weight:bold;font-size:9px;background:#e0e7ff;color:#1e1b4b;">${s2FinalAvg !== null ? fmtAvg(s2FinalAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-weight:bold;font-size:8.5px;">${s2Rank}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${s2Dom.knowledge || (s2FinalAvg !== null ? deriveDomainLetter(s2FinalAvg) : "—")}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${s2Dom.skills || (s2FinalAvg !== null ? deriveDomainLetter(s2FinalAvg) : "—")}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${s2Dom.values || (s2FinalAvg !== null ? deriveDomainLetter(s2FinalAvg) : "—")}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${s2Dom.participation || (s2FinalAvg !== null ? deriveDomainLetter(s2FinalAvg) : "—")}</td>

          <!-- Annual -->
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-weight:900;font-size:9.5px;background:#fef3c7;color:#78350f;">${annualAvg !== null ? fmtAvg(annualAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-weight:bold;font-size:9px;">${annualRank}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${annualAvg !== null ? deriveDomainLetter(annualAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${annualAvg !== null ? deriveDomainLetter(annualAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${annualAvg !== null ? deriveDomainLetter(annualAvg) : "—"}</td>
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8px;">${annualAvg !== null ? deriveDomainLetter(annualAvg) : "—"}</td>

          <!-- Remarks -->
          <td style="border:1px solid #334155;padding:2px;text-align:center;font-size:8.5px;">${remark}</td>
        </tr>
      `;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>តារាងស្រង់ពិន្ទុប្រចាំឆមាស និងឆ្នាំ</title>
        <style>
          @page { size: A3 landscape; margin: 6mm; }
          body { font-family: 'Hanuman', 'Battambang', sans-serif; margin: 0; color: #000; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { border: 1px solid #334155; padding: 3px 1px; font-size: 8px; background: #f1f5f9; text-align: center; }
          .hdr-title { text-align: center; font-size: 15px; font-weight: bold; margin: 2px 0; }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div>${schoolName}</div>
            <div>ថ្នាក់ទី: <strong>${className}</strong> | គ្រូបង្រៀន: <strong>${teacherName}</strong></div>
          </div>
          <div class="hdr-title">
            តារាងស្រង់ពិន្ទុប្រចាំឆមាស និងឆ្នាំ
          </div>
          <div style="text-align:right;">
            <div>សិស្សសរុប: <strong>${totalStudents}</strong> នាក់ &nbsp; ប្រុស: <strong>${maleStudents}</strong> នាក់ &nbsp; ស្រី: <strong>${femaleStudents}</strong> នាក់</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="3" style="width:20px;">ល.រ</th>
              <th rowspan="3" style="min-width:100px;">គោត្តនាម និងនាម</th>
              <th rowspan="3" style="width:24px;">ភេទ</th>
              <th colspan="19" style="background:#dbeafe;color:#1e3a8a;font-size:9.5px;font-weight:bold;">ឆមាសទី១</th>
              <th colspan="19" style="background:#f3e8ff;color:#581c87;font-size:9.5px;font-weight:bold;">ឆមាសទី២</th>
              <th colspan="6" style="background:#fef3c7;color:#78350f;font-size:9.5px;font-weight:bold;">ប្រចាំឆ្នាំ</th>
              <th rowspan="3" style="min-width:45px;">សេចក្តីផ្សេងៗ</th>
            </tr>
            <tr>
              <!-- S1 Sub-groups -->
              <th colspan="11">ពិន្ទុប្រឡងឆមាស</th>
              <th colspan="4" style="background:#e2e8f0;">លទ្ធផលប្រចាំឆមាស</th>
              <th colspan="4" style="background:#fef3c7;">និទ្ទេសតាមផ្នែក</th>

              <!-- S2 Sub-groups -->
              <th colspan="11">ពិន្ទុប្រឡងឆមាស</th>
              <th colspan="4" style="background:#e2e8f0;">លទ្ធផលប្រចាំឆមាស</th>
              <th colspan="4" style="background:#fef3c7;">និទ្ទេសតាមផ្នែក</th>

              <!-- Annual Sub-groups -->
              <th colspan="2" style="background:#fef3c7;">លទ្ធផល</th>
              <th colspan="4" style="background:#fef3c7;">និទ្ទេសតាមផ្នែក</th>
            </tr>
            <tr>
              <!-- S1 Subjects -->
              ${EXAM_SUBJECTS.map((s) => `<th style="font-size:7.5px;max-width:32px;">${s}</th>`).join("")}
              <th style="font-size:7.5px;">ម.ប្រឡង</th>
              <th style="font-size:7.5px;">ម.ប្រចាំខែ</th>
              <th style="font-size:7.5px;font-weight:bold;background:#e0e7ff;">ម.ឆមាស</th>
              <th style="font-size:7.5px;">ចំ.ថ្នាក់</th>
              <th style="font-size:7px;">ចំណេះដឹង</th>
              <th style="font-size:7px;">បំណិន</th>
              <th style="font-size:7px;">តម្លៃ</th>
              <th style="font-size:7px;">ការចូលរួម</th>

              <!-- S2 Subjects -->
              ${EXAM_SUBJECTS.map((s) => `<th style="font-size:7.5px;max-width:32px;">${s}</th>`).join("")}
              <th style="font-size:7.5px;">ម.ប្រឡង</th>
              <th style="font-size:7.5px;">ម.ប្រចាំខែ</th>
              <th style="font-size:7.5px;font-weight:bold;background:#e0e7ff;">ម.ឆមាស</th>
              <th style="font-size:7.5px;">ចំ.ថ្នាក់</th>
              <th style="font-size:7px;">ចំណេះដឹង</th>
              <th style="font-size:7px;">បំណិន</th>
              <th style="font-size:7px;">តម្លៃ</th>
              <th style="font-size:7px;">ការចូលរួម</th>

              <!-- Annual Columns -->
              <th style="font-size:7.5px;font-weight:bold;background:#fde68a;">ម.ប្រចាំឆ្នាំ</th>
              <th style="font-size:7.5px;">ចំ.ថ្នាក់</th>
              <th style="font-size:7px;">ចំណេះដឹង</th>
              <th style="font-size:7px;">បំណិន</th>
              <th style="font-size:7px;">តម្លៃ</th>
              <th style="font-size:7px;">ការចូលរួម</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:10px;">
          <div style="text-align:center;width:220px;">
            <div>បានឃើញ និងឯកភាព</div>
            <div style="font-weight:bold;margin-top:4px;">នាយកកម្រង</div>
          </div>
          <div style="text-align:center;width:220px;">
            <div>បានឃើញ និងពិនិត្យត្រឹមត្រូវ</div>
            <div style="font-weight:bold;margin-top:4px;">នាយកសាលា</div>
          </div>
          <div style="text-align:center;width:220px;">
            <div>ថ្ងៃទី........ ខែ........ ឆ្នាំ២០២៦</div>
            <div style="font-weight:bold;margin-top:4px;">គ្រូប្រចាំថ្នាក់</div>
            <div style="margin-top:30px;font-weight:bold;">${teacherName}</div>
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
        <div className="text-3xl mb-2">📋</div>
        <div className="text-xs font-semibold">មិនទាន់មានសិស្សក្នុងថ្នាក់</div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3 space-y-2">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-base">📋</span>
            <h2 className="text-xs font-black text-slate-800">
              តារាងស្រង់ពិន្ទុប្រចាំឆមាស និងឆ្នាំ (Master Sheet)
            </h2>
          </div>

          {/* Quick Filter Scope */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setViewScope("all")}
              className={`px-2.5 py-0.5 rounded-md font-bold transition ${
                viewScope === "all" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🌐 មើលទាំងអស់ (All)
            </button>
            <button
              onClick={() => setViewScope("s1")}
              className={`px-2.5 py-0.5 rounded-md font-bold transition ${
                viewScope === "s1" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📘 ឆមាសទី១
            </button>
            <button
              onClick={() => setViewScope("s2")}
              className={`px-2.5 py-0.5 rounded-md font-bold transition ${
                viewScope === "s2" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📙 ឆមាសទី២
            </button>
            <button
              onClick={() => setViewScope("annual")}
              className={`px-2.5 py-0.5 rounded-md font-bold transition ${
                viewScope === "annual" ? "bg-white text-amber-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🏆 ប្រចាំឆ្នាំ
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
            <span>👥 {totalStudents} នាក់ (ស្រី {femaleStudents})</span>
            <span>·</span>
            <span className="text-emerald-700">ឡើងថ្នាក់: {annualPassCount}</span>
            <span>·</span>
            <span className="text-red-600">ត្រួតថ្នាក់: {annualFailCount}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-2.5 py-1 rounded-lg transition shadow-xs flex items-center gap-1"
            title="ទាញយកជា Excel ពេញលេញ"
          >
            📥 Excel
          </button>

          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1 rounded-lg transition shadow-xs flex items-center gap-1"
            title="បោះពុម្ពតារាងស្រង់ពិន្ទុប្រចាំឆមាស និងឆ្នាំ"
          >
            🖨️ បោះពុម្ព (Print)
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
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

      {/* Master Sheet Table */}
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm max-h-[75vh]">
        <table className="w-full text-xs text-left text-slate-700 border-collapse">
          <thead className="sticky top-0 z-20">
            {/* Header Row 1 */}
            <tr className="bg-slate-900 text-white font-black text-[10px] whitespace-nowrap">
              <th rowSpan={3} className="py-2 px-1 text-center w-8 sticky left-0 z-30 bg-slate-900 border-r border-slate-800">
                ល.រ
              </th>
              <th rowSpan={3} className="py-2 px-2 text-left min-w-[130px] sticky left-8 z-30 bg-slate-900 border-r border-slate-800">
                គោត្តនាម និងនាម
              </th>
              <th rowSpan={3} className="py-2 px-1 text-center w-10 sticky left-[162px] z-30 bg-slate-900 border-r border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                ភេទ
              </th>

              {/* S1 Group */}
              {(viewScope === "all" || viewScope === "s1") && (
                <th colSpan={19} className="py-1 px-2 text-center bg-blue-950 text-blue-200 border-b border-r border-blue-800 font-black">
                  📘 ឆមាសទី១ (SEMESTER 1)
                </th>
              )}

              {/* S2 Group */}
              {(viewScope === "all" || viewScope === "s2") && (
                <th colSpan={19} className="py-1 px-2 text-center bg-purple-950 text-purple-200 border-b border-r border-purple-800 font-black">
                  📙 ឆមាសទី២ (SEMESTER 2)
                </th>
              )}

              {/* Annual Group */}
              {(viewScope === "all" || viewScope === "annual") && (
                <th colSpan={6} className="py-1 px-2 text-center bg-amber-950 text-amber-200 border-b border-r border-amber-800 font-black">
                  🏆 ប្រចាំឆ្នាំ (ANNUAL)
                </th>
              )}

              <th rowSpan={3} className="py-2 px-2 text-center min-w-[70px] bg-slate-900 text-white">
                សេចក្តីផ្សេងៗ
              </th>
            </tr>

            {/* Header Row 2: Subgroups */}
            <tr className="bg-slate-800 text-white font-bold text-[9px] whitespace-nowrap">
              {/* S1 Subgroups */}
              {(viewScope === "all" || viewScope === "s1") && (
                <>
                  <th colSpan={11} className="py-1 px-1 text-center bg-blue-900/90 text-blue-100 border-r border-blue-800">
                    ពិន្ទុប្រឡងឆមាស
                  </th>
                  <th colSpan={4} className="py-1 px-1 text-center bg-indigo-900/90 text-indigo-100 border-r border-indigo-800">
                    លទ្ធផលប្រចាំឆមាស
                  </th>
                  <th colSpan={4} className="py-1 px-1 text-center bg-amber-900/90 text-amber-100 border-r border-amber-800">
                    និទ្ទេសតាមផ្នែក
                  </th>
                </>
              )}

              {/* S2 Subgroups */}
              {(viewScope === "all" || viewScope === "s2") && (
                <>
                  <th colSpan={11} className="py-1 px-1 text-center bg-purple-900/90 text-purple-100 border-r border-purple-800">
                    ពិន្ទុប្រឡងឆមាស
                  </th>
                  <th colSpan={4} className="py-1 px-1 text-center bg-indigo-900/90 text-indigo-100 border-r border-indigo-800">
                    លទ្ធផលប្រចាំឆមាស
                  </th>
                  <th colSpan={4} className="py-1 px-1 text-center bg-amber-900/90 text-amber-100 border-r border-amber-800">
                    និទ្ទេសតាមផ្នែក
                  </th>
                </>
              )}

              {/* Annual Subgroups */}
              {(viewScope === "all" || viewScope === "annual") && (
                <>
                  <th colSpan={2} className="py-1 px-1 text-center bg-amber-900/90 text-amber-100 border-r border-amber-800">
                    លទ្ធផល
                  </th>
                  <th colSpan={4} className="py-1 px-1 text-center bg-amber-950 text-amber-200 border-r border-amber-900">
                    និទ្ទេសតាមផ្នែក
                  </th>
                </>
              )}
            </tr>

            {/* Header Row 3: Column Names */}
            <tr className="bg-slate-700 text-white font-bold text-[8.5px] whitespace-nowrap">
              {/* S1 Specific Columns */}
              {(viewScope === "all" || viewScope === "s1") && (
                <>
                  {EXAM_SUBJECTS.map((s) => (
                    <th key={`s1_${s}`} className="py-1.5 px-0.5 text-center min-w-[42px] border-r border-slate-600">
                      {s}
                    </th>
                  ))}
                  <th className="py-1.5 px-1 text-center min-w-[46px] bg-blue-900 text-blue-100 border-r border-blue-800">ម.ប្រឡង</th>
                  <th className="py-1.5 px-1 text-center min-w-[46px] bg-blue-900 text-blue-100 border-r border-blue-800">ម.ប្រចាំខែ</th>
                  <th className="py-1.5 px-1 text-center min-w-[50px] bg-indigo-950 text-amber-300 font-black border-r border-indigo-900">ម.ឆមាស</th>
                  <th className="py-1.5 px-1 text-center min-w-[36px] bg-slate-800 text-white border-r border-slate-600">ចំ.ថ្នាក់</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">ចំណេះដឹង</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">បំណិន</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">តម្លៃ</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">ចូលរួម</th>
                </>
              )}

              {/* S2 Specific Columns */}
              {(viewScope === "all" || viewScope === "s2") && (
                <>
                  {EXAM_SUBJECTS.map((s) => (
                    <th key={`s2_${s}`} className="py-1.5 px-0.5 text-center min-w-[42px] border-r border-slate-600">
                      {s}
                    </th>
                  ))}
                  <th className="py-1.5 px-1 text-center min-w-[46px] bg-purple-900 text-purple-100 border-r border-purple-800">ម.ប្រឡង</th>
                  <th className="py-1.5 px-1 text-center min-w-[46px] bg-purple-900 text-purple-100 border-r border-purple-800">ម.ប្រចាំខែ</th>
                  <th className="py-1.5 px-1 text-center min-w-[50px] bg-indigo-950 text-amber-300 font-black border-r border-indigo-900">ម.ឆមាស</th>
                  <th className="py-1.5 px-1 text-center min-w-[36px] bg-slate-800 text-white border-r border-slate-600">ចំ.ថ្នាក់</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">ចំណេះដឹង</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">បំណិន</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">តម្លៃ</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">ចូលរួម</th>
                </>
              )}

              {/* Annual Specific Columns */}
              {(viewScope === "all" || viewScope === "annual") && (
                <>
                  <th className="py-1.5 px-1 text-center min-w-[55px] bg-amber-950 text-amber-300 font-black border-r border-amber-800">ម.ប្រចាំឆ្នាំ</th>
                  <th className="py-1.5 px-1 text-center min-w-[38px] bg-slate-800 text-white border-r border-slate-600">ចំ.ថ្នាក់</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">ចំណេះដឹង</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">បំណិន</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">តម្លៃ</th>
                  <th className="py-1.5 px-0.5 text-center min-w-[36px] bg-amber-900/80 text-amber-100 border-r border-amber-800">ចូលរួម</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredStudents.map((s, idx) => {
              const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
              const photo = honorPhotos[s.id] || s.photoUrl;
              const cellBg = idx % 2 === 0 ? "bg-slate-50/60" : "bg-white";

              // S1
              const rec1 = examRecordsS1[s.id] || { scores: {} };
              const s1EAvg = getSemesterExamAvg(s.id, s1ScoresMap);
              const s1MAvg = computeStudentSemesterMonthlyAvg(s.id, "s1", allMonthsScores);
              const s1FinalAvg = computeStudentSemesterFinalAvg(s.id, "s1", allMonthsScores, s1ScoresMap);
              const s1Rank = s1RankMap[s.id] ?? "—";
              const s1Dom = rec1.domains || {};

              // S2
              const rec2 = examRecordsS2[s.id] || { scores: {} };
              const s2EAvg = getSemesterExamAvg(s.id, s2ScoresMap);
              const s2MAvg = computeStudentSemesterMonthlyAvg(s.id, "s2", allMonthsScores);
              const s2FinalAvg = computeStudentSemesterFinalAvg(s.id, "s2", allMonthsScores, s2ScoresMap);
              const s2Rank = s2RankMap[s.id] ?? "—";
              const s2Dom = rec2.domains || {};

              // Annual
              const annualAvg = computeStudentAnnualAvg(s.id, allMonthsScores, s1ScoresMap, s2ScoresMap);
              const annualRank = annualRankMap[s.id] ?? "—";
              const remark = annualRemarks[s.id] || (annualAvg !== null && annualAvg >= 5.0 ? "ឡើងថ្នាក់" : annualAvg !== null ? "ត្រួតថ្នាក់" : "");

              return (
                <tr key={s.id} className={`${idx % 2 === 0 ? "bg-slate-50/30" : "bg-white"} hover:bg-blue-50/20 transition`}>
                  {/* Sticky Columns */}
                  <td className={`py-1.5 px-1 text-center text-slate-400 font-bold sticky left-0 z-10 ${cellBg} border-r border-slate-200`}>
                    {idx + 1}
                  </td>
                  <td className={`py-1.5 px-2 text-left whitespace-nowrap font-bold text-slate-800 sticky left-8 z-10 ${cellBg} border-r border-slate-200`}>
                    <div
                      onClick={() => onOpenPhotoModal(s.id, fullName, s.gender)}
                      className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600"
                    >
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-blue-400 bg-slate-100 flex items-center justify-center shrink-0">
                        {photo ? (
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px]">{s.gender === "ស្រី" ? "👩" : "👨"}</span>
                        )}
                      </div>
                      <span className="truncate max-w-[110px]">{fullName}</span>
                    </div>
                  </td>
                  <td className={`py-1.5 px-1 text-center font-semibold text-slate-500 sticky left-[162px] z-10 ${cellBg} border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                    {s.gender === "ស្រី" ? "👩" : "👨"}
                  </td>

                  {/* S1 Data Cells */}
                  {(viewScope === "all" || viewScope === "s1") && (
                    <>
                      {EXAM_SUBJECTS.map((subj) => {
                        const val = rec1.scores?.[subj] ?? "";
                        return (
                          <td key={`s1_${subj}`} className="py-1 px-0.5 text-center border-r border-slate-100 font-semibold text-[11px]">
                            {editMode && onUpdateExamScore ? (
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.25}
                                value={val}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === "") onUpdateExamScore("s1", s.id, subj, "");
                                  else {
                                    const num = parseFloat(raw);
                                    onUpdateExamScore("s1", s.id, subj, isNaN(num) ? "" : num);
                                  }
                                }}
                                placeholder="—"
                                className="w-9 text-center border border-blue-200 rounded py-0.5 text-[10.5px] outline-none"
                              />
                            ) : (
                              <span className={Number(val) >= 5 ? "text-emerald-700 font-bold" : val !== "" ? "text-red-600 font-bold" : "text-slate-300"}>
                                {val !== "" && val !== undefined ? fmtScore(val) : "—"}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-1 px-1 text-center bg-blue-50/70 font-extrabold text-blue-900 border-r border-blue-100">
                        {s1EAvg !== null ? fmtAvg(s1EAvg) : "—"}
                      </td>
                      <td className="py-1 px-1 text-center bg-blue-50 font-extrabold text-blue-950 border-r border-blue-100">
                        {s1MAvg !== null ? fmtAvg(s1MAvg) : "—"}
                      </td>
                      <td className="py-1 px-1 text-center bg-indigo-50 font-black text-indigo-950 border-r border-indigo-200">
                        {s1FinalAvg !== null ? fmtAvg(s1FinalAvg) : "—"}
                      </td>
                      <td className="py-1 px-1 text-center font-black text-slate-800 border-r border-slate-200">
                        {s1Rank}
                      </td>

                      {/* S1 Domains */}
                      {(["knowledge", "skills", "values", "participation"] as const).map((dKey) => {
                        const val = s1Dom[dKey] || (s1FinalAvg !== null ? deriveDomainLetter(s1FinalAvg) : "—");
                        return (
                          <td key={`s1_dom_${dKey}`} className="py-1 px-0.5 text-center bg-amber-50/20 font-bold text-amber-950 border-r border-amber-100 text-[10.5px]">
                            {val}
                          </td>
                        );
                      })}
                    </>
                  )}

                  {/* S2 Data Cells */}
                  {(viewScope === "all" || viewScope === "s2") && (
                    <>
                      {EXAM_SUBJECTS.map((subj) => {
                        const val = rec2.scores?.[subj] ?? "";
                        return (
                          <td key={`s2_${subj}`} className="py-1 px-0.5 text-center border-r border-slate-100 font-semibold text-[11px]">
                            {editMode && onUpdateExamScore ? (
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.25}
                                value={val}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === "") onUpdateExamScore("s2", s.id, subj, "");
                                  else {
                                    const num = parseFloat(raw);
                                    onUpdateExamScore("s2", s.id, subj, isNaN(num) ? "" : num);
                                  }
                                }}
                                placeholder="—"
                                className="w-9 text-center border border-purple-200 rounded py-0.5 text-[10.5px] outline-none"
                              />
                            ) : (
                              <span className={Number(val) >= 5 ? "text-emerald-700 font-bold" : val !== "" ? "text-red-600 font-bold" : "text-slate-300"}>
                                {val !== "" && val !== undefined ? fmtScore(val) : "—"}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-1 px-1 text-center bg-purple-50/70 font-extrabold text-purple-900 border-r border-purple-100">
                        {s2EAvg !== null ? fmtAvg(s2EAvg) : "—"}
                      </td>
                      <td className="py-1 px-1 text-center bg-purple-50 font-extrabold text-purple-950 border-r border-purple-100">
                        {s2MAvg !== null ? fmtAvg(s2MAvg) : "—"}
                      </td>
                      <td className="py-1 px-1 text-center bg-indigo-50 font-black text-indigo-950 border-r border-indigo-200">
                        {s2FinalAvg !== null ? fmtAvg(s2FinalAvg) : "—"}
                      </td>
                      <td className="py-1 px-1 text-center font-black text-slate-800 border-r border-slate-200">
                        {s2Rank}
                      </td>

                      {/* S2 Domains */}
                      {(["knowledge", "skills", "values", "participation"] as const).map((dKey) => {
                        const val = s2Dom[dKey] || (s2FinalAvg !== null ? deriveDomainLetter(s2FinalAvg) : "—");
                        return (
                          <td key={`s2_dom_${dKey}`} className="py-1 px-0.5 text-center bg-amber-50/20 font-bold text-amber-950 border-r border-amber-100 text-[10.5px]">
                            {val}
                          </td>
                        );
                      })}
                    </>
                  )}

                  {/* Annual Data Cells */}
                  {(viewScope === "all" || viewScope === "annual") && (
                    <>
                      <td className="py-1 px-1 text-center bg-amber-100/80 font-black text-amber-950 border-r border-amber-200 text-xs">
                        {annualAvg !== null ? fmtAvg(annualAvg) : "—"}
                      </td>
                      <td className="py-1 px-1 text-center font-black text-slate-800 border-r border-slate-200">
                        {annualRank}
                      </td>
                      {(["knowledge", "skills", "values", "participation"] as const).map((dKey) => {
                        const val = annualAvg !== null ? deriveDomainLetter(annualAvg) : "—";
                        return (
                          <td key={`ann_dom_${dKey}`} className="py-1 px-0.5 text-center bg-amber-50 font-bold text-amber-950 border-r border-amber-100 text-[10.5px]">
                            {val}
                          </td>
                        );
                      })}
                    </>
                  )}

                  {/* Remarks */}
                  <td className="py-1 px-1.5 text-center font-bold text-[11px] text-slate-700">
                    {editMode && onUpdateAnnualRemark ? (
                      <input
                        type="text"
                        value={annualRemarks[s.id] || ""}
                        onChange={(e) => onUpdateAnnualRemark(s.id, e.target.value)}
                        placeholder={remark}
                        className="w-full text-center border border-slate-300 rounded px-1 py-0.5 text-[10.5px] outline-none"
                      />
                    ) : (
                      <span className={remark === "ឡើងថ្នាក់" ? "text-emerald-700" : remark === "ត្រួតថ្នាក់" ? "text-red-600" : "text-slate-600"}>
                        {remark || "—"}
                      </span>
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
