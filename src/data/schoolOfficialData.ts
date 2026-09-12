export interface AnnualClassStat {
  cls: string;
  total: number;
  female: number;
  examTotal: number;
  examFemale: number;
  passAvgTotal: number;
  passAvgFemale: number;
  retestTotal: number;
  retestFemale: number;
  passFinalTotal: number;
  passFinalFemale: number;
  repeatTotal: number;
  repeatFemale: number;
  dropTotal: number;
  dropFemale: number;
  avg?: number | string;
  grade?: string;
}

export const BASELINE_ANNUAL_CLASSES: AnnualClassStat[] = [
  { cls: "1A", total: 31, female: 15, examTotal: 31, examFemale: 15, passAvgTotal: 31, passAvgFemale: 15, retestTotal: 0, retestFemale: 0, passFinalTotal: 31, passFinalFemale: 15, repeatTotal: 0, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "7.20", grade: "C" },
  { cls: "1B", total: 0, female: 0, examTotal: 0, examFemale: 0, passAvgTotal: 0, passAvgFemale: 0, retestTotal: 0, retestFemale: 0, passFinalTotal: 0, passFinalFemale: 0, repeatTotal: 0, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "—", grade: "—" },
  { cls: "2A", total: 22, female: 12, examTotal: 22, examFemale: 12, passAvgTotal: 22, passAvgFemale: 12, retestTotal: 0, retestFemale: 0, passFinalTotal: 22, passFinalFemale: 12, repeatTotal: 0, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "7.10", grade: "C" },
  { cls: "2B", total: 22, female: 10, examTotal: 22, examFemale: 10, passAvgTotal: 22, passAvgFemale: 10, retestTotal: 0, retestFemale: 0, passFinalTotal: 22, passFinalFemale: 10, repeatTotal: 0, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "7.05", grade: "C" },
  { cls: "3A", total: 25, female: 14, examTotal: 25, examFemale: 14, passAvgTotal: 14, passAvgFemale: 7, retestTotal: 0, retestFemale: 0, passFinalTotal: 14, passFinalFemale: 7, repeatTotal: 11, repeatFemale: 7, dropTotal: 0, dropFemale: 0, avg: "6.80", grade: "D" },
  { cls: "3B", total: 20, female: 10, examTotal: 20, examFemale: 10, passAvgTotal: 20, passAvgFemale: 10, retestTotal: 0, retestFemale: 0, passFinalTotal: 20, passFinalFemale: 10, repeatTotal: 0, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "7.15", grade: "C" },
  { cls: "4A", total: 25, female: 12, examTotal: 25, examFemale: 12, passAvgTotal: 21, passAvgFemale: 10, retestTotal: 0, retestFemale: 0, passFinalTotal: 21, passFinalFemale: 10, repeatTotal: 4, repeatFemale: 2, dropTotal: 0, dropFemale: 0, avg: "6.95", grade: "D" },
  { cls: "4B", total: 24, female: 11, examTotal: 24, examFemale: 11, passAvgTotal: 24, passAvgFemale: 11, retestTotal: 0, retestFemale: 0, passFinalTotal: 24, passFinalFemale: 11, repeatTotal: 0, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "7.30", grade: "C" },
  { cls: "5A", total: 25, female: 12, examTotal: 25, examFemale: 12, passAvgTotal: 23, passAvgFemale: 12, retestTotal: 0, retestFemale: 0, passFinalTotal: 23, passFinalFemale: 12, repeatTotal: 2, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "7.40", grade: "C" },
  { cls: "5B", total: 25, female: 11, examTotal: 25, examFemale: 11, passAvgTotal: 23, passAvgFemale: 10, retestTotal: 0, retestFemale: 0, passFinalTotal: 23, passFinalFemale: 10, repeatTotal: 2, repeatFemale: 1, dropTotal: 0, dropFemale: 0, avg: "7.25", grade: "C" },
  { cls: "6A", total: 35, female: 17, examTotal: 35, examFemale: 17, passAvgTotal: 34, passAvgFemale: 17, retestTotal: 0, retestFemale: 0, passFinalTotal: 34, passFinalFemale: 17, repeatTotal: 1, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "7.60", grade: "C" },
  { cls: "6B", total: 0, female: 0, examTotal: 0, examFemale: 0, passAvgTotal: 0, passAvgFemale: 0, retestTotal: 0, retestFemale: 0, passFinalTotal: 0, passFinalFemale: 0, repeatTotal: 0, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "—", grade: "—" },
  { cls: "ML", total: 0, female: 0, examTotal: 0, examFemale: 0, passAvgTotal: 0, passAvgFemale: 0, retestTotal: 0, retestFemale: 0, passFinalTotal: 0, passFinalFemale: 0, repeatTotal: 0, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "—", grade: "—" },
  { cls: "HL", total: 0, female: 0, examTotal: 0, examFemale: 0, passAvgTotal: 0, passAvgFemale: 0, retestTotal: 0, retestFemale: 0, passFinalTotal: 0, passFinalFemale: 0, repeatTotal: 0, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "—", grade: "—" },
  { cls: "3ក", total: 0, female: 0, examTotal: 0, examFemale: 0, passAvgTotal: 0, passAvgFemale: 0, retestTotal: 0, retestFemale: 0, passFinalTotal: 0, passFinalFemale: 0, repeatTotal: 0, repeatFemale: 0, dropTotal: 0, dropFemale: 0, avg: "—", grade: "—" },
];

