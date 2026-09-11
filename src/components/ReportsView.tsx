import React, { useState, useEffect } from "react";
import { Student, ScoreMap, AttendanceMap, TeacherProfile, InvigilatorData, ReportType, SemesterExamRecord, SchoolReportType, DomainGrades } from "../types";
import {
  MONTHS, SEMESTERS, SUBJECTS,
  fmtAvg, fmtTotal, fmtScore, gradeOf, resultOf, getTotal, getAvg, getRank, buildRankedList,
  KH_ORDER, MT_ORDER, computeReportStats, toKhNum, getClassEvalSubjectCount,
  getSemesterExamAvg, computeStudentSemesterMonthlyAvg, computeStudentSemesterFinalAvg,
  computeStudentAnnualAvg
} from "../lib/constants";
import {
  buildSignatureHtml, buildInvigilatorBoxHTML, buildCandidateDocHTML, buildCertificateHTML,
  buildStudentCardHTML, buildTraineeBookHTML, printHTML, generateStudentQRCodeDataUrl
} from "../lib/printUtils";
import { buildHonorAllPrintHTML, buildHonorTop5PrintHTML } from "../lib/printUtilsHelpers";
import { SchoolReportsView } from "./SchoolReportsView";
import { SemesterExamTable } from "./SemesterExamTable";
import { MasterSemesterAnnualTable } from "./MasterSemesterAnnualTable";
import * as XLSX from "xlsx";

