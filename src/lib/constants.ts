import { Student, ScoreMap } from "../types";

export const CLASSES = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "5A", "5B", "6A", "6B", "ML", "HL", "3ក"];

export const MONTHS = ["ធ្នូ", "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា"];

export const SEMESTERS = [
  { id: "s1", label: "ឆមាស១ (ធ្នូ-ឧសភា)", shortLabel: "ឆមាស១", months: [0, 1, 2, 3, 4, 5], color: "#2563eb" },
  { id: "s2", label: "ឆមាស២ (មិថុនា-វិច្ឆិកា)", shortLabel: "ឆមាស២", months: [6, 7, 8, 9, 10, 11], color: "#7c3aed" },
  { id: "annual", label: "ដំណាច់ឆ្នាំ", shortLabel: "ដំណាច់ឆ្នាំ", months: [], color: "#b45309" },
];

export const SUBJECTS = [
  "សមត្ថភាពស្ដាប់", "សមត្ថភាពសរសេរ", "សមត្ថភាពអាន", "សមត្ថភាពនិយាយ",
  "ចំនួន", "រង្វាស់រង្វាល់", "ធរណីមាត្រ", "ពីជគណិត", "ស្ថិតិ",
  "វិទ្យាសាស្ត្រ", "សិក្សាសង្គម", "គេហ-សិល្បៈ", "អប់រំកាយ-សុខភាព", "បំណិន", "ភាសាបរទេស"
];

// 11 Subjects for Semester Exam (ប្រឡងឆមាស) as per MoEYS Standard
export const EXAM_SUBJECTS = [
  "អំណាន",
  "ស្តាប់ និងនិយាយ",
  "សរសេរតាមអាន",
  "តែងសេចក្តី",
  "គណិតវិទ្យា",
  "វិទ្យាសាស្ត្រ",
  "សិក្សាសង្គម",
  "គេហវិទ្យា-អប់រំសិល្បៈ",
  "អប់រំកាយ-សុខភាព",
  "អប់រំបំណិនជីវិត",
  "ភាសាបរទេស"
];

export const EVAL_DOMAINS = [
  { key: "knowledge", label: "ចំណេះដឹង" },
  { key: "skills", label: "បំណិន-បំណេះធ្វើ" },
  { key: "values", label: "តម្លៃ-សីលធម៌" },
  { key: "participation", label: "សមត្ថភាព-ការចូលរួម" },
] as const;

export const INNER_TABS = [
  { id: "info", icon: "👤", label: "សិស្ស" },
  { id: "scores", icon: "📝", label: "ពិន្ទុប្រចាំខែ" },
  { id: "semester_exam", icon: "📑", label: "ប្រឡងឆមាស" },
  { id: "master_table", icon: "📋", label: "តារាងស្រង់ឆមាស&ឆ្នាំ" },
  { id: "attendance", icon: "✅", label: "អវត្តមាន" },
  { id: "detail", icon: "📊", label: "លម្អិត" },
  { id: "report", icon: "🖨️", label: "របាយការណ៍ថ្នាក់" },
  { id: "school_report", icon: "🏫", label: "របាយការណ៍សាលា" },
  { id: "honor", icon: "🏆", label: "កិត្តិយស" },
  { id: "gradeanalysis", icon: "🎯", label: "និទ្ទេស" },
];

export const KH_ORDER = ["សមត្ថភាពស្ដាប់", "សមត្ថភាពអាន", "សមត្ថភាពនិយាយ", "សមត្ថភាពសរសេរ"];
export const MT_ORDER = ["ចំនួន", "រង្វាស់រង្វាល់", "ពីជគណិត", "ធរណីមាត្រ", "ស្ថិតិ"];

export const BLANK_STUDENT: Omit<Student, "id"> = {
  lastName: "",
  firstName: "",
  gender: "ប្រុស",
  dob: "",
  age: "",
  fatherName: "",
  fatherJob: "",
  motherName: "",
  motherJob: "",
  village: "",
  commune: "",
  district: "",
  province: "",
  phone: "",
};