export interface PriSubjectRow {
  subject: string;
  gender: "ស្រី" | "ប្រុស";
  scores: number[]; // 0..10
  total: number;
  pass: number;
}

export interface PriGradeBlock {
  gradeNum: number;
  subjects: PriSubjectRow[];
}

export const BASELINE_PRI_DATA: PriGradeBlock[] = [
  {
    gradeNum: 1,
    subjects: [
      { subject: "ភាសាខ្មែរ", gender: "ស្រី", scores: [0, 0, 0, 0, 0, 0, 4, 8, 2, 1, 0], total: 15, pass: 15 },
      { subject: "ភាសាខ្មែរ", gender: "ប្រុស", scores: [0, 0, 0, 0, 0, 5, 2, 5, 3, 1, 0], total: 16, pass: 16 },
      { subject: "គណិតវិទ្យា", gender: "ស្រី", scores: [0, 0, 0, 0, 0, 5, 6, 3, 0, 1, 0], total: 15, pass: 15 },
      { subject: "គណិតវិទ្យា", gender: "ប្រុស", scores: [0, 0, 0, 0, 2, 5, 2, 4, 3, 0, 0], total: 16, pass: 16 },
      { subject: "វិទ្យាសាស្ត្រ + សិក្សាសង្គម", gender: "ស្រី", scores: [0, 0, 0, 0, 1, 4, 3, 5, 2, 0, 0], total: 15, pass: 15 },
      { subject: "វិទ្យាសាស្ត្រ + សិក្សាសង្គម", gender: "ប្រុស", scores: [0, 0, 0, 0, 1, 5, 4, 3, 3, 0, 0], total: 16, pass: 16 },
    ],
  },
  {
    gradeNum: 2,
    subjects: [
      { subject: "ភាសាខ្មែរ", gender: "ស្រី", scores: [0, 0, 0, 0, 0, 4, 7, 5, 5, 0, 0], total: 21, pass: 21 },
      { subject: "ភាសាខ្មែរ", gender: "ប្រុស", scores: [0, 0, 0, 0, 0, 11, 9, 1, 0, 0, 0], total: 21, pass: 21 },
      { subject: "គណិតវិទ្យា", gender: "ស្រី", scores: [0, 0, 0, 0, 0, 2, 6, 4, 7, 2, 0], total: 21, pass: 21 },
      { subject: "គណិតវិទ្យា", gender: "ប្រុស", scores: [0, 0, 0, 0, 1, 5, 10, 3, 1, 1, 0], total: 21, pass: 20 },
      { subject: "វិទ្យាសាស្ត្រ + សិក្សាសង្គម", gender: "ស្រី", scores: [0, 0, 0, 3, 0, 5, 10, 12, 12, 0, 0], total: 42, pass: 39 },
      { subject: "វិទ្យាសាស្ត្រ + សិក្សាសង្គម", gender: "ប្រុស", scores: [0, 0, 1, 8, 7, 6, 7, 8, 5, 0, 0], total: 42, pass: 26 },
    ],
  },
  {
    gradeNum: 3,
    subjects: [
      { subject: "ភាសាខ្មែរ", gender: "ស្រី", scores: [0, 0, 0, 0, 0, 5, 4, 9, 4, 0, 0], total: 22, pass: 22 },
      { subject: "ភាសាខ្មែរ", gender: "ប្រុស", scores: [0, 0, 0, 0, 0, 8, 4, 2, 2, 3, 0], total: 19, pass: 19 },
      { subject: "គណិតវិទ្យា", gender: "ស្រី", scores: [0, 0, 0, 0, 3, 5, 5, 3, 5, 1, 0], total: 22, pass: 22 },
      { subject: "គណិតវិទ្យា", gender: "ប្រុស", scores: [0, 0, 0, 0, 3, 4, 4, 3, 5, 0, 0], total: 19, pass: 19 },
      { subject: "វិទ្យាសាស្ត្រ + សិក្សាសង្គម", gender: "ស្រី", scores: [0, 0, 1, 0, 8, 7, 10, 4, 2, 12, 0], total: 44, pass: 43 },
      { subject: "វិទ្យាសាស្ត្រ + សិក្សាសង្គម", gender: "ប្រុស", scores: [0, 0, 0, 0, 9, 4, 6, 9, 6, 4, 0], total: 38, pass: 38 },
    ],
  },
  {
    gradeNum: 4,
    subjects: [
      { subject: "ភាសាខ្មែរ", gender: "ស្រី", scores: [0, 0, 0, 0, 1, 2, 1, 7, 10, 2, 0], total: 23, pass: 22 },
      { subject: "ភាសាខ្មែរ", gender: "ប្រុស", scores: [0, 0, 0, 0, 0, 1, 9, 9, 4, 3, 0], total: 26, pass: 26 },
      { subject: "គណិតវិទ្យា", gender: "ស្រី", scores: [0, 0, 0, 0, 1, 2, 0, 3, 13, 3, 0], total: 22, pass: 21 },
      { subject: "គណិតវិទ្យា", gender: "ប្រុស", scores: [0, 0, 0, 0, 0, 3, 7, 7, 6, 3, 0], total: 26, pass: 26 },
      { subject: "សិក្សាសង្គម", gender: "ស្រី", scores: [0, 0, 0, 0, 0, 2, 4, 4, 7, 4, 1], total: 22, pass: 22 },
      { subject: "សិក្សាសង្គម", gender: "ប្រុស", scores: [0, 0, 0, 0, 0, 4, 7, 4, 6, 3, 2], total: 26, pass: 26 },
      { subject: "វិទ្យាសាស្ត្រ", gender: "ស្រី", scores: [0, 0, 0, 0, 1, 3, 1, 5, 7, 4, 1], total: 22, pass: 21 },
      { subject: "វិទ្យាសាស្ត្រ", gender: "ប្រុស", scores: [0, 0, 0, 0, 0, 4, 10, 5, 4, 3, 0], total: 26, pass: 26 },
    ],
  },
  {
    gradeNum: 5,
    subjects: [
      { subject: "ភាសាខ្មែរ", gender: "ស្រី", scores: [0, 0, 0, 0, 1, 3, 7, 7, 4, 1, 0], total: 23, pass: 22 },
      { subject: "ភាសាខ្មែរ", gender: "ប្រុស", scores: [0, 0, 0, 1, 4, 5, 7, 4, 4, 2, 0], total: 27, pass: 22 },
      { subject: "គណិតវិទ្យា", gender: "ស្រី", scores: [0, 1, 0, 1, 1, 4, 10, 4, 2, 0, 0], total: 23, pass: 20 },
      { subject: "គណិតវិទ្យា", gender: "ប្រុស", scores: [0, 0, 1, 6, 4, 1, 8, 3, 4, 0, 0], total: 27, pass: 16 },
      { subject: "សិក្សាសង្គម", gender: "ស្រី", scores: [0, 1, 0, 1, 4, 6, 3, 5, 3, 0, 0], total: 23, pass: 17 },
      { subject: "សិក្សាសង្គម", gender: "ប្រុស", scores: [0, 1, 0, 3, 5, 1, 2, 3, 8, 3, 1], total: 27, pass: 17 },
      { subject: "វិទ្យាសាស្ត្រ", gender: "ស្រី", scores: [0, 1, 0, 1, 4, 3, 7, 4, 3, 0, 0], total: 23, pass: 14 },
      { subject: "វិទ្យាសាស្ត្រ", gender: "ប្រុស", scores: [0, 1, 0, 8, 3, 1, 3, 7, 3, 1, 0], total: 27, pass: 15 },
    ],
  },
  {
    gradeNum: 6,
    subjects: [
      { subject: "ភាសាខ្មែរ", gender: "ស្រី", scores: [0, 0, 0, 0, 0, 2, 2, 4, 5, 3, 0], total: 16, pass: 16 },
      { subject: "ភាសាខ្មែរ", gender: "ប្រុស", scores: [0, 0, 0, 0, 0, 4, 2, 6, 3, 1, 0], total: 16, pass: 16 },
      { subject: "គណិតវិទ្យា", gender: "ស្រី", scores: [0, 0, 0, 0, 0, 2, 1, 1, 1, 8, 3], total: 16, pass: 16 },
      { subject: "គណិតវិទ្យា", gender: "ប្រុស", scores: [0, 0, 0, 0, 3, 2, 1, 3, 3, 4, 0], total: 16, pass: 13 },
      { subject: "សិក្សាសង្គម", gender: "ស្រី", scores: [0, 0, 0, 1, 1, 0, 1, 1, 8, 3, 1], total: 16, pass: 14 },
      { subject: "សិក្សាសង្គម", gender: "ប្រុស", scores: [0, 0, 0, 1, 1, 2, 1, 3, 2, 1, 2], total: 13, pass: 9 },
      { subject: "វិទ្យាសាស្ត្រ", gender: "ស្រី", scores: [0, 0, 0, 1, 1, 0, 1, 0, 4, 9, 0], total: 16, pass: 14 },
      { subject: "វិទ្យាសាស្ត្រ", gender: "ប្រុស", scores: [0, 0, 0, 2, 2, 1, 0, 1, 1, 3, 2], total: 12, pass: 7 },
    ],
  },
];