interface ReportsViewProps {
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  attendanceMap: Record<string, AttendanceMap>;
  honorPhotos: Record<string, string>;
  selClass: string;
  semester: string;
  selMonth: number;
  teacher: TeacherProfile | null;
  invigilatorData: InvigilatorData;
  reportType: ReportType;
  onReportTypeChange: (type: ReportType) => void;
  activeCategory?: "class" | "school";
  onCategoryChange?: (category: "class" | "school") => void;
  schoolReportType?: SchoolReportType;
  onSchoolReportTypeChange?: (type: SchoolReportType) => void;
  onOpenInvigilatorModal: () => void;
  onOpenVerifyModal: (student: Student) => void;
  onSaveCoreGrades: () => Promise<void>;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  allMonthsScores?: Record<string, Record<string, ScoreMap>>;
  examRecordsS1?: Record<string, SemesterExamRecord>;
  examRecordsS2?: Record<string, SemesterExamRecord>;
  annualRemarks?: Record<string, string>;
  onUpdateExamScore?: (semId: "s1" | "s2", studentId: string, subject: string, value: number | "") => void;
  onUpdateExamDomain?: (semId: "s1" | "s2", studentId: string, domainKey: keyof DomainGrades, value: string) => void;
  onUpdateExamRemark?: (semId: "s1" | "s2", studentId: string, remark: string) => void;
  onAutoPopulateDomains?: (semId: "s1" | "s2") => void;
  onImportExamScores?: (semId: "s1" | "s2", scoresByStudent: Record<string, Record<string, number | "">>) => Promise<void>;
  onUpdateAnnualRemark?: (studentId: string, remark: string) => void;
  onOpenPhotoModal?: (id: string, name: string, gender: string) => void;
  onOpenGmailModal?: (params?: { recipient?: string; subject?: string; htmlBody?: string }) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  students,
  scoresMap,
  attendanceMap,
  honorPhotos,
  selClass,
  semester,
  selMonth,
  teacher,
  invigilatorData,
  reportType,
  onReportTypeChange,
  activeCategory = "class",
  onCategoryChange,
  schoolReportType = "school_annual_classes",
  onSchoolReportTypeChange,
  onOpenInvigilatorModal,
  onOpenVerifyModal,
  onSaveCoreGrades,
  toast,
  allMonthsScores = {},
  examRecordsS1 = {},
  examRecordsS2 = {},
  annualRemarks = {},
  onUpdateExamScore,
  onUpdateExamDomain,
  onUpdateExamRemark,
  onAutoPopulateDomains,
  onImportExamScores,
  onUpdateAnnualRemark,
  onOpenPhotoModal,
  onOpenGmailModal,
}) => {
  const [reportCategory, setReportCategory] = useState<"class" | "school">(activeCategory || "class");
  const [curSchoolReportType, setCurSchoolReportType] = useState<SchoolReportType>(schoolReportType || "school_annual_classes");

  useEffect(() => {
    if (activeCategory) {
      setReportCategory(activeCategory);
    }
  }, [activeCategory]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>("__all__");
  const [studentCardSem, setStudentCardSem] = useState<string>(semester !== "annual" ? semester : "s1");
  const [annualSortMode, setAnnualSortMode] = useState<"name" | "rank">("name");

  // Certificate & Student List Filtering States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [certQrUrls, setCertQrUrls] = useState<Record<string, string>>({});
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);

  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`.trim();
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";

  // Compute Filtered Students based on search, gender, result, grade, and student selection
  const filteredStudents = students.filter((s) => {
    if (selectedStudentId !== "__all__" && s.id !== selectedStudentId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const fullName = `${s.lastName || ""} ${s.firstName || ""} ${s.latinName || ""} ${s.code || ""}`.toLowerCase();
      if (!fullName.includes(q)) return false;
    }

    if (genderFilter !== "all" && s.gender !== genderFilter) return false;

    const annualAvg = getAvg(s.id, students, scoresMap);
    const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;

    if (resultFilter !== "all") {
      const isPass = avgVal !== null && avgVal >= 5.0;
      if (resultFilter === "pass" && !isPass) return false;
      if (resultFilter === "fail" && isPass) return false;
    }

    if (gradeFilter !== "all") {
      const g = avgVal !== null ? gradeOf(avgVal).l : "F";
      if (g !== gradeFilter) return false;
    }

    return true;
  });

  // Pre-generate QR Codes for Web Preview when reportType is certificate
  React.useEffect(() => {
    if (reportType === "certificate") {
      let active = true;
      const generateAll = async () => {
        setIsGeneratingQr(true);
        const newUrls: Record<string, string> = {};
        for (const s of filteredStudents) {
          const annualAvg = getAvg(s.id, students, scoresMap);
          const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
          const g = avgVal !== null ? gradeOf(avgVal).l : "—";
          const rank = getRank(s.id, students, scoresMap);
          const url = await generateStudentQRCodeDataUrl(s, selClass, schoolName, avgVal, g, rank);
          newUrls[s.id] = url;
        }
        if (active) {
          setCertQrUrls(newUrls);
          setIsGeneratingQr(false);
        }
      };
      generateAll();
      return () => {
        active = false;
      };
    }
  }, [reportType, filteredStudents.length, selectedStudentId, searchQuery, genderFilter, resultFilter, gradeFilter, selClass, schoolName]);

  const computeSemesterDataForStudents = React.useCallback(() => {
    const semId = (semester === "s2" ? "s2" : "s1") as "s1" | "s2";
    const semConfig = SEMESTERS.find((s) => s.id === semId);
    if (!semConfig) return [];

    const currentExamMap = semId === "s1" ? examRecordsS1 : examRecordsS2;
    const studentExamScoresMap: Record<string, ScoreMap> = {};
    students.forEach((s) => {
      studentExamScoresMap[s.id] = currentExamMap[s.id]?.scores || {};
    });

    const rawData = students.map((s) => {
      const monthlyAvg = computeStudentSemesterMonthlyAvg(s.id, semId, allMonthsScores);
      const examAvg = getSemesterExamAvg(s.id, studentExamScoresMap);
      const semAvg = computeStudentSemesterFinalAvg(s.id, semId, allMonthsScores, studentExamScoresMap);

      return {
        student: s,
        monthlyAvg,
        examAvg,
        semAvg,
      };
    });

    const sorted = [...rawData].sort((a, b) => {
      const avgB = b.semAvg ?? -1;
      const avgA = a.semAvg ?? -1;
      if (avgB !== avgA) return avgB - avgA;
      return (a.student.lastName || "").localeCompare(b.student.lastName || "", "km");
    });

    const rankMap: Record<string, number> = {};
    sorted.forEach((item, i) => {
      if (i > 0 && item.semAvg === sorted[i - 1].semAvg) {
        rankMap[item.student.id] = rankMap[sorted[i - 1].student.id];
      } else {
        rankMap[item.student.id] = i + 1;
      }
    });

    return sorted.map((item) => ({
      ...item,
      rank: item.semAvg !== null ? rankMap[item.student.id] : null,
    }));
  }, [students, semester, allMonthsScores, examRecordsS1, examRecordsS2]);

  const computeAnnualDataForStudents = React.useCallback(() => {
    const s1ExamScoresMap: Record<string, ScoreMap> = {};
    const s2ExamScoresMap: Record<string, ScoreMap> = {};
    students.forEach((s) => {
      s1ExamScoresMap[s.id] = examRecordsS1[s.id]?.scores || {};
      s2ExamScoresMap[s.id] = examRecordsS2[s.id]?.scores || {};
    });

    const rawData = students.map((s) => {
      const s1Avg = computeStudentSemesterFinalAvg(s.id, "s1", allMonthsScores, s1ExamScoresMap);
      const s2Avg = computeStudentSemesterFinalAvg(s.id, "s2", allMonthsScores, s2ExamScoresMap);
      const annualAvg = computeStudentAnnualAvg(s.id, allMonthsScores, s1ExamScoresMap, s2ExamScoresMap);

      const stuAtt = attendanceMap[s.id] || {};
      const attVals = Object.values(stuAtt);
      const pCount = attVals.filter((v) => v === "P").length;
      const aCount = attVals.filter((v) => v === "A").length;
      const totalAbs = pCount + aCount;

      return {
        student: s,
        s1Avg,
        s2Avg,
        annualAvg,
        pCount,
        aCount,
        totalAbs,
      };
    });

    const sortedS1 = [...rawData]
      .filter((r) => r.s1Avg !== null)
      .sort((a, b) => (b.s1Avg || 0) - (a.s1Avg || 0));
    const s1RankMap: Record<string, number> = {};
    sortedS1.forEach((item, idx) => {
      if (idx > 0 && item.s1Avg === sortedS1[idx - 1].s1Avg) {
        s1RankMap[item.student.id] = s1RankMap[sortedS1[idx - 1].student.id];
      } else {
        s1RankMap[item.student.id] = idx + 1;
      }
    });

    const sortedS2 = [...rawData]
      .filter((r) => r.s2Avg !== null)
      .sort((a, b) => (b.s2Avg || 0) - (a.s2Avg || 0));
    const s2RankMap: Record<string, number> = {};
    sortedS2.forEach((item, idx) => {
      if (idx > 0 && item.s2Avg === sortedS2[idx - 1].s2Avg) {
        s2RankMap[item.student.id] = s2RankMap[sortedS2[idx - 1].student.id];
      } else {
        s2RankMap[item.student.id] = idx + 1;
      }
    });

    const sortedAnnual = [...rawData]
      .filter((r) => r.annualAvg !== null && r.annualAvg > 0)
      .sort((a, b) => (b.annualAvg || 0) - (a.annualAvg || 0));
    const annualRankMap: Record<string, number> = {};
    sortedAnnual.forEach((item, idx) => {
      if (idx > 0 && item.annualAvg === sortedAnnual[idx - 1].annualAvg) {
        annualRankMap[item.student.id] = annualRankMap[sortedAnnual[idx - 1].student.id];
      } else {
        annualRankMap[item.student.id] = idx + 1;
      }
    });

    return rawData.map((item) => ({
      ...item,
      s1Rank: item.s1Avg !== null && item.s1Avg > 0 ? (s1RankMap[item.student.id] ?? null) : null,
      s2Rank: item.s2Avg !== null && item.s2Avg > 0 ? (s2RankMap[item.student.id] ?? null) : null,
      annualRank: item.annualAvg !== null && item.annualAvg > 0 ? (annualRankMap[item.student.id] ?? null) : null,
    }));
  }, [students, scoresMap, allMonthsScores, attendanceMap]);

  const sortedAnnualData = React.useMemo(() => {
    const data = computeAnnualDataForStudents();
    if (annualSortMode === "rank") {
      return [...data].sort((a, b) => {
        const aHasRank = a.annualRank !== null && (a.annualAvg || 0) > 0;
        const bHasRank = b.annualRank !== null && (b.annualAvg || 0) > 0;
        if (aHasRank && bHasRank) {
          if (a.annualRank !== b.annualRank) {
            return (a.annualRank || 999) - (b.annualRank || 999);
          }
          return (b.annualAvg || 0) - (a.annualAvg || 0);
        }
        if (aHasRank && !bHasRank) return -1;
        if (!aHasRank && bHasRank) return 1;
        const nameA = `${a.student.lastName || ""} ${a.student.firstName || ""}`;
        const nameB = `${b.student.lastName || ""} ${b.student.firstName || ""}`;
        return nameA.localeCompare(nameB, "km");
      });
    }
    return data;
  }, [computeAnnualDataForStudents, annualSortMode]);

  const activeScoresMap = React.useMemo(() => {
    if (reportType === "semester") {
      const map: Record<string, ScoreMap> = {};
      const semData = computeSemesterDataForStudents();
      semData.forEach(s => {
        if (s.semAvg !== null && s.semAvg > 0) {
          map[s.student.id] = { "សមត្ថភាពស្ដាប់": String(s.semAvg) };
        }
      });
      return map;
    } else if (reportType === "annual") {
      const map: Record<string, ScoreMap> = {};
      const annData = computeAnnualDataForStudents();
      annData.forEach(s => {
        if (s.annualAvg !== null && s.annualAvg > 0) {
          map[s.student.id] = { "សមត្ថភាពស្ដាប់": String(s.annualAvg) };
        }
      });
      return map;
    }
    return scoresMap;
  }, [reportType, scoresMap, computeSemesterDataForStudents, computeAnnualDataForStudents]);

  const ranked = buildRankedList(students, activeScoresMap);
  const stats = computeReportStats(students, activeScoresMap);
  const halfIndex = Math.ceil(ranked.length / 2);
  const leftRanked = ranked.slice(0, halfIndex);
  const rightRanked = ranked.slice(halfIndex);

  // Helper to render student ranking table chunk with equal height padding
  const targetRows = Math.max(leftRanked.length, rightRanked.length);

  const renderRankTable = (list: Student[], startIdx: number) => {
    const missingRows = Math.max(0, targetRows - list.length);

    return (
      <table className="rank-table w-full border-collapse border border-slate-300 text-[11px]">
        <thead>
          <tr className="bg-blue-100/90 border border-slate-300">
            <th className="border border-slate-300 py-1.5 px-1 text-center w-7">ល.រ</th>
            <th className="border border-slate-300 py-1.5 px-1.5 text-left min-w-[100px]">គោត្តនាម-នាម</th>
            <th className="border border-slate-300 py-1.5 px-1 text-center w-8">ភេទ</th>
            <th className="border border-slate-300 py-1.5 px-1 text-center min-w-[70px]">ថ្ងៃខែឆ្នាំកំណើត</th>
            <th className="border border-slate-300 py-1.5 px-1 text-center w-12">ពិន្ទុសរុប</th>
            <th className="border border-slate-300 py-1.5 px-1 text-center w-12">ម.ប្រឡង</th>
            <th className="border border-slate-300 py-1.5 px-1 text-center w-10">ចំ.ថ្នាក់</th>
            <th className="border border-slate-300 py-1.5 px-1 text-center w-10">និទ្ទេស</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s, idx) => {
            const rowIdx = startIdx + idx;
            const total = getTotal(s.id, scoresMap);
            const avg = getAvg(s.id, students, scoresMap);
            const g = gradeOf(avg);

            return (
              <tr key={s.id} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                <td className="border border-slate-300 py-1.5 px-1 text-center font-semibold">{rowIdx + 1}</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-left font-bold text-slate-800 whitespace-nowrap">
                  {s.lastName} {s.firstName}
                </td>
                <td className="border border-slate-300 py-1.5 px-1 text-center">{s.gender === "ស្រី" ? "ស្រី" : "ប្រុស"}</td>
                <td className="border border-slate-300 py-1.5 px-1 text-center text-slate-600 text-[10px] whitespace-nowrap">{s.dob || "—"}</td>
                <td className="border border-slate-300 py-1.5 px-1 text-center font-extrabold text-blue-700">{fmtTotal(total)}</td>
                <td className="border border-slate-300 py-1.5 px-1 text-center font-extrabold">{fmtAvg(avg)}</td>
                <td className="border border-slate-300 py-1.5 px-1 text-center font-bold">{s._rank || rowIdx + 1}</td>
                <td className="border border-slate-300 py-1.5 px-1 text-center font-black" style={{ color: g.c }}>
                  {g.l}
                </td>
              </tr>
            );
          })}
          {Array.from({ length: missingRows }).map((_, i) => (
            <tr key={`empty-${i}`} className={(list.length + i) % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
              <td className="border border-slate-300 py-1.5 px-1 text-center text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-left text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
              <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
  const computeCoreGradeRow = (s: Student) => {
    const khRaw = KH_ORDER.map((subj) => scoresMap[s.id]?.[subj]);
    const mtRaw = MT_ORDER.map((subj) => scoresMap[s.id]?.[subj]);
    const khGrades = khRaw.map((v) =>
      v !== "" && v !== undefined && !isNaN(Number(v)) ? gradeOf(Number(v)).l : null
    );
    const mtGrades = mtRaw.map((v) =>
      v !== "" && v !== undefined && !isNaN(Number(v)) ? gradeOf(Number(v)).l : null
    );

    const khValids = khRaw.filter((v) => v !== "" && v !== undefined && !isNaN(Number(v))).map(Number);
    const mtValids = mtRaw.filter((v) => v !== "" && v !== undefined && !isNaN(Number(v))).map(Number);

    const khAvg = khValids.length ? khValids.reduce((a, b) => a + b, 0) / khValids.length : null;
    const mtAvg = mtValids.length ? mtValids.reduce((a, b) => a + b, 0) / mtValids.length : null;

    const khCombined = khAvg !== null ? gradeOf(khAvg).l : null;
    const mtCombined = mtAvg !== null ? gradeOf(mtAvg).l : null;

    return { khGrades, mtGrades, khAvg, mtAvg, khCombined, mtCombined };
  };


  const renderSemesterReportTable = () => {
    const semData = computeSemesterDataForStudents();
    const half = Math.ceil(semData.length / 2);
    const leftSem = semData.slice(0, half);
    const rightSem = semData.slice(half);

    const renderSemTableChunk = (list: any[], startIdx: number) => {
      const targetRows = Math.max(leftSem.length, rightSem.length);
      const missingRows = Math.max(0, targetRows - list.length);
      return (
        <table className="rank-table w-full border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr className="bg-blue-100/90 border border-slate-300">
              <th className="border border-slate-300 py-1.5 px-1 text-center w-7">ល.រ</th>
              <th className="border border-slate-300 py-1.5 px-1.5 text-left min-w-[100px]">គោត្តនាម-នាម</th>
              <th className="border border-slate-300 py-1.5 px-1 text-center w-8">ភេទ</th>
              <th className="border border-slate-300 py-1.5 px-1 text-center min-w-[70px]">ថ្ងៃខែឆ្នាំកំណើត</th>
              <th className="border border-slate-300 py-1.5 px-1 text-center w-12">មធ្យមភាគខែ</th>
              <th className="border border-slate-300 py-1.5 px-1 text-center w-12">ម.ប្រឡងឆមាស</th>
              <th className="border border-slate-300 py-1.5 px-1 text-center w-12">ម.ប្រចាំឆមាស</th>
              <th className="border border-slate-300 py-1.5 px-1 text-center w-10">ចំ.ថ្នាក់</th>
              <th className="border border-slate-300 py-1.5 px-1 text-center w-10">និទ្ទេស</th>
            </tr>
          </thead>
          <tbody>
            {list.map((item, idx) => {
              const rowIdx = startIdx + idx;
              const s = item.student;
              const g = gradeOf(item.semAvg ?? 0);
              return (
                <tr key={s.id} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                  <td className="border border-slate-300 py-1.5 px-1 text-center font-semibold">{rowIdx + 1}</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-left font-bold text-slate-800 whitespace-nowrap">
                    {s.lastName} {s.firstName}
                  </td>
                  <td className="border border-slate-300 py-1.5 px-1 text-center">{s.gender === "ស្រី" ? "ស្រី" : "ប្រុស"}</td>
                  <td className="border border-slate-300 py-1.5 px-1 text-center text-slate-600 text-[10px] whitespace-nowrap">{s.dob || "—"}</td>
                  <td className="border border-slate-300 py-1.5 px-1 text-center font-extrabold">{item.monthlyAvg !== null ? fmtAvg(item.monthlyAvg) : "—"}</td>
                  <td className="border border-slate-300 py-1.5 px-1 text-center font-extrabold text-blue-700">{item.examAvg !== null ? fmtAvg(item.examAvg) : "—"}</td>
                  <td className="border border-slate-300 py-1.5 px-1 text-center font-extrabold text-indigo-700">{item.semAvg !== null ? fmtAvg(item.semAvg) : "—"}</td>
                  <td className="border border-slate-300 py-1.5 px-1 text-center font-bold">{item.rank !== null ? item.rank : "—"}</td>
                  <td className="border border-slate-300 py-1.5 px-1 text-center font-black" style={{ color: g.c }}>
                    {item.semAvg !== null ? g.l : "—"}
                  </td>
                </tr>
              );
            })}
            {Array.from({ length: missingRows }).map((_, i) => (
              <tr key={`empty-${i}`} className={(list.length + i) % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                <td className="border border-slate-300 py-1.5 px-1 text-center text-transparent">&nbsp;</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-left text-transparent">&nbsp;</td>
                <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
                <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
                <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
                <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
                <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
                <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
                <td className="border border-slate-300 py-1.5 px-1 text-transparent">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    };

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
        <div>{renderSemTableChunk(leftSem, 0)}</div>
        <div>{rightSem.length > 0 ? renderSemTableChunk(rightSem, half) : null}</div>
      </div>
    );
  };

  const renderAnnualReportTable = () => {
    const annualData = sortedAnnualData;

    return (
      <div className="overflow-x-auto w-full">
        <table className="w-full border-collapse border border-slate-300 text-[11px] text-center" style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1" }}>
          <thead>
            <tr className="bg-blue-100/90 text-slate-900 font-bold" style={{ backgroundColor: "#dbeafe", color: "#0f172a" }}>
              <th rowSpan={2} className="border border-slate-300 p-1 text-center" style={{ width: "29px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>ល.រ</p>
              </th>
              <th rowSpan={2} className="border border-slate-300 p-1 text-left whitespace-nowrap" style={{ width: "137px", border: "1px solid #cbd5e1", padding: "4px", textAlign: "left" }}>
                <p>គោត្តនាម- នាម</p>
              </th>
              <th rowSpan={2} className="border border-slate-300 p-1 text-center" style={{ width: "32px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>ភេទ</p>
              </th>
              <th rowSpan={2} className="border border-slate-300 p-1 text-center" style={{ width: "112px", border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                <p style={{ textAlign: "center" }}>ថ្ងៃខែឆ្នាំកំណើត</p>
              </th>
              <th rowSpan={2} className="border border-slate-300 p-1 text-left whitespace-nowrap" style={{ minWidth: "260px", border: "1px solid #cbd5e1", padding: "4px", textAlign: "left" }}>
                <p>ទីលំនៅបច្ចុប្បន្ន</p>
              </th>
              <th colSpan={2} className="border border-slate-300 p-1 text-center" style={{ width: "117px", border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                <p style={{ textAlign: "center" }}>មធ្យមភាគប្រចាំឆ១</p>
              </th>
              <th colSpan={2} className="border border-slate-300 p-1 text-center" style={{ width: "112px", border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                <p style={{ textAlign: "center" }}>មធ្យមភាគប្រចាំឆ២</p>
              </th>
              <th colSpan={2} className="border border-slate-300 p-1 text-center" style={{ width: "118px", border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                <p style={{ textAlign: "center" }}>មធ្យមប្រចាំឆ្នាំសិក្សា</p>
              </th>
              <th rowSpan={2} className="border border-slate-300 p-1 text-center" style={{ width: "61px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>និទ្ទេស</p>
              </th>
              <th colSpan={3} className="border border-slate-300 p-1 text-center" style={{ width: "98px", border: "1px solid #cbd5e1", padding: "4px", textAlign: "center" }}>
                <p style={{ textAlign: "center" }}>អវត្តមានសរុប</p>
              </th>
            </tr>
            <tr className="bg-blue-100/90 text-slate-900 font-bold text-[10px]" style={{ backgroundColor: "#dbeafe", color: "#0f172a" }}>
              <th className="border border-slate-300 p-1" style={{ width: "62px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>មធ្យមភាគ</p>
              </th>
              <th className="border border-slate-300 p-1" style={{ width: "48px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>ចំណាត់ថ្នាក់</p>
              </th>
              <th className="border border-slate-300 p-1" style={{ width: "57px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>មធ្យមភាគ</p>
              </th>
              <th className="border border-slate-300 p-1" style={{ width: "48px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>ចំណាត់ថ្នាក់</p>
              </th>
              <th className="border border-slate-300 p-1" style={{ width: "63px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>មធ្យមភាគ</p>
              </th>
              <th className="border border-slate-300 p-1" style={{ width: "48px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>ចំណាត់ថ្នាក់</p>
              </th>
              <th className="border border-slate-300 p-1" style={{ width: "28px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>ច្ប</p>
              </th>
              <th className="border border-slate-300 p-1" style={{ width: "28px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>អច្ប</p>
              </th>
              <th className="border border-slate-300 p-1" style={{ width: "28px", border: "1px solid #cbd5e1", padding: "4px" }}>
                <p>សរុប</p>
              </th>
            </tr>
          </thead>
          <tbody>
            {annualData.map((row, idx) => {
              const s = row.student;
              const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();

              const vil = (s.village || teacher?.village || "រោគ").trim();
              const com = (s.commune || teacher?.commune || "ស្ពានស្រែង").trim();
              const dis = (s.district || teacher?.district || "ភ្នំស្រុក").trim();
              const pro = (s.province || teacher?.province || "បន្ទាយមានជ័យ").trim();

              const vStr = vil ? (vil.startsWith("ភូមិ") ? vil : `ភូមិ${vil}`) : "";
              const cStr = com ? (com.startsWith("ឃុំ") || com.startsWith("សង្កាត់") ? com : `ឃុំ${com}`) : "";
              const dStr = dis ? (dis.startsWith("ស្រុក") || dis.startsWith("ខណ្ឌ") ? dis : `ស្រុក${dis}`) : "";
              const pStr = pro ? (pro.startsWith("ខេត្ត") || pro.startsWith("រាជធានី") ? pro : `ខេត្ត${pro}`) : "";

              const address = [vStr, cStr, dStr, pStr].filter(Boolean).join(" ") || "—";
              const isDropout = row.annualAvg === null || row.annualAvg <= 0;
              const gradeInfo = isDropout ? { l: "បោះបង់", c: "#dc2626" } : gradeOf(row.annualAvg);

              return (
                <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="border border-slate-300 p-1 text-center font-semibold" style={{ border: "1px solid #cbd5e1", padding: "3px" }}>
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 p-1 text-left font-bold text-slate-900 whitespace-nowrap" style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "left" }}>
                    {fullName}
                  </td>
                  <td className="border border-slate-300 p-1 text-center" style={{ border: "1px solid #cbd5e1", padding: "3px" }}>
                    {s.gender || "—"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center whitespace-nowrap" style={{ border: "1px solid #cbd5e1", padding: "3px" }}>
                    {s.dob || "—"}
                  </td>
                  <td className="border border-slate-300 p-1 text-left text-[9.5px] whitespace-nowrap" style={{ border: "1px solid #cbd5e1", padding: "3px 6px", textAlign: "left", whiteSpace: "nowrap" }}>
                    {address}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-semibold" style={{ border: "1px solid #cbd5e1", padding: "3px" }}>
                    {row.s1Avg !== null ? fmtAvg(row.s1Avg) : "—"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-semibold" style={{ border: "1px solid #cbd5e1", padding: "3px" }}>
                    {row.s1Rank !== null ? row.s1Rank : "—"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-semibold" style={{ border: "1px solid #cbd5e1", padding: "3px" }}>
                    {row.s2Avg !== null ? fmtAvg(row.s2Avg) : "—"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-semibold" style={{ border: "1px solid #cbd5e1", padding: "3px" }}>
                    {row.s2Rank !== null ? row.s2Rank : "—"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-bold text-blue-900" style={{ border: "1px solid #cbd5e1", padding: "3px", color: "#1e3a8a" }}>
                    {row.annualAvg !== null ? fmtAvg(row.annualAvg) : "—"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-bold text-blue-900" style={{ border: "1px solid #cbd5e1", padding: "3px", color: "#1e3a8a" }}>
                    {row.annualRank !== null ? row.annualRank : "—"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-black" style={{ border: "1px solid #cbd5e1", padding: "3px", color: gradeInfo.c }}>
                    {gradeInfo.l}
                  </td>
                  <td className="border border-slate-300 p-1 text-center" style={{ border: "1px solid #cbd5e1", padding: "3px" }}>
                    {row.pCount}
                  </td>
                  <td className="border border-slate-300 p-1 text-center" style={{ border: "1px solid #cbd5e1", padding: "3px" }}>
                    {row.aCount}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-bold" style={{ border: "1px solid #cbd5e1", padding: "3px" }}>
                    {row.totalAbs}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const computeCoreGradeStats = () => {
    const total = students.length || 1;
    const khCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    const mtCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

    students.forEach((s) => {
      const r = computeCoreGradeRow(s);
      if (r.khCombined && khCounts[r.khCombined] !== undefined) {
        khCounts[r.khCombined]++;
      }
      if (r.mtCombined && mtCounts[r.mtCombined] !== undefined) {
        mtCounts[r.mtCombined]++;
      }
    });

    const khAbcCount = khCounts.A + khCounts.B + khCounts.C;
    const khDefCount = khCounts.D + khCounts.E + khCounts.F;
    const mtAbcCount = mtCounts.A + mtCounts.B + mtCounts.C;
    const mtDefCount = mtCounts.D + mtCounts.E + mtCounts.F;

    return {
      total,
      khCounts,
      mtCounts,
      khAbcPct: ((khAbcCount / total) * 100).toFixed(1) + "%",
      khDefPct: ((khDefCount / total) * 100).toFixed(1) + "%",
      mtAbcPct: ((mtAbcCount / total) * 100).toFixed(1) + "%",
      mtDefPct: ((mtDefCount / total) * 100).toFixed(1) + "%",
    };
  };

  // Export Core Grades XLSX
  const handleExportCoreGradesXLSX = () => {
    if (!students.length) return;
    const buildRows = (order: string[], title: string) => {
      const row0 = ["ល.រ", "គោត្តនាម-នាម", "ភេទ", "ថ្ងៃខែឆ្នាំកំណើត", title, ...Array(order.length - 1).fill(""), "និទ្ទេសរួម"];
      const row1 = ["", "", "", "", ...order, ""];
      const rows = [row0, row1];
      students.forEach((s, i) => {
        const r = computeCoreGradeRow(s);
        const grades = order === KH_ORDER ? r.khGrades : r.mtGrades;
        const combined = order === KH_ORDER ? r.khCombined : r.mtCombined;
        rows.push([i + 1, `${s.lastName} ${s.firstName}`, s.gender, s.dob || "", ...grades.map((g) => g || ""), combined || ""]);
      });
      return rows;
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildRows(KH_ORDER, "លទ្ធផលតេស្ត មុខវិជ្ជាភាសាខ្មែរ")), "ភាសាខ្មែរ");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildRows(MT_ORDER, "លទ្ធផលតេស្ត មុខវិជ្ជាគណិតវិទ្យា")), "គណិតវិទ្យា");
    const semLabel = SEMESTERS.find((x) => x.id === semester)?.label || semester;
    XLSX.writeFile(wb, `coregrades_${selClass}_${semLabel}_${MONTHS[selMonth]}.xlsx`);
    toast("📥 Export និទ្ទេសគោល Excel រួចរាល់");
  };

  // Dedicated Annual Report Printer (1-page A4 Landscape with either Name or Rank sort)
  const handlePrintAnnual = (sortMode: "name" | "rank") => {
    const data = computeAnnualDataForStudents();
    const sorted = sortMode === "rank"
      ? [...data].sort((a, b) => {
          const aHasRank = a.annualRank !== null && (a.annualAvg || 0) > 0;
          const bHasRank = b.annualRank !== null && (b.annualAvg || 0) > 0;
          if (aHasRank && bHasRank) {
            if (a.annualRank !== b.annualRank) {
              return (a.annualRank || 999) - (b.annualRank || 999);
            }
            return (b.annualAvg || 0) - (a.annualAvg || 0);
          }
          if (aHasRank && !bHasRank) return -1;
          if (!aHasRank && bHasRank) return 1;
          const nameA = `${a.student.lastName || ""} ${a.student.firstName || ""}`;
          const nameB = `${b.student.lastName || ""} ${b.student.firstName || ""}`;
          return nameA.localeCompare(nameB, "km");
        })
      : data;

    const rowsHtml = sorted.map((row, idx) => {
      const s = row.student;
      const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
      const vil = (s.village || teacher?.village || "រោគ").trim();
      const com = (s.commune || teacher?.commune || "ស្ពានស្រែង").trim();
      const dis = (s.district || teacher?.district || "ភ្នំស្រុក").trim();
      const pro = (s.province || teacher?.province || "បន្ទាយមានជ័យ").trim();
      const vStr = vil ? (vil.startsWith("ភូមិ") ? vil : `ភូមិ${vil}`) : "";
      const cStr = com ? (com.startsWith("ឃុំ") || com.startsWith("សង្កាត់") ? com : `ឃុំ${com}`) : "";
      const dStr = dis ? (dis.startsWith("ស្រុក") || dis.startsWith("ខណ្ឌ") ? dis : `ស្រុក${dis}`) : "";
      const pStr = pro ? (pro.startsWith("ខេត្ត") || pro.startsWith("រាជធានី") ? pro : `ខេត្ត${pro}`) : "";
      const address = [vStr, cStr, dStr, pStr].filter(Boolean).join(" ") || "—";
      const isDropout = row.annualAvg === null || row.annualAvg <= 0;
      const gradeInfo = isDropout ? { l: "បោះបង់", c: "#dc2626" } : gradeOf(row.annualAvg);

      return `
        <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"}">
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-weight: 600;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: left; font-weight: bold; white-space: nowrap; color: #0f172a;">${fullName}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center;">${s.gender || "—"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; white-space: nowrap;">${s.dob || "—"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: left; font-size: 8.5px; white-space: nowrap;">${address}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-weight: 600;">${row.s1Avg !== null ? fmtAvg(row.s1Avg) : "—"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-weight: 600;">${row.s1Rank !== null ? row.s1Rank : "—"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-weight: 600;">${row.s2Avg !== null ? fmtAvg(row.s2Avg) : "—"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-weight: 600;">${row.s2Rank !== null ? row.s2Rank : "—"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-weight: bold; color: #1e3a8a;">${row.annualAvg !== null ? fmtAvg(row.annualAvg) : "—"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-weight: bold; color: #1e3a8a;">${row.annualRank !== null ? row.annualRank : "—"}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-weight: 900; color: ${gradeInfo.c};">${gradeInfo.l}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center;">${row.pCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center;">${row.aCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-weight: bold;">${row.totalAbs}</td>
        </tr>
      `;
    }).join("");

    const sortSuffix = sortMode === "rank" ? "(តម្រៀបតាមចំណាត់ថ្នាក់)" : "(តម្រៀបតាមឈ្មោះសិស្ស)";
    const sigHtml = buildSignatureHtml(tName, selMonth, teacher?.village, true);

    const html = `<!DOCTYPE html><html lang="km"><head><meta charset="UTF-8"><title>ចំណាត់ថ្នាក់ដំណាច់ឆ្នាំ - ថ្នាក់ទី ${selClass}</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700;900&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
      @page{size:A4 landscape;margin:4mm 5mm 3mm 5mm;}
      body{font-family:'Hanuman','Battambang',sans-serif;font-size:9.5px;line-height:1.25;color:#0f172a;background:#fff;width:100%;}
      table{width:100%;border-collapse:collapse;font-size:9px;}
      th{background-color:#dbeafe !important;color:#0f172a !important;border:1px solid #94a3b8;padding:2.5px 2px;font-weight:bold;text-align:center;}
      td{border:1px solid #cbd5e1;padding:1.5px 2px;text-align:center;}
    </style></head><body>
      <div style="width:100%;padding:0;">
        <div style="text-align:center;margin-bottom:3px;">
          <h2 style="font-size:13px;font-weight:900;color:#0f172a;line-height:1.25;">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
          <div style="font-size:9px;color:#92400e;margin-top:1px;">꧁ ༺ ༻ ꧂</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px;">
          <div style="font-size:10px;font-weight:bold;color:#0f172a;line-height:1.35;">
            <div>រដ្ឋបាលស្រុកភ្នំស្រុក</div>
            <div>ការិយាល័យអប់រំ យុវជន និងកីឡាស្រុក</div>
            <div>កម្រងស្ពានស្រែង</div>
            <div>${schoolName}</div>
          </div>
        </div>
        <hr style="border:none;border-top:1.5px solid #0f172a;margin-bottom:5px;width:100%;">
        <div style="text-align:center;margin-bottom:5px;">
          <h3 style="font-size:13.5px;font-weight:900;color:#0f172a;margin:0;">ចំណាត់ថ្នាក់ដំណាច់ឆ្នាំ ${sortSuffix}</h3>
          <p style="font-size:10.5px;font-weight:bold;color:#1e293b;margin-top:1.5px;">ថ្នាក់ទី ${selClass} · ឆ្នាំសិក្សា ២០២៥-២០២៦</p>
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;text-align:center;">
          <thead>
            <tr style="background-color:#dbeafe;color:#0f172a;font-weight:bold;">
              <th rowspan="2" style="width:28px;border:1px solid #94a3b8;padding:3px 2px;">ល.រ</th>
              <th rowspan="2" style="width:130px;border:1px solid #94a3b8;padding:3px 4px;text-align:left;">គោត្តនាម-នាម</th>
              <th rowspan="2" style="width:30px;border:1px solid #94a3b8;padding:3px 2px;">ភេទ</th>
              <th rowspan="2" style="width:95px;border:1px solid #94a3b8;padding:3px 2px;">ថ្ងៃខែឆ្នាំកំណើត</th>
              <th rowspan="2" style="min-width:220px;border:1px solid #94a3b8;padding:3px 4px;text-align:left;">ទីលំនៅបច្ចុប្បន្ន</th>
              <th colspan="2" style="width:105px;border:1px solid #94a3b8;padding:3px 2px;">មធ្យមភាគប្រចាំឆ១</th>
              <th colspan="2" style="width:105px;border:1px solid #94a3b8;padding:3px 2px;">មធ្យមភាគប្រចាំឆ២</th>
              <th colspan="2" style="width:110px;border:1px solid #94a3b8;padding:3px 2px;">មធ្យមប្រចាំឆ្នាំសិក្សា</th>
              <th rowspan="2" style="width:55px;border:1px solid #94a3b8;padding:3px 2px;">និទ្ទេស</th>
              <th colspan="3" style="width:85px;border:1px solid #94a3b8;padding:3px 2px;">អវត្តមានសរុប</th>
            </tr>
            <tr style="background-color:#dbeafe;color:#0f172a;font-weight:bold;font-size:8.5px;">
              <th style="width:55px;border:1px solid #94a3b8;padding:2px;">មធ្យមភាគ</th>
              <th style="width:45px;border:1px solid #94a3b8;padding:2px;">ចំណាត់ថ្នាក់</th>
              <th style="width:55px;border:1px solid #94a3b8;padding:2px;">មធ្យមភាគ</th>
              <th style="width:45px;border:1px solid #94a3b8;padding:2px;">ចំណាត់ថ្នាក់</th>
              <th style="width:58px;border:1px solid #94a3b8;padding:2px;">មធ្យមភាគ</th>
              <th style="width:48px;border:1px solid #94a3b8;padding:2px;">ចំណាត់ថ្នាក់</th>
              <th style="width:25px;border:1px solid #94a3b8;padding:2px;">ច្ប</th>
              <th style="width:25px;border:1px solid #94a3b8;padding:2px;">អច្ប</th>
              <th style="width:25px;border:1px solid #94a3b8;padding:2px;">សរុប</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;font-size:8.5px;line-height:1.35;">
          <div style="border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;background-color:#f8fafc;">
            <div style="font-weight:800;color:#0f172a;margin-bottom:2px;">👥 សិស្សទាំងអស់</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span>-សរុប <strong>${stats.total}</strong>នាក់ (${stats.male + stats.female ? "100%" : "0%"})</span>
              <span>ប្រុស <strong>${stats.male}</strong>នាក់ (${stats.malePct}%)</span>
              <span>ស្រី <strong>${stats.female}</strong>នាក់ (${stats.femalePct}%)</span>
            </div>
            <div style="font-weight:800;color:#0f172a;margin-top:2px;margin-bottom:1px;">📊 ចំណាត់ថ្នាក់ដោយនិទ្ទេស</div>
            ${(["A", "B", "C", "D", "E", "F"] as const).map((g) => {
              const item = stats.grades[g];
              if (!item || item.count === 0) return "";
              const col = gradeOf(g === "A" ? 9.0 : g === "B" ? 8.0 : g === "C" ? 7.0 : g === "D" ? 6.0 : g === "E" ? 5.0 : 3.0).c;
              return `<div style="display:flex;justify-content:space-between;">
                <span>-សិស្សនិទ្ទេស <strong style="color:${col};font-weight:800;">${g}</strong> សរុប <strong>${item.count}</strong>នាក់ (${item.pct}%)</span>
                <span style="color:#475569;">ស្រី <strong>${item.female}</strong>នាក់ (${item.femalePct}%)</span>
              </div>`;
            }).join("")}
            ${stats.dropoutCount > 0 ? `
              <div style="display:flex;justify-content:space-between;border-top:1px solid #cbd5e1;padding-top:2px;margin-top:2px;">
                <span>-សិស្ស <strong style="color:#dc2626;font-weight:800;">បោះបង់ការសិក្សា</strong> សរុប <strong style="color:#dc2626;">${stats.dropoutCount}</strong>នាក់ (${stats.dropoutPct}%)</span>
                <span style="color:#475569;">ស្រី <strong style="color:#dc2626;">${stats.dropoutFemale}</strong>នាក់</span>
              </div>
            ` : ""}
          </div>

          <div style="border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;background-color:#f8fafc;">
            <div style="font-weight:800;color:#0f172a;margin-bottom:2px;">✅ លទ្ធផលការប្រឡង</div>
            <div style="display:flex;justify-content:space-between;">
              <span>-ជាប់ <strong style="color:#15803d;font-weight:800;">${stats.passCount}</strong>នាក់ (${stats.passPct}%)</span>
              <span style="color:#475569;">ស្រី <strong style="color:#15803d;">${stats.passFemale}</strong>នាក់ (${stats.passFemale ? Math.round((stats.passFemale / stats.female) * 100) : 0}%)</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span>-ធ្លាក់ <strong style="color:#dc2626;font-weight:800;">${stats.failCount}</strong>នាក់ (${stats.failPct}%)</span>
              <span style="color:#475569;">ស្រី <strong style="color:#dc2626;">${stats.failFemale}</strong>នាក់</span>
            </div>
            ${stats.dropoutCount > 0 ? `
              <div style="display:flex;justify-content:space-between;">
                <span>-បោះបង់ <strong style="color:#64748b;font-weight:800;">${stats.dropoutCount}</strong>នាក់ (${stats.dropoutPct}%)</span>
                <span style="color:#64748b;">ស្រី <strong>${stats.dropoutFemale}</strong>នាក់</span>
              </div>
            ` : ""}
            <div style="font-weight:800;color:#0f172a;margin-top:3px;margin-bottom:2px;">📈 អត្រាប្រឡង</div>
            <div style="display:flex;justify-content:space-between;">
              <span>-អត្រាជាប់ ៖ <strong style="color:#15803d;">${stats.passPct}%</strong></span>
              <span>-អត្រាធ្លាក់ ៖ <strong style="color:#dc2626;">${stats.failPct}%</strong></span>
              ${stats.dropoutCount > 0 ? `<span>-អត្រាបោះបង់ ៖ <strong style="color:#64748b;">${stats.dropoutPct}%</strong></span>` : ""}
            </div>
          </div>
        </div>

        <div style="margin-top:10px;">
          ${sigHtml}
        </div>
      </div>
    </body></html>`;

    printHTML(html);
  };

  // Print Handler
  const handlePrintReport = () => {
    if (reportType === "annual") {
      handlePrintAnnual(annualSortMode);
      return;
    }
    if (reportType === "studentcard") {
      const list = selectedStudentId === "__all__" ? students : students.filter((s) => s.id === selectedStudentId);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>សៀវភៅតាមដាន - ថ្នាក់ទី ${selClass}</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Hanuman','Battambang',sans-serif;background:#fff;padding:.4cm .5cm;}
        @page{size:A4 landscape;margin:.4cm .5cm;}
        .page-break{page-break-after:always;width:100%;}
        .page-break:last-child{page-break-after:auto;}
      </style></head><body>` + list.map((s) => `<div class="page-break">${buildStudentCardHTML(s, selClass, teacher, scoresMap, attendanceMap, selMonth, semester, students)}</div>`).join("") + `</body></html>`;
      printHTML(html);
      return;
    }

    if (reportType === "traineebook") {
      const list = selectedStudentId === "__all__" ? students : students.filter((s) => s.id === selectedStudentId);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>សៀវភៅសិក្ខាគារិក - ថ្នាក់ទី ${selClass}</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Hanuman','Battambang',sans-serif;background:#fff;padding:.4cm .5cm;}
        @page{size:A4 landscape;margin:.4cm .5cm;}
        .page-break{page-break-after:always;width:100%;}
        .page-break:last-child{page-break-after:auto;}
      </style></head><body>` + list.map((s, idx) => `<div class="page-break">${buildTraineeBookHTML(s, idx, selClass, teacher, scoresMap, attendanceMap, students)}</div>`).join("") + `</body></html>`;
      printHTML(html);
      return;
    }

    if (reportType === "candidate") {
      const list = selectedStudentId === "__all__" ? students : students.filter((s) => s.id === selectedStudentId);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>សលាកបត្របេក្ខជន</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Hanuman','Battambang',sans-serif;background:#fff;}
        @page{size:A4 portrait;margin:10mm;}
        .page-break{page-break-after:always;}
      </style></head><body>` + list.map((s) => `<div class="page-break">${buildCandidateDocHTML(s, selClass, teacher, students, scoresMap, honorPhotos)}</div>`).join("") + `</body></html>`;
      printHTML(html);
      return;
    }

    if (reportType === "certificate") {
      const list = filteredStudents;
      if (list.length === 0) {
        toast("⚠️ ពុំមានសិស្សនៅក្នុងបញ្ជីជ្រើសរើសទេ", "error");
        return;
      }
      toast(`⏳ កំពុងបង្កើត QR Code សម្រាប់វិញ្ញាបនបត្រ (${list.length} នាក់)...`, "info");

      const qrPromises = list.map(async (s) => {
        const annualAvg = getAvg(s.id, students, scoresMap);
        const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
        const g = avgVal !== null ? gradeOf(avgVal).l : "—";
        const rank = getRank(s.id, students, scoresMap);
        const dataUrl = await generateStudentQRCodeDataUrl(s, selClass, schoolName, avgVal, g, rank);
        return { id: s.id, dataUrl };
      });

      Promise.all(qrPromises).then((qrResults) => {
        const qrMap = Object.fromEntries(qrResults.map((r) => [r.id, r.dataUrl]));
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>វិញ្ញាបនបត្របញ្ជាក់ការសិក្សា - ថ្នាក់ ${selClass} (${list.length} នាក់)</title><style>
          @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Hanuman:wght@400;700;900&display=swap');
          *{box-sizing:border-box;margin:0;padding:0;}
          body{font-family:'Hanuman','Battambang',sans-serif;background:#fff;}
          @page{size:A4 portrait;margin:10mm;}
          .page-break{page-break-after:always;}
          .page-break:last-child{page-break-after:auto;}
        </style></head><body>` + list.map((s) => `<div class="page-break">${buildCertificateHTML(s, selClass, teacher, students, scoresMap, qrMap[s.id])}</div>`).join("") + `</body></html>`;
        
        printHTML(html);
        toast(`✅ បានបង្កើតវិញ្ញាបនបត្រចំនួន ${list.length} ច្បាប់ រួចរាល់!`, "success");
      });
      return;
    }

    const previewEl = document.getElementById("reportDocContent");
    if (!previewEl) return;
    const html = `<!DOCTYPE html><html lang="km"><head><meta charset="UTF-8"><title>របាយការណ៍ - ថ្នាក់ទី ${selClass}</title><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700&display=swap" rel="stylesheet"><style>
      *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
      body{font-family:'Hanuman','Battambang',sans-serif;font-size:11px;line-height:1.5;padding:.2cm .3cm;color:#0f172a;background:#fff;width:100%}
      @page{size:${reportType === "annual" ? "A4 landscape" : "A4 portrait"};margin:.2cm .3cm}
      #reportDocContent{padding:0 !important;border:none !important;box-shadow:none !important;width:100% !important;max-width:100% !important}
      
      .text-center{text-align:center !important}
      .text-left{text-align:left !important}
      .text-right{text-align:right !important}
      .font-bold{font-weight:700 !important}
      .font-black{font-weight:900 !important}
      .font-extrabold{font-weight:800 !important}
      .flex{display:flex !important}
      .justify-between{justify-content:space-between !important}
      .items-start{align-items:flex-start !important}
      .items-center{align-items:center !important}
      .gap-1{gap:4px !important}
      .gap-2{gap:8px !important}
      .gap-3{gap:12px !important}
      .gap-4{gap:16px !important}
      .mb-1{margin-bottom:4px !important}
      .mb-2{margin-bottom:8px !important}
      .mb-3{margin-bottom:12px !important}
      .mt-1{margin-top:4px !important}
      .mt-2{margin-top:8px !important}
      .w-full{width:100% !important}
      .pl-3{padding-left:12px !important}
      .pt-1{padding-top:4px !important}
      .pt-2.5,.pt-2{padding-top:8px !important}

      .grid{display:flex !important;gap:10px !important;align-items:stretch !important;width:100% !important}
      .grid-cols-2 > *{flex:1 !important;min-width:0 !important}
      .grid-cols-1 > *{width:100% !important}

      .rank-table{width:100% !important;border-collapse:collapse !important;font-size:10.5px !important}
      .rank-table th{background:#dbeafe !important;border:1px solid #93c5fd !important;padding:2px 1.5px !important;text-align:center !important;font-weight:700 !important;color:#1e3a8a !important}
      .rank-table td{border:1px solid #cbd5e1 !important;padding:1.5px 1.5px !important;text-align:center !important}

      .sig-section{margin-top:14px !important;display:flex !important;justify-content:space-between !important;gap:8px !important}
      .sig-col{text-align:center !important;flex:1 !important}

      .g-A{color:#15803d !important;font-weight:800 !important}
      .g-B{color:#1d4ed8 !important;font-weight:800 !important}
      .g-C{color:#b45309 !important;font-weight:800 !important}
      .g-D{color:#c2410c !important;font-weight:800 !important}
      .g-E{color:#dc2626 !important;font-weight:800 !important}
      .g-F{color:#7f1d1d !important;font-weight:800 !important}
      .pass{color:#16a34a !important;font-weight:700 !important}
      .fail{color:#dc2626 !important;font-weight:700 !important}
      .no-print{display:none !important}
    </style></head><body>${previewEl.innerHTML}</body></html>`;
    printHTML(html);
  };

  return (
    <div className="p-3 space-y-3">
      {/* Report Category & Compact Dropdown Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 no-print shadow-2xs">
        {/* Left: Two Button Groups (ថ្នាក់ vs សាលា) + Dropdown (ទម្លាក់ចុះ) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Two Category Buttons */}
          <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 border border-slate-300">
            <button
              onClick={() => {
                setReportCategory("class");
                onCategoryChange?.("class");
              }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                reportCategory === "class"
                  ? "bg-blue-600 text-white shadow-xs font-black"
                  : "text-slate-700 hover:text-blue-700 hover:bg-slate-100"
              }`}
            >
              <span>🖨️</span>
              <span>របាយការណ៍ថ្នាក់</span>
            </button>
            <button
              onClick={() => {
                setReportCategory("school");
                onCategoryChange?.("school");
              }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                reportCategory === "school"
                  ? "bg-indigo-600 text-white shadow-xs font-black"
                  : "text-slate-700 hover:text-indigo-700 hover:bg-slate-100"
              }`}
            >
              <span>🏫</span>
              <span>របាយការណ៍សាលា</span>
            </button>
          </div>

          {/* Dropdown (ទម្លាក់ចុះ) for Report Selection */}
          {reportCategory === "class" ? (
            <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-xs text-blue-600 font-bold">📄</span>
              <select
                value={reportType}
                onChange={(e) => onReportTypeChange(e.target.value as ReportType)}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer pr-1"
                title="ជ្រើសរើសរបាយការណ៍ថ្នាក់"
              >
                <option value="monthly">📅 លទ្ធផលប្រចាំខែ (Monthly)</option>
                <option value="semester">📚 លទ្ធផលប្រចាំឆមាស (Semester Results)</option>
                <option value="semester_exam">📑 តារាងស្រង់ពិន្ទុប្រឡងឆមាស (Semester Exam)</option>
                <option value="master_table">📋 តារាងស្រង់ពិន្ទុឆមាស&ឆ្នាំ (Master Table)</option>
                <option value="annual">🏆 លទ្ធផលដំណាច់ឆ្នាំ (Annual Final)</option>
                <option value="attendance">✅ បញ្ជីវត្តមានសិស្ស (Attendance)</option>
                <option value="studentcard">📖 សៀវភៅតាមដានការសិក្សា (Track Card)</option>
                <option value="traineebook">📕 សៀវភៅសិក្ខាគារិក (Trainee Book)</option>
                <option value="candidate">📜 សលាកបត្រឯកត្តជន (Candidate Doc)</option>
                <option value="certificate">🎓 វិញ្ញាបនបត្រ QR (Certificate)</option>
                <option value="coregrade">🎯 និទ្ទេសគោល (Core Grades)</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-white border border-indigo-300 rounded-lg px-2 py-1 shadow-2xs">
              <span className="text-xs text-indigo-600 font-bold">🏢</span>
              <select
                value={curSchoolReportType}
                onChange={(e) => {
                  const val = e.target.value as SchoolReportType;
                  setCurSchoolReportType(val);
                  onSchoolReportTypeChange?.(val);
                }}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer pr-1"
                title="ជ្រើសរើសរបាយការណ៍សាលា"
              >
                <option value="school_annual_classes">៣. លទ្ធផលសិក្សាដំណាច់ឆ្នាំ (តាមបន្ទប់ថ្នាក់)</option>
                <option value="school_annual_grades">៣. លទ្ធផលសិក្សាដំណាច់ឆ្នាំ (តាមកម្រិតថ្នាក់ ១-៦)</option>
                <option value="school_pri_scores">តារាងសរុបពិន្ទុតាមមុខវិជ្ជា [PRI] (ថ្នាក់ទី១-៦)</option>
                <option value="school_stats">🏫 ស្ថិតិសិស្សតាមកម្រិតថ្នាក់ទូទាំងសាលា</option>
                <option value="school_performance">📊 តារាងប្រៀបធៀបលទ្ធផលសិក្សាតាមថ្នាក់</option>
                <option value="school_honor">🥇 តារាងកិត្តិយសសិស្សពូកែទូទាំងសាលា</option>
                <option value="school_attendance">📋 តារាងបូកសរុបអវត្តមានសាលា</option>
                <option value="school_profile">🏢 ព័ត៌មាននិងស្ថានភាពទូទៅសាលារៀន</option>
              </select>
            </div>
          )}
        </div>

        {/* Right side: Action Buttons & Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {reportCategory === "class" && reportType === "coregrade" && (
            <>
              <button
                onClick={onSaveCoreGrades}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs"
              >
                💾 រក្សាទុក
              </button>
              <button
                onClick={handleExportCoreGradesXLSX}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs"
              >
                📥 Excel
              </button>
              <button
                onClick={onOpenInvigilatorModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs"
              >
                🖋️ អនុរក្ស
              </button>
            </>
          )}

          {reportCategory === "class" && reportType === "annual" && (
            <div className="inline-flex items-center rounded-lg bg-slate-200/80 p-0.5 border border-slate-300">
              <button
                type="button"
                onClick={() => setAnnualSortMode("name")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                  annualSortMode === "name"
                    ? "bg-white text-blue-800 shadow-2xs font-black"
                    : "text-slate-700 hover:text-blue-700"
                }`}
                title="តម្រៀបតាមឈ្មោះសិស្ស"
              >
                <span>🔤</span>
                <span>តាមឈ្មោះ</span>
              </button>
              <button
                type="button"
                onClick={() => setAnnualSortMode("rank")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                  annualSortMode === "rank"
                    ? "bg-white text-blue-800 shadow-2xs font-black"
                    : "text-slate-700 hover:text-blue-700"
                }`}
                title="តម្រៀបតាមចំណាត់ថ្នាក់"
              >
                <span>🏆</span>
                <span>តាមចំណាត់ថ្នាក់</span>
              </button>
            </div>
          )}

          {reportCategory === "class" && (reportType === "candidate" || reportType === "certificate" || reportType === "studentcard" || reportType === "traineebook") && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white outline-none"
            >
              <option value="__all__">🏫 ពុម្ពទាំងថ្នាក់ (All Students)</option>
              {students.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  {idx + 1}. {s.lastName} {s.firstName}
                </option>
              ))}
            </select>
          )}

          {reportCategory === "class" && reportType === "annual" ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePrintAnnual("name")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-md shadow-blue-500/20 flex items-center gap-1"
                title="បោះពុម្ពតម្រៀបតាមឈ្មោះសិស្ស (1 ទំព័រ)"
              >
                <span>🖨️</span>
                <span>ព្រីនតាមឈ្មោះ (1ទំព័រ)</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintAnnual("rank")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center gap-1"
                title="បោះពុម្ពតម្រៀបតាមចំណាត់ថ្នាក់ (1 ទំព័រ)"
              >
                <span>🖨️</span>
                <span>ព្រីនតាមចំណាត់ថ្នាក់ (1ទំព័រ)</span>
              </button>
            </div>
          ) : reportCategory === "class" ? (
            <>
              <button
                onClick={handlePrintReport}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition shadow-md shadow-blue-500/20"
              >
                🖨️ ព្រីន PDF
              </button>

              <button
                onClick={() => {
                  const docElem = document.getElementById("reportDocContent");
                  const htmlContent = docElem
                    ? `<div style="font-family: 'Hanuman', 'Battambang', Arial, sans-serif; line-height: 1.5; color: #0f172a; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px;">${docElem.innerHTML}</div>`
                    : `<p>របាយការណ៍លទ្ធផលសិក្សា - ថ្នាក់ទី ${selClass}</p>`;
                  let reportName = `របាយការណ៍លទ្ធផលសិក្សា - ថ្នាក់ទី ${selClass}`;
                  if (reportType === "monthly") reportName = `លទ្ធផលសិក្សាប្រចាំខែ ${MONTHS[selMonth]} - ថ្នាក់ទី ${selClass}`;
                  else if (reportType === "semester") reportName = `លទ្ធផលសិក្សាប្រចាំឆមាស - ថ្នាក់ទី ${selClass}`;
                  else if (reportType === "studentCard") reportName = `សៀវភៅសិក្ខាគារិក - ថ្នាក់ទី ${selClass}`;

                  if (onOpenGmailModal) {
                    onOpenGmailModal({
                      subject: `${reportName} - ${schoolName}`,
                      htmlBody: htmlContent,
                    });
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition shadow-md shadow-red-500/20 flex items-center gap-1.5"
              >
                ✉️ ផ្ញើតាម Gmail
              </button>
            </>
          ) : null}
        </div>
      </div>

      {reportCategory === "school" ? (
        <SchoolReportsView
          schoolReportType={curSchoolReportType}
          selClass={selClass}
          students={students}
          scoresMap={scoresMap}
          attendanceMap={attendanceMap}
          teacher={teacher}
          selMonth={selMonth}
          semester={semester}
          onOpenGmailModal={onOpenGmailModal}
          toast={toast}
          allMonthsScores={allMonthsScores}
          examRecordsS1={examRecordsS1}
          examRecordsS2={examRecordsS2}
          honorPhotos={honorPhotos}
        />
      ) : reportType === "semester_exam" ? (
        <div className="space-y-4">
          <SemesterExamTable
            students={students}
            semesterId={semester === "s2" ? "s2" : "s1"}
            onSemesterChange={() => {}}
            examRecords={semester === "s2" ? examRecordsS2 : examRecordsS1}
            allMonthsScores={allMonthsScores}
            editMode={false}
            onUpdateExamScore={onUpdateExamScore || (() => {})}
            onUpdateExamDomain={onUpdateExamDomain || (() => {})}
            onUpdateExamRemark={onUpdateExamRemark || (() => {})}
            onAutoPopulateDomains={onAutoPopulateDomains || (() => {})}
            onImportExamScores={onImportExamScores}
            onOpenPhotoModal={onOpenPhotoModal || (() => {})}
            honorPhotos={honorPhotos}
            schoolName={schoolName}
            teacherName={tName}
            className={selClass}
            toast={toast}
          />
        </div>
      ) : reportType === "master_table" ? (
        <div className="space-y-4">
          <MasterSemesterAnnualTable
            students={students}
            allMonthsScores={allMonthsScores}
            examRecordsS1={examRecordsS1}
            examRecordsS2={examRecordsS2}
            annualRemarks={annualRemarks}
            editMode={false}
            onUpdateExamScore={onUpdateExamScore}
            onUpdateExamDomain={onUpdateExamDomain}
            onUpdateAnnualRemark={onUpdateAnnualRemark}
            onOpenPhotoModal={onOpenPhotoModal || (() => {})}
            honorPhotos={honorPhotos}
            schoolName={schoolName}
            teacherName={tName}
            className={selClass}
          />
        </div>
      ) : (
        <>
          {/* Student Filter Bar for Certificates & Individual Reports */}
      {(reportType === "certificate" || reportType === "candidate" || reportType === "studentcard" || reportType === "traineebook") && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-3 rounded-2xl shadow-lg no-print flex flex-wrap items-center justify-between gap-3 border border-blue-900/50">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <input
                type="text"
                placeholder="🔍 ស្វែងរកឈ្មោះសិស្ស..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/90 text-white placeholder-slate-400 border border-slate-700 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Gender Filter */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700">
              {[
                ["all", "ទាំងអស់"],
                ["ប្រុស", "👨 ប្រុស"],
                ["ស្រី", "👩 ស្រី"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setGenderFilter(val)}
                  className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition ${
                    genderFilter === val ? "bg-blue-600 text-white shadow-xs" : "text-slate-300 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Result Filter */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700">
              {[
                ["all", "លទ្ធផល"],
                ["pass", "✅ ជាប់"],
                ["fail", "❌ ធ្លាក់"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setResultFilter(val)}
                  className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition ${
                    resultFilter === val
                      ? val === "pass"
                        ? "bg-emerald-600 text-white"
                        : val === "fail"
                        ? "bg-rose-600 text-white"
                        : "bg-blue-600 text-white"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Grade Filter */}
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">🏆 គ្រប់និទ្ទេស (A-F)</option>
              <option value="A">និទ្ទេស A</option>
              <option value="B">និទ្ទេស B</option>
              <option value="C">និទ្ទេស C</option>
              <option value="D">និទ្ទេស D</option>
              <option value="E">និទ្ទេស E</option>
              <option value="F">និទ្ទេស F</option>
            </select>

            {/* Clear All Filters */}
            {(searchQuery || genderFilter !== "all" || resultFilter !== "all" || gradeFilter !== "all" || selectedStudentId !== "__all__") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setGenderFilter("all");
                  setResultFilter("all");
                  setGradeFilter("all");
                  setSelectedStudentId("__all__");
                }}
                className="text-amber-400 hover:text-amber-300 text-[11px] font-bold underline px-1"
              >
                🔄 កំណត់ឡើងវិញ
              </button>
            )}
          </div>

          {/* Student Count & Certificate Batch Action */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-900/80 border border-blue-500/30 px-3 py-1 rounded-xl text-xs font-black text-blue-200">
              🎓 សិស្សជ្រើសរើស ៖ <span className="text-amber-300 text-sm">{filteredStudents.length}</span> / {students.length} នាក់
            </div>

            {reportType === "certificate" && (
              <button
                onClick={handlePrintReport}
                disabled={filteredStudents.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs px-3.5 py-1.5 rounded-xl transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>📜</span> <span>ព្រីនវិញ្ញាបនបត្រ PDF ({filteredStudents.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Document Preview Container */}
      <div id="reportDocContent" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm font-sans text-xs">
        {/* Kingdom Motto Header (Centered) */}
        <div className="text-center mb-2" style={{ textAlign: "center", width: "100%", marginBottom: "8px" }}>
          <h2 className="text-sm font-black text-slate-900 leading-tight" style={{ textAlign: "center", fontSize: "14px", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
            ព្រះរាជាណាចក្រកម្ពុជា
            <br />
            ជាតិ សាសនា ព្រះមហាក្សត្រ
          </h2>
          <div className="text-[10px] text-amber-800 mt-0.5 font-normal" style={{ textAlign: "center", fontSize: "10px", color: "#92400e", marginTop: "2px" }}>꧁ ༺ ༻ ꧂</div>
        </div>

        {/* Administration Info (Left) & Invigilator Box (Right if coregrade) */}
        <div className="flex justify-between items-start gap-4 mb-2" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", width: "100%", marginBottom: "8px" }}>
          <div className="text-xs text-slate-900 leading-snug font-bold" style={{ fontSize: "12px", color: "#0f172a", lineHeight: 1.4, fontWeight: "bold" }}>
            <div>រដ្ឋបាលស្រុកភ្នំស្រុក</div>
            <div>ការិយាល័យអប់រំ យុវជន និងកីឡាស្រុក</div>
            <div>កម្រងស្ពានស្រែង</div>
            <div>{schoolName}</div>
          </div>

          {reportType === "coregrade" && (
            <div dangerouslySetInnerHTML={{ __html: buildInvigilatorBoxHTML(invigilatorData) }} />
          )}
        </div>

        <hr className="border-t-2 border-slate-900 mb-3" style={{ border: "none", borderTop: "2px solid #0f172a", marginBottom: "12px", width: "100%" }} />

        {/* Dynamic Titles */}
        {reportType === "monthly" && (
          <div className="text-center mb-3">
            <h3 className="text-base font-black text-slate-900">
              លទ្ធផលសិក្សាប្រចាំខែ {MONTHS[selMonth]}
            </h3>
            <p className="text-xs font-bold text-slate-800">ថ្នាក់ទី {selClass}</p>
          </div>
        )}

        {reportType === "semester" && (
          <div className="text-center mb-3">
            <h3 className="text-base font-black text-slate-900">
              លទ្ធផលសិក្សា {SEMESTERS.find((s) => s.id === semester)?.label}
            </h3>
            <p className="text-xs font-bold text-slate-800">ថ្នាក់ទី {selClass}</p>
          </div>
        )}

        {reportType === "annual" && (
          <div className="text-center mb-3">
            <h3 className="text-base font-black text-slate-900">
              ចំណាត់ថ្នាក់ដំណាច់ឆ្នាំ {annualSortMode === "rank" ? "(តម្រៀបតាមចំណាត់ថ្នាក់)" : "(តម្រៀបតាមឈ្មោះសិស្ស)"}
            </h3>
            <p className="text-xs font-bold text-slate-800">ថ្នាក់ទី {selClass} · ឆ្នាំសិក្សា ២០២៥-២០២៦</p>
          </div>
        )}

        {reportType === "coregrade" && (
          <div className="text-center mb-3">
            <h3 className="text-base font-black text-slate-900">
              លទ្ធផលតេស្ត (ABC) មុខវិជ្ជាភាសាខ្មែរ និងគណិតវិទ្យា
            </h3>
            <p className="text-xs font-bold text-slate-800">
              ថ្នាក់ទី {selClass} · {SEMESTERS.find((s) => s.id === semester)?.label} · ខែ
              {MONTHS[selMonth]}
            </p>
          </div>
        )}

        {/* Standard Academic Reports (Monthly, Semester, Annual, Attendance) */}
        {(reportType === "monthly" || reportType === "semester" || reportType === "annual" || reportType === "attendance") && (
          <div className="space-y-3">
            {reportType === "annual" ? (
              renderAnnualReportTable()
            ) : reportType === "semester" ? (
              renderSemesterReportTable()
            ) : (
              /* 2-Column Split Student Tables for Monthly / Attendance */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div>{renderRankTable(leftRanked, 0)}</div>
                <div>{rightRanked.length > 0 ? renderRankTable(rightRanked, halfIndex) : null}</div>
              </div>
            )}

            {/* Bottom Summary Statistics Section (Two Cards Side-by-Side as in sample image) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[10.5px] leading-relaxed mt-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
              {/* Left Box: Total Students & Grade Breakdown */}
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <div>
                  <div className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
                    <span>👥</span> <span>សិស្សទាំងអស់</span>
                  </div>
                  <div className="pl-1 text-slate-800">
                    -សរុប <strong className="font-bold text-slate-900">{stats.total}</strong>នាក់ ប្រុស <strong className="font-bold text-slate-900">{stats.male}</strong>នាក់ ({stats.malePct}%) ស្រី <strong className="font-bold text-slate-900">{stats.female}</strong>នាក់ ({stats.femalePct}%)
                  </div>
                </div>

                <div>
                  <div className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
                    <span>📊</span> <span>ចំណាត់ថ្នាក់ដោយនិទ្ទេស</span>
                  </div>
                  <div className="pl-1 space-y-0.5">
                    {(["A", "B", "C", "D", "E", "F"] as const).map((g) => {
                      const item = stats.grades[g];
                      return (
                        <div key={g} className="flex justify-between items-center text-slate-800">
                          <span>
                            -សិស្សនិទ្ទេស <strong className="font-extrabold" style={{ color: gradeOf(g === "A" ? 9.0 : g === "B" ? 8.0 : g === "C" ? 7.0 : g === "D" ? 6.0 : g === "E" ? 5.0 : 3.0).c }}>{g}</strong> សរុប <strong className="font-bold">{item.count}</strong>នាក់ ({item.pct}%)
                          </span>
                          <span className="text-slate-600 text-[10px]">
                            ស្រី <strong className="font-semibold">{item.female}</strong>នាក់ ({item.femalePct}%)
                          </span>
                        </div>
                      );
                    })}
                    {stats.dropoutCount > 0 && (
                      <div className="flex justify-between items-center text-slate-800 pt-1 border-t border-slate-200">
                        <span>
                          -សិស្ស <strong className="font-bold text-rose-700">បោះបង់ការសិក្សា</strong> សរុប <strong className="font-bold text-rose-700">{stats.dropoutCount}</strong>នាក់ ({stats.dropoutPct}%)
                        </span>
                        <span className="text-slate-600 text-[10px]">
                          ស្រី <strong className="font-semibold text-rose-700">{stats.dropoutFemale}</strong>នាក់
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Box: Pass/Fail Results & Percentages */}
              <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <div>
                  <div className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
                    <span>✅</span> <span>លទ្ធផលការប្រឡង</span>
                  </div>
                  <div className="pl-1 space-y-0.5 text-slate-800">
                    <div className="flex justify-between items-center">
                      <span>-ជាប់ <strong className="font-bold text-emerald-700">{stats.passCount}</strong>នាក់ ({stats.passPct}%)</span>
                      <span className="text-slate-600 text-[10px]">ស្រី <strong className="font-semibold text-emerald-700">{stats.passFemale}</strong>នាក់</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>-ធ្លាក់ <strong className="font-bold text-rose-700">{stats.failCount}</strong>នាក់ ({stats.failPct}%)</span>
                      <span className="text-slate-600 text-[10px]">ស្រី <strong className="font-semibold text-rose-700">{stats.failFemale}</strong>នាក់</span>
                    </div>
                    {stats.dropoutCount > 0 && (
                      <div className="flex justify-between items-center">
                        <span>-បោះបង់ <strong className="font-bold text-slate-700">{stats.dropoutCount}</strong>នាក់ ({stats.dropoutPct}%)</span>
                        <span className="text-slate-600 text-[10px]">ស្រី <strong className="font-semibold text-slate-700">{stats.dropoutFemale}</strong>នាក់</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <div className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
                    <span>📈</span> <span>អត្រាប្រឡង</span>
                  </div>
                  <div className="pl-1 space-y-0.5 text-slate-800">
                    <div className="flex justify-between items-center">
                      <span>-អត្រាជាប់</span>
                      <strong className="font-extrabold text-emerald-700">{stats.passPct}%</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>-អត្រាធ្លាក់</span>
                      <strong className="font-extrabold text-rose-700">{stats.failPct}%</strong>
                    </div>
                    {stats.dropoutCount > 0 && (
                      <div className="flex justify-between items-center">
                        <span>-អត្រាបោះបង់</span>
                        <strong className="font-extrabold text-slate-700">{stats.dropoutPct}%</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {reportType === "coregrade" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Khmer Table */}
              <div>
                <h4 className="font-extrabold text-blue-900 text-xs mb-1 text-center">
                  📖 ភាសាខ្មែរ (៤ មុខវិជ្ជា)
                </h4>
                <table className="w-full text-[11px] border-collapse border border-slate-300 text-center">
                  <thead>
                    <tr className="bg-blue-100 font-bold">
                      <th className="border border-slate-300 p-1">ល.រ</th>
                      <th className="border border-slate-300 p-1 text-left">ឈ្មោះ</th>
                      {KH_ORDER.map((k) => (
                        <th key={k} className="border border-slate-300 p-1 text-[9px]">
                          {k.replace("សមត្ថភាព", "")}
                        </th>
                      ))}
                      <th className="border border-slate-300 p-1">រួម</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const r = computeCoreGradeRow(s);
                      return (
                        <tr key={s.id} className="border-b border-slate-200">
                          <td className="p-1">{idx + 1}</td>
                          <td className="p-1 text-left font-bold">
                            {s.lastName} {s.firstName}
                          </td>
                          {r.khGrades.map((g, i) => (
                            <td key={i} className="p-1 font-bold">
                              {g || "—"}
                            </td>
                          ))}
                          <td className="p-1 font-black text-blue-900">{r.khCombined || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Math Table */}
              <div>
                <h4 className="font-extrabold text-blue-900 text-xs mb-1 text-center">
                  🔢 គណិតវិទ្យា (៥ មុខវិជ្ជា)
                </h4>
                <table className="w-full text-[11px] border-collapse border border-slate-300 text-center">
                  <thead>
                    <tr className="bg-blue-100 font-bold">
                      <th className="border border-slate-300 p-1">ល.រ</th>
                      <th className="border border-slate-300 p-1 text-left">ឈ្មោះ</th>
                      {MT_ORDER.map((m) => (
                        <th key={m} className="border border-slate-300 p-1 text-[9px]">
                          {m}
                        </th>
                      ))}
                      <th className="border border-slate-300 p-1">រួម</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const r = computeCoreGradeRow(s);
                      return (
                        <tr key={s.id} className="border-b border-slate-200">
                          <td className="p-1">{idx + 1}</td>
                          <td className="p-1 text-left font-bold">
                            {s.lastName} {s.firstName}
                          </td>
                          {r.mtGrades.map((g, i) => (
                            <td key={i} className="p-1 font-bold">
                              {g || "—"}
                            </td>
                          ))}
                          <td className="p-1 font-black text-blue-900">{r.mtCombined || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Summary Tables for Core Grade (ABC) */}
            {(() => {
              const coreStats = computeCoreGradeStats();
              const gradesList = ["A", "B", "C", "D", "E", "F"] as const;
              const gradeColors: Record<string, string> = {
                A: "#15803d",
                B: "#1d4ed8",
                C: "#b45309",
                D: "#c2410c",
                E: "#dc2626",
                F: "#7f1d1d",
              };

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[10.5px] mt-2 items-start" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "10px", marginTop: "10px" }}>
                  {/* Left Table: Grade Counts and Percentages (A-F) */}
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 text-center">
                      <thead>
                        <tr className="bg-blue-100/90 text-blue-950 font-bold">
                          <th rowSpan={2} className="border border-slate-300 p-1 text-left min-w-[65px]">
                            មុខវិជ្ជា
                          </th>
                          {gradesList.map((g) => (
                            <th key={g} colSpan={2} className="border border-slate-300 p-1" style={{ color: gradeColors[g] }}>
                              {g}
                            </th>
                          ))}
                        </tr>
                        <tr className="bg-blue-100/90 text-blue-950 font-bold text-[9.5px]">
                          {gradesList.map((g) => (
                            <React.Fragment key={g}>
                              <th className="border border-slate-300 p-0.5 w-5">ន.</th>
                              <th className="border border-slate-300 p-0.5 w-8">%</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Khmer Row */}
                        <tr className="bg-white border-b border-slate-200">
                          <td className="border border-slate-300 p-1 text-left font-bold text-slate-900 whitespace-nowrap">
                            📖 ភាសាខ្មែរ
                          </td>
                          {gradesList.map((g) => {
                            const count = coreStats.khCounts[g] || 0;
                            const pct = ((count / coreStats.total) * 100).toFixed(1) + "%";
                            return (
                              <React.Fragment key={g}>
                                <td className="border border-slate-300 p-1 font-bold" style={{ color: gradeColors[g] }}>
                                  {count}
                                </td>
                                <td className="border border-slate-300 p-1 text-slate-700 text-[10px]">
                                  {pct}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                        {/* Math Row */}
                        <tr className="bg-slate-50/50">
                          <td className="border border-slate-300 p-1 text-left font-bold text-slate-900 whitespace-nowrap">
                            🔢 គណិតវិទ្យា
                          </td>
                          {gradesList.map((g) => {
                            const count = coreStats.mtCounts[g] || 0;
                            const pct = ((count / coreStats.total) * 100).toFixed(1) + "%";
                            return (
                              <React.Fragment key={g}>
                                <td className="border border-slate-300 p-1 font-bold" style={{ color: gradeColors[g] }}>
                                  {count}
                                </td>
                                <td className="border border-slate-300 p-1 text-slate-700 text-[10px]">
                                  {pct}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Right Table: ABC vs DEF Rates */}
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 text-center">
                      <thead>
                        <tr className="bg-blue-100/90 text-blue-950 font-bold">
                          <th className="border border-slate-300 p-1 text-left">
                            មុខវិជ្ជា
                          </th>
                          <th className="border border-slate-300 p-1 text-emerald-800 w-16">
                            ABC
                          </th>
                          <th className="border border-slate-300 p-1 text-rose-800 w-16">
                            DEF
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white border-b border-slate-200">
                          <td className="border border-slate-300 p-1 text-left font-bold text-slate-800 text-[10px] leading-tight">
                            📖 ភាគរយសិស្សទទួលបាននិទ្ទេសមុខវិជ្ជាភាសាខ្មែរ
                          </td>
                          <td className="border border-slate-300 p-1 font-extrabold text-emerald-600 text-xs">
                            {coreStats.khAbcPct}
                          </td>
                          <td className="border border-slate-300 p-1 font-extrabold text-rose-600 text-xs">
                            {coreStats.khDefPct}
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="border border-slate-300 p-1 text-left font-bold text-slate-800 text-[10px] leading-tight">
                            🔢 ភាគរយសិស្សទទួលបាននិទ្ទេសមុខវិជ្ជាគណិតវិទ្យា
                          </td>
                          <td className="border border-slate-300 p-1 font-extrabold text-emerald-600 text-xs">
                            {coreStats.mtAbcPct}
                          </td>
                          <td className="border border-slate-300 p-1 font-extrabold text-rose-600 text-xs">
                            {coreStats.mtDefPct}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {reportType === "studentcard" && (
          <div className="space-y-6">
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                dangerouslySetInnerHTML={{
                  __html: buildStudentCardHTML(s, selClass, teacher, scoresMap, attendanceMap, selMonth, semester, students),
                }}
              />
            ))}
          </div>
        )}

        {reportType === "traineebook" && (
          <div className="space-y-6 overflow-x-auto">
            {filteredStudents.map((s, idx) => (
              <div
                key={s.id}
                dangerouslySetInnerHTML={{
                  __html: buildTraineeBookHTML(s, idx, selClass, teacher, scoresMap, attendanceMap, students),
                }}
              />
            ))}
          </div>
        )}

        {reportType === "candidate" && (
          <div className="space-y-6">
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                dangerouslySetInnerHTML={{
                  __html: buildCandidateDocHTML(s, selClass, teacher, students, scoresMap, honorPhotos),
                }}
              />
            ))}
          </div>
        )}

        {reportType === "certificate" && (
          <div className="space-y-6">
            {isGeneratingQr && (
              <div className="text-center py-4 text-blue-600 font-bold text-xs animate-pulse no-print">
                ⚡ កំពុងបង្កើត QR Code សម្រាប់ផ្ទៀងផ្ទាត់ព័ត៌មានសិស្ស...
              </div>
            )}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                🔍 ពុំមានទិន្នន័យសិស្សត្រូវតាមលក្ខខណ្ឌជ្រើសរើសឡើយ
              </div>
            ) : (
              filteredStudents.map((s) => (
                <div
                  key={s.id}
                  dangerouslySetInnerHTML={{
                    __html: buildCertificateHTML(s, selClass, teacher, students, scoresMap, certQrUrls[s.id]),
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* Signature Box */}
        {reportType !== "candidate" && reportType !== "certificate" && reportType !== "studentcard" && reportType !== "traineebook" && (
          <div dangerouslySetInnerHTML={{ __html: buildSignatureHtml(tName, selMonth, teacher?.village, reportType === "annual") }} />
        )}
      </div>
    </>
  )}
</div>
  );
};