// Month lookup map for converting text months (Sep, Oct, etc.) to 2-digit numbers
const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  january: "01", february: "02", march: "03", april: "04",
  june: "06", july: "07", august: "08", september: "09",
  october: "10", november: "11", december: "12",
  មករា: "01", កុម្ភៈ: "02", មីនា: "03", មេសា: "04", ឧសភា: "05", មិថុនា: "06",
  កក្កដា: "07", សីហា: "08", កញ្ញា: "09", តុលា: "10", វិច្ឆិកា: "11", ធ្នូ: "12",
};

// Normalize Date String to YYYY-MM-DD for standard inputs
export function normalizeDateInput(dobStr?: string | number): string {
  if (!dobStr) return "";
  if (typeof dobStr === "number" || (/^\d{5}$/.test(String(dobStr).trim()) && !isNaN(Number(dobStr)))) {
    const num = Number(dobStr);
    if (num > 1000 && num < 100000) {
      const date = new Date((num - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
        const d = String(date.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }
  }

  const trimmed = String(dobStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parts = trimmed.split(/[\/\-\.\s]+/);
  if (parts.length === 3) {
    const [p1, p2, p3] = parts;
    const p1Month = MONTH_MAP[p1.toLowerCase()];
    const p2Month = MONTH_MAP[p2.toLowerCase()];

    if (p2Month) {
      const d = p1.padStart(2, "0");
      const m = p2Month;
      const y = p3.length === 2 ? `20${p3}` : p3;
      return `${y}-${m}-${d}`;
    } else if (p1Month) {
      const m = p1Month;
      const d = p2.padStart(2, "0");
      const y = p3.length === 2 ? `20${p3}` : p3;
      return `${y}-${m}-${d}`;
    } else if (p1.length === 4) {
      // YYYY/MM/DD
      const y = p1;
      const m = p2.padStart(2, "0");
      const d = p3.padStart(2, "0");
      return `${y}-${m}-${d}`;
    } else {
      // D/M/YYYY or DD/MM/YYYY
      const d = p1.padStart(2, "0");
      const m = p2.padStart(2, "0");
      const y = p3.length === 2 ? `20${p3}` : p3;
      return `${y}-${m}-${d}`;
    }
  }
  return trimmed;
}

// Auto Age Calculation
export function calcAge(dob?: string): string {
  if (!dob) return "";
  const normalized = normalizeDateInput(dob);
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) {
    age--;
  }
  return age > 0 ? String(age) : "";
}

export const SAMPLE_STUDENTS: Omit<Student, "id">[] = [
  {
    lastName: "កា",
    firstName: "បូប្ផា",
    gender: "ស្រី",
    dob: "2015-09-01",
    age: "11",
    fatherName: "អ៊ុច កុយ",
    fatherJob: "គ្រូពេទ្យ",
    motherName: "ស្រិប ឡាំ",
    motherJob: "កសិករ",
    village: "ភូមិរោគ",
    commune: "ឃុំស្ពានស្រែង",
    district: "ស្រុកភ្នំស្រុក",
    province: "ខេត្តបន្ទាយមានជ័យ",
    phone: "",
  },
];

// Khmer Numbers & Dates
export function toKhNum(n: number | string): string {
  const digits = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
  return String(n).replace(/\d/g, (c) => digits[+c]);
}

export const KH_MONTHS_SOLAR = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
export const KH_WEEKDAYS = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];
export const KH_ANIMALS = ["ជូត", "ឆ្លូវ", "ខាល", "ថោះ", "រោង", "ម្សាញ់", "មមី", "មមែ", "វក", "រកា", "ច", "កុរ"];
export const KH_SAK = ["ឯក", "ទោ", "ត្រី", "ចត្វា", "បញ្ចស័ក", "ឆ", "សប្ត", "អដ្ឋ", "នព", "សំរឹទ្ធ"];

export function moonPhase(date: Date): number {
  const r = new Date("2000-01-06T18:14:00Z");
  const syn = 29.53059;
  const diff = (date.getTime() - r.getTime()) / 864e5 + 7 / 24;
  return ((diff % syn) + syn) % syn;
}

export function khLunarMonth(nm: Date): string {
  const m = nm.getMonth(), d = nm.getDate();
  const ranges: [number, number, number, number, string][] = [
    [1, 6, 2, 17, "ផល្គុន"], [2, 18, 3, 16, "ចេត្រ"], [3, 17, 4, 15, "វិសាខ"],
    [4, 16, 5, 14, "ជេស្ឋ"], [5, 15, 6, 13, "បឋមាសាឍ"], [6, 14, 7, 12, "ស្រាពណ៍"],
    [7, 13, 8, 10, "ភទ្របទ"], [8, 11, 9, 9, "អស្សុជ"], [9, 10, 10, 8, "កក្តិក"],
    [10, 9, 11, 7, "មិគសិរ"], [11, 8, 0, 6, "បុស្ស"]
  ];
  for (const [sm, sd, em, ed, name] of ranges) {
    if (sm > em) {
      if (m === sm && d >= sd) return name;
      if (m === em && d <= ed) return name;
    } else {
      if (m === sm && d >= sd && (m !== em || d <= ed)) return name;
      if (m > sm && m < em) return name;
      if (m === em && d <= ed) return name;
    }
  }
  return "មាឃ";
}

export function khAnimal(date: Date): string {
  const y = date.getFullYear(), mo = date.getMonth(), dy = date.getDate();
  const adj = mo < 3 || (mo === 3 && dy < 14) ? y - 1 : y;
  return KH_ANIMALS[(((adj - 2025 + 5) % 12) + 12) % 12];
}

export function khSak(date: Date): string {
  return KH_SAK[(date.getFullYear() + 544 + 8) % 10];
}

export function fmtKhDate(date: Date) {
  const ph = moonPhase(date);
  const raw = Math.floor(ph);
  const dayType = raw < 15 ? "កើត" : "រោច";
  const dayNum = raw < 15 ? raw + 1 : raw - 14;
  const nm = new Date(date.getTime() - ph * 864e5);
  const lunar = `ថ្ងៃ${KH_WEEKDAYS[date.getDay()]} ${toKhNum(dayNum)}${dayType} ខែ${khLunarMonth(nm)} ឆ្នាំ${khAnimal(date)} ${khSak(date)}ស័ក ព.ស ${toKhNum(date.getFullYear() + 544)}`;
  const solar = `ថ្ងៃទី${toKhNum(date.getDate())} ខែ${KH_MONTHS_SOLAR[date.getMonth()]} ឆ្នាំ${toKhNum(date.getFullYear())}`;
  return { lunar, solar };
}

export function addWD(date: Date, n: number): Date {
  const d = new Date(date);
  let c = 0;
  while (c < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) c++;
  }
  return d;
}

export function getThreeWorkingDates(selMonth: number) {
  const MONTH_MAP = [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const calMonth = MONTH_MAP[selMonth];
  const today = new Date();
  let year = today.getFullYear();
  if (selMonth === 0) {
    year = today.getMonth() >= 1 ? year - 1 : year;
  }
  let d0 = new Date(year, calMonth, 23);
  while (d0.getDay() === 0 || d0.getDay() === 6) {
    d0.setDate(d0.getDate() + 1);
  }
  const d1 = addWD(d0, 1);
  const d2 = addWD(d0, 2);
  return { d0: fmtKhDate(d0), d1: fmtKhDate(d1), d2: fmtKhDate(d2) };
}

// Grading Helpers (Standard: A >= 9.0, B >= 8.0, C >= 7.0, D >= 6.0, E >= 5.0, F < 5.0)
export function gradeOf(avg: number | null | undefined) {
  if (avg === null || avg === undefined || isNaN(Number(avg))) {
    return { l: "—", c: "#64748b" };
  }
  const val = Number(avg);
  if (val <= 0) return { l: "—", c: "#64748b" };
  if (val >= 9.0) return { l: "A", c: "#15803d" };
  if (val >= 8.0) return { l: "B", c: "#1d4ed8" };
  if (val >= 7.0) return { l: "C", c: "#b45309" };
  if (val >= 6.0) return { l: "D", c: "#c2410c" };
  if (val >= 5.0) return { l: "E", c: "#dc2626" };
  return { l: "F", c: "#7f1d1d" };
}

export function resultOf(avg: number) {
  return Number(avg) >= 5 ? "ជាប់" : "ធ្លាក់";
}

export function truncate2(n: number | string | null | undefined): number {
  if (n === null || n === undefined || n === "") return 0;
  const num = Number(n);
  if (isNaN(num)) return 0;
  return Math.floor((num + 1e-9) * 100) / 100;
}

/**
 * Rounds subject scores to standard quarter-points (0.00, 0.25, 0.50, 0.75)
 * E.g.: 7.95 -> 8.00; 5.39 -> 5.50 (or closest quarter step)
 */
export function roundQuarter(n: number | string | null | undefined): number {
  if (n === null || n === undefined || n === "") return 0;
  const num = Number(n);
  if (isNaN(num)) return 0;
  return Math.round((num + 1e-9) * 4) / 4;
}

export function fmtAvg(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "0.00";
  const num = Number(n);
  if (isNaN(num)) return "0.00";
  const v = truncate2(num);
  return v.toFixed(2);
}

export function fmtTotal(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "0";
  const num = Number(n);
  if (isNaN(num)) return "0";
  const rounded = Math.round((num + 1e-9) * 100) / 100;
  if (rounded % 1 === 0) {
    return String(rounded);
  }
  return rounded.toFixed(2);
}

export function fmtScore(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  const rounded = Math.round((num + 1e-9) * 100) / 100;
  if (rounded % 1 === 0) {
    return String(rounded);
  }
  return rounded.toFixed(2);
}

export function getClassEvalSubjectCount(stuList: Student[], scoresMap: Record<string, ScoreMap>): number {
  if (!stuList.length) return SUBJECTS.length;
  const activeSubjs = SUBJECTS.filter(subj => stuList.some(s => {
    const v = scoresMap[s.id]?.[subj];
    return v !== undefined && v !== "" && v !== null && !isNaN(Number(v));
  }));
  return activeSubjs.length > 0 ? activeSubjs.length : SUBJECTS.length;
}

export function getTotal(sid: string, scoresMap: Record<string, ScoreMap>): number {
  let total = 0;
  SUBJECTS.forEach(s => {
    const v = scoresMap[sid]?.[s];
    if (v !== undefined && v !== "" && v !== null && !isNaN(Number(v))) {
      total += Number(v);
    }
  });
  return Math.round((total + 1e-9) * 100) / 100;
}

export function getAvg(sid: string, stuList: Student[], scoresMap: Record<string, ScoreMap>): number {
  const tot = getTotal(sid, scoresMap);
  if (tot === 0) {
    const hasAnyScore = SUBJECTS.some(s => {
      const v = scoresMap[sid]?.[s];
      return v !== undefined && v !== "" && v !== null && !isNaN(Number(v));
    });
    if (!hasAnyScore) return 0;
  }
  const evalCount = getClassEvalSubjectCount(stuList, scoresMap);
  return truncate2(tot / evalCount);
}

export function buildRankedList(stuList: Student[], scoresMap: Record<string, ScoreMap>): Student[] {
  const sorted = [...stuList].sort((a, b) => {
    const totB = getTotal(b.id, scoresMap);
    const totA = getTotal(a.id, scoresMap);
    if (totB !== totA) return totB - totA;
    const avgB = Number(getAvg(b.id, stuList, scoresMap));
    const avgA = Number(getAvg(a.id, stuList, scoresMap));
    if (avgB !== avgA) return avgB - avgA;
    return (a.lastName || "").localeCompare(b.lastName || "", "km");
  });
  
  const result: Student[] = [];
  sorted.forEach((s, i) => {
    if (i > 0 && 
        getTotal(s.id, scoresMap) === getTotal(sorted[i - 1].id, scoresMap) && 
        getAvg(s.id, stuList, scoresMap) === getAvg(sorted[i - 1].id, stuList, scoresMap)) {
      result.push({ ...s, _rank: result[i - 1]._rank });
    } else {
      result.push({ ...s, _rank: i + 1 });
    }
  });
  return result;
}

export function getRank(sid: string, stuList: Student[], scoresMap: Record<string, ScoreMap>): number | string {
  const ranked = buildRankedList(stuList, scoresMap);
  const found = ranked.find(r => r.id === sid);
  return found && found._rank !== undefined ? found._rank : "—";
}

export interface ReportStats {
  total: number;
  male: number;
  female: number;
  malePct: number;
  femalePct: number;
  grades: Record<string, { count: number; female: number; pct: number; femalePct: number }>;
  passCount: number;
  passFemale: number;
  passPct: number;
  failCount: number;
  failFemale: number;
  failPct: number;
  dropoutCount: number;
  dropoutFemale: number;
  dropoutPct: number;
}

export function computeReportStats(
  students: Student[],
  scoresMap: Record<string, ScoreMap>
): ReportStats {
  const total = students.length;
  if (total === 0) {
    const emptyGrade = { count: 0, female: 0, pct: 0, femalePct: 0 };
    return {
      total: 0, male: 0, female: 0, malePct: 0, femalePct: 0,
      grades: { A: emptyGrade, B: emptyGrade, C: emptyGrade, D: emptyGrade, E: emptyGrade, F: emptyGrade },
      passCount: 0, passFemale: 0, passPct: 0,
      failCount: 0, failFemale: 0, failPct: 0,
      dropoutCount: 0, dropoutFemale: 0, dropoutPct: 0,
    };
  }

  const female = students.filter((s) => s.gender === "ស្រី").length;
  const male = total - female;
  const malePct = Math.round((male / total) * 100);
  const femalePct = Math.round((female / total) * 100);

  const gradeCounts: Record<string, { count: number; female: number }> = {
    A: { count: 0, female: 0 },
    B: { count: 0, female: 0 },
    C: { count: 0, female: 0 },
    D: { count: 0, female: 0 },
    E: { count: 0, female: 0 },
    F: { count: 0, female: 0 },
  };

  let passCount = 0;
  let passFemale = 0;
  let failCount = 0;
  let failFemale = 0;
  let dropoutCount = 0;
  let dropoutFemale = 0;

  students.forEach((s) => {
    const avg = getAvg(s.id, students, scoresMap);
    const hasScores = Object.values(scoresMap[s.id] || {}).some(
      (v) => v !== undefined && v !== "" && v !== null && !isNaN(Number(v))
    );

    if (avg === null || isNaN(avg) || avg <= 0 || !hasScores) {
      dropoutCount++;
      if (s.gender === "ស្រី") dropoutFemale++;
      return;
    }

    const g = gradeOf(avg).l;
    if (gradeCounts[g]) {
      gradeCounts[g].count++;
      if (s.gender === "ស្រី") {
        gradeCounts[g].female++;
      }
    }
    if (avg >= 5.0) {
      passCount++;
      if (s.gender === "ស្រី") passFemale++;
    } else {
      failCount++;
      if (s.gender === "ស្រី") failFemale++;
    }
  });

  const passPct = Math.round((passCount / total) * 100);
  const failPct = Math.round((failCount / total) * 100);
  const dropoutPct = Math.round((dropoutCount / total) * 100);

  const gradesFormatted: Record<string, { count: number; female: number; pct: number; femalePct: number }> = {};
  ["A", "B", "C", "D", "E", "F"].forEach((letter) => {
    const cnt = gradeCounts[letter].count;
    const fem = gradeCounts[letter].female;
    const pct = Math.round((cnt / total) * 100);
    const femalePct = cnt > 0 ? Math.round((fem / cnt) * 100) : 0;
    gradesFormatted[letter] = { count: cnt, female: fem, pct, femalePct };
  });

  return {
    total,
    male,
    female,
    malePct,
    femalePct,
    grades: gradesFormatted,
    passCount,
    passFemale,
    passPct,
    failCount,
    failFemale,
    failPct,
    dropoutCount,
    dropoutFemale,
    dropoutPct,
  };
}

// ================= SEMESTER EXAM & MASTER TABLE HELPERS =================

export function getSemesterExamTotal(sid: string, examScores: Record<string, ScoreMap>): number {
  let total = 0;
  EXAM_SUBJECTS.forEach((s) => {
    const v = examScores[sid]?.[s];
    if (v !== undefined && v !== "" && v !== null && !isNaN(Number(v))) {
      total += Number(v);
    }
  });
  return truncate2(total);
}

export function getSemesterExamAvg(sid: string, examScores: Record<string, ScoreMap>): number | null {
  const tot = getSemesterExamTotal(sid, examScores);
  const activeCount = EXAM_SUBJECTS.filter((s) => {
    const v = examScores[sid]?.[s];
    return v !== undefined && v !== "" && v !== null && !isNaN(Number(v));
  }).length;

  if (activeCount === 0) return null;
  return truncate2(tot / activeCount);
}

export function computeStudentSemesterMonthlyAvg(
  sid: string,
  semId: string,
  allMonthsScores: Record<string, Record<string, ScoreMap>>
): number | null {
  const semConfig = SEMESTERS.find((s) => s.id === semId);
  if (!semConfig) return null;

  const mAvgs: number[] = [];
  semConfig.months.forEach((mIdx) => {
    const key = `${semId}_${mIdx}`;
    const monthData = allMonthsScores[key] || {};
    const stuScores = monthData[sid] || {};
    const keys = Object.keys(stuScores).filter(
      (k) => stuScores[k] !== "" && stuScores[k] !== null && !isNaN(Number(stuScores[k]))
    );
    if (keys.length > 0) {
      const sum = keys.reduce((acc, k) => acc + Number(stuScores[k]), 0);
      mAvgs.push(sum / keys.length);
    }
  });

  if (mAvgs.length === 0) return null;
  const avg = mAvgs.reduce((a, b) => a + b, 0) / mAvgs.length;
  return truncate2(avg);
}

export function computeStudentSemesterFinalAvg(
  sid: string,
  semId: string,
  allMonthsScores: Record<string, Record<string, ScoreMap>>,
  examScores: Record<string, ScoreMap>
): number | null {
  const mAvg = computeStudentSemesterMonthlyAvg(sid, semId, allMonthsScores);
  const eAvg = getSemesterExamAvg(sid, examScores);

  if (mAvg !== null && eAvg !== null) {
    return truncate2((mAvg + eAvg) / 2);
  } else if (eAvg !== null) {
    return eAvg;
  } else if (mAvg !== null) {
    return mAvg;
  }
  return null;
}

export function computeStudentAnnualAvg(
  sid: string,
  allMonthsScores: Record<string, Record<string, ScoreMap>>,
  examScoresS1: Record<string, ScoreMap>,
  examScoresS2: Record<string, ScoreMap>
): number | null {
  const s1Avg = computeStudentSemesterFinalAvg(sid, "s1", allMonthsScores, examScoresS1);
  const s2Avg = computeStudentSemesterFinalAvg(sid, "s2", allMonthsScores, examScoresS2);

  if (s1Avg !== null && s2Avg !== null && s1Avg > 0 && s2Avg > 0) {
    return truncate2((s1Avg + s2Avg) / 2);
  }
  return null;
}

export function deriveDomainGrade(avg: number | null): string {
  if (avg === null || isNaN(avg)) return "—";
  if (avg >= 9.0) return "ល្អប្រសើរ (A)";
  if (avg >= 8.0) return "ល្អណាស់ (B)";
  if (avg >= 7.0) return "ល្អ (C)";
  if (avg >= 6.0) return "ល្អបង្គួរ (D)";
  if (avg >= 5.0) return "មធ្យម (E)";
  return "ខ្សោយ (F)";
}

export function deriveDomainLetter(avg: number | null): string {
  if (avg === null || isNaN(avg)) return "—";
  if (avg >= 9.0) return "A";
  if (avg >= 8.0) return "B";
  if (avg >= 7.0) return "C";
  if (avg >= 6.0) return "D";
  if (avg >= 5.0) return "E";
  return "F";
}

