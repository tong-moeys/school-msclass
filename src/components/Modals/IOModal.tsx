import React, { useState, useEffect } from "react";
import { Student, ScoreMap, AttendanceMap } from "../../types";
import {
  CLASSES,
  SUBJECTS,
  SEMESTERS,
  MONTHS,
  calcAge,
  normalizeDateInput,
  getTotal,
  getAvg,
  gradeOf,
  resultOf,
  fmtAvg,
  fmtTotal,
  fmtScore,
  roundQuarter,
  buildRankedList,
} from "../../lib/constants";
import * as XLSX from "xlsx";

interface IOModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  scoresMap: Record<string, ScoreMap>;
  attendanceMap: Record<string, AttendanceMap>;
  selClass: string;
  semester: string;
  selMonth: number;
  onImportStudents: (stus: Omit<Student, "id">[], targetClass?: string) => Promise<void>;
  onImportScores: (scores: Record<string, ScoreMap>) => Promise<void>;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

interface ScorePreviewRow {
  studentId: string;
  studentName: string;
  studentGender: string;
  fileStudentName: string;
  matchType: "exact_name" | "id_match" | "order_fallback" | "unmatched";
  scores: Record<string, number>;
  subjectCount: number;
}

export const IOModal: React.FC<IOModalProps> = ({
  isOpen,
  onClose,
  students,
  scoresMap,
  attendanceMap,
  selClass,
  semester,
  selMonth,
  onImportStudents,
  onImportScores,
  toast,
}) => {
  const [tab, setTab] = useState<"stu" | "sco">("stu");
  const [logMsg, setLogMsg] = useState<string>("រង់ចាំ...");
  const [targetClass, setTargetClass] = useState<string>(selClass || CLASSES[0] || "1A");
  const [importMode, setImportMode] = useState<"file" | "text">("file");
  const [pastedText, setPastedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Verification & Preview States
  const [scorePreviewList, setScorePreviewList] = useState<ScorePreviewRow[] | null>(null);
  const [unmatchedFileRows, setUnmatchedFileRows] = useState<{ rawName: string; scores: Record<string, number> }[]>([]);
  const [studentPreviewList, setStudentPreviewList] = useState<Omit<Student, "id">[] | null>(null);

  useEffect(() => {
    if (selClass) setTargetClass(selClass);
  }, [selClass]);

  useEffect(() => {
    // Reset preview when switching tabs or closing
    setScorePreviewList(null);
    setUnmatchedFileRows([]);
    setStudentPreviewList(null);
  }, [tab, isOpen]);

  if (!isOpen) return null;

  const STU_HEADERS = [
    "ល.រ",
    "គោត្តនាម",
    "នាម",
    "ភេទ",
    "ថ្ងៃខែឆ្នាំកំណើត",
    "អាយុ",
    "ឈ្មោះឪពុក",
    "មុខរបរឪពុក",
    "ឈ្មោះម្តាយ",
    "មុខរបរម្តាយ",
    "ភូមិ",
    "ឃុំ",
    "ស្រុក",
    "ខេត្ត",
    "ទូរស័ព្ទ",
  ];

  const downloadCSV = (filename: string, rows: string[]) => {
    const bom = "\uFEFF";
    const content = bom + rows.join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const normalizeKhmerStr = (s: string): string => {
    return s
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width spaces
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((l) => l.trim());
    return lines.map((line) => {
      const cols: string[] = [];
      let cur = "",
        inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQ && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else inQ = !inQ;
        } else if (c === "," && !inQ) {
          cols.push(cur.trim());
          cur = "";
        } else cur += c;
      }
      cols.push(cur.trim());
      return cols;
    });
  };

  // Helper to parse individual JSON object to Student
  const parseStudentFromObject = (item: any): Omit<Student, "id"> | null => {
    if (!item || typeof item !== "object") return null;
    let lastName = String(
      item.lastName || item.last_name || item.family_name || item["គោត្តនាម"] || ""
    ).trim();
    let firstName = String(
      item.firstName || item.first_name || item.given_name || item["នាម"] || ""
    ).trim();

    if (!lastName || !firstName) {
      const fullName = String(
        item.fullName ||
          item.full_name ||
          item.name ||
          item["ឈ្មោះ"] ||
          item["ឈ្មោះពេញ"] ||
          item["គោត្តនាម និងនាម"] ||
          item["គោត្តនាម-នាម"] ||
          item["គោត្តនាម_នាម"] ||
          ""
      ).trim();
      if (fullName) {
        const parts = fullName.split(/\s+/);
        if (parts.length >= 2) {
          lastName = lastName || parts[0];
          firstName = firstName || parts.slice(1).join(" ");
        } else if (parts.length === 1) {
          lastName = lastName || parts[0];
          firstName = firstName || "";
        }
      } else if (lastName && !firstName && lastName.includes(" ")) {
        const parts = lastName.split(/\s+/);
        lastName = parts[0];
        firstName = parts.slice(1).join(" ");
      }
    }

    if (!lastName && !firstName) return null;

    let genderStr = String(item.gender || item.sex || item["ភេទ"] || "").trim();
    let gender: "ប្រុស" | "ស្រី" = "ប្រុស";
    if (genderStr.includes("ស្រី") || genderStr.toLowerCase().includes("f") || genderStr.includes("female")) {
      gender = "ស្រី";
    }

    const rawDob = String(
      item.dob || item.birth || item["ថ្ងៃខែឆ្នាំកំណើត"] || item["ថ្ងៃកំណើត"] || ""
    ).trim();
    const dob = normalizeDateInput(rawDob);
    let age = String(item.age || item["អាយុ"] || "").trim();
    if (dob && !age) age = String(calcAge(dob));

    return {
      lastName,
      firstName,
      gender,
      dob,
      age,
      fatherName: String(
        item.fatherName || item.father || item["ឈ្មោះឪពុក"] || item["ឪពុក"] || ""
      ).trim(),
      fatherJob: String(item.fatherJob || item["មុខរបរឪពុក"] || item["មុខរបរ"] || "").trim(),
      motherName: String(
        item.motherName || item.mother || item["ឈ្មោះម្តាយ"] || item["ម្តាយ"] || item["ឈ្មោះម្ដាយ"] || item["ម្ដាយ"] || ""
      ).trim(),
      motherJob: String(item.motherJob || item["មុខរបរម្តាយ"] || item["មុខរបរម្ដាយ"] || "").trim(),
      village: String(item.village || item["ភូមិ"] || "").trim(),
      commune: String(item.commune || item["ឃុំ"] || "").trim(),
      district: String(item.district || item["ស្រុក"] || "").trim(),
      province: String(item.province || item["ខេត្ត"] || "").trim(),
      phone: String(item.phone || item["ទូរស័ព្ទ"] || "").trim(),
    };
  };

  // Parse 2D string rows to Student array
  const parseRowsToStudents = (rawRows: string[][]): Omit<Student, "id">[] => {
    if (rawRows.length < 2) return [];

    let headerRowIdx = -1;
    const keywords = ["គោត្តនាម", "នាម", "ឈ្មោះ", "ភេទ", "lastname", "firstname", "gender", "dob"];

    for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
      const rowStr = rawRows[r].join(" ").toLowerCase();
      if (keywords.some((kw) => rowStr.includes(kw))) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) headerRowIdx = 0;

    const header = rawRows[headerRowIdx].map((h) => h.toLowerCase().trim());

    const findColIdx = (aliases: string[], exclude: string[] = []) => {
      for (const alias of aliases) {
        const idx = header.findIndex((h) => {
          const match = h.includes(alias.toLowerCase());
          const notExcluded = !exclude.some((ex) => h.includes(ex.toLowerCase()));
          return match && notExcluded;
        });
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const lastNameIdx = findColIdx(
      ["គោត្តនាម", "lastname", "last_name", "family_name"],
      ["និងនាម", "-នាម", "_នាម", "នាមខ្លួន"]
    );
    const firstNameIdx = findColIdx(
      ["នាម", "firstname", "first_name", "given_name", "នាមខ្លួន"],
      ["គោត្តនាម", "និងនាម", "-នាម", "ឈ្មោះ", "ឪពុក", "ម្តាយ", "ម្ដាយ", "សិស្ស"]
    );
    const fullNameIdx = findColIdx(
      [
        "គោត្តនាម និងនាម",
        "គោត្តនាម-នាម",
        "គោត្តនាម_នាម",
        "ឈ្មោះពេញ",
        "ឈ្មោះសិស្ស",
        "fullname",
        "full_name",
        "ឈ្មោះ",
        "name",
      ],
      ["ឪពុក", "ម្តាយ", "ម្ដាយ", "father", "mother", "អាណាព្យាបាល"]
    );
    const genderIdx = findColIdx(["ភេទ", "gender", "sex"]);
    const dobIdx = findColIdx(["ថ្ងៃខែឆ្នាំកំណើត", "ថ្ងៃកំណើត", "ថ្ងៃខែកំណើត", "កំណើត", "dob", "birth", "birthday"]);
    const ageIdx = findColIdx(["អាយុ", "age"]);
    const fNameIdx = findColIdx(["ឈ្មោះឪពុក", "ឪពុក", "fathername", "father_name", "father"]);
    let fJobIdx = findColIdx(["មុខរបរឪពុក", "របរឪពុក", "fatherjob", "father_job"]);
    const mNameIdx = findColIdx(["ឈ្មោះម្តាយ", "ឈ្មោះម្ដាយ", "ម្តាយ", "ម្ដាយ", "mothername", "mother_name", "mother"]);
    let mJobIdx = findColIdx(["មុខរបរម្តាយ", "មុខរបរម្ដាយ", "របរម្តាយ", "របរម្ដាយ", "motherjob", "mother_job"]);

    // If generic "មុខរបរ" columns are used (e.g. ឈ្មោះឪពុក, មុខរបរ, ឈ្មោះម្ដាយ, មុខរបរ):
    if (fJobIdx === -1 && fNameIdx >= 0 && fNameIdx + 1 < header.length) {
      if (
        header[fNameIdx + 1].includes("មុខរបរ") ||
        header[fNameIdx + 1].includes("របរ") ||
        header[fNameIdx + 1].includes("job")
      ) {
        fJobIdx = fNameIdx + 1;
      }
    }
    if (mJobIdx === -1 && mNameIdx >= 0 && mNameIdx + 1 < header.length) {
      if (
        header[mNameIdx + 1].includes("មុខរបរ") ||
        header[mNameIdx + 1].includes("របរ") ||
        header[mNameIdx + 1].includes("job")
      ) {
        mJobIdx = mNameIdx + 1;
      }
    }

    const vilIdx = findColIdx(["ភូមិ", "village"]);
    const comIdx = findColIdx(["ឃុំ", "commune", "sangkat", "សង្កាត់"]);
    const disIdx = findColIdx(["ស្រុក", "district", "khan", "ខណ្ឌ"]);
    const provIdx = findColIdx(["ខេត្ត", "province", "city", "រាជធានី", "ក្រុង"]);
    const phoneIdx = findColIdx(["ទូរស័ព្ទ", "លេខទូរស័ព្ទ", "ទូរស័ព្ទលេខ", "phone", "tel", "mobile"]);

    const parsedStudents: Omit<Student, "id">[] = [];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every((c) => !c)) continue;

      let lastName = lastNameIdx >= 0 ? (row[lastNameIdx] || "").trim() : "";
      let firstName = firstNameIdx >= 0 ? (row[firstNameIdx] || "").trim() : "";

      if ((!lastName || !firstName) && fullNameIdx >= 0 && row[fullNameIdx]) {
        const full = row[fullNameIdx].trim();
        const parts = full.split(/\s+/);
        if (parts.length >= 2) {
          lastName = lastName || parts[0];
          firstName = firstName || parts.slice(1).join(" ");
        } else if (parts.length === 1) {
          lastName = lastName || parts[0];
          firstName = firstName || "";
        }
      } else if (lastName && !firstName && lastName.includes(" ")) {
        const parts = lastName.split(/\s+/);
        lastName = parts[0];
        firstName = parts.slice(1).join(" ");
      }

      if (!lastName && !firstName) continue;

      let gender = genderIdx >= 0 ? (row[genderIdx] || "").trim() : "ប្រុស";
      if (gender.includes("ស្រី") || gender.toLowerCase().includes("f") || gender.includes("female")) {
        gender = "ស្រី";
      } else {
        gender = "ប្រុស";
      }

      const rawDob = dobIdx >= 0 ? row[dobIdx] || "" : "";
      const dob = normalizeDateInput(rawDob);
      let age = ageIdx >= 0 ? (row[ageIdx] || "").trim() : "";
      if (dob && !age) age = String(calcAge(dob));

      parsedStudents.push({
        lastName,
        firstName,
        gender,
        dob,
        age,
        fatherName: fNameIdx >= 0 ? (row[fNameIdx] || "").trim() : "",
        fatherJob: fJobIdx >= 0 ? (row[fJobIdx] || "").trim() : "",
        motherName: mNameIdx >= 0 ? (row[mNameIdx] || "").trim() : "",
        motherJob: mJobIdx >= 0 ? (row[mJobIdx] || "").trim() : "",
        village: vilIdx >= 0 ? (row[vilIdx] || "").trim() : "",
        commune: comIdx >= 0 ? (row[comIdx] || "").trim() : "",
        district: disIdx >= 0 ? (row[disIdx] || "").trim() : "",
        province: provIdx >= 0 ? (row[provIdx] || "").trim() : "",
        phone: phoneIdx >= 0 ? (row[phoneIdx] || "").trim() : "",
      });
    }

    return parsedStudents;
  };

  // 1. Download Blank Student Template (Excel / CSV)
  const handleDownloadStudentTemplateXLSX = () => {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [
      STU_HEADERS,
      [
        1,
        "កា",
        "បូប្ផា",
        "ស្រី",
        "01/09/2015",
        "11",
        "អ៊ុច កុយ",
        "គ្រូពេទ្យ",
        "ស្រិប ឡាំ",
        "កសិករ",
        "ភូមិរោគ",
        "ឃុំស្ពានស្រែង",
        "ស្រុកភ្នំស្រុក",
        "ខេត្តបន្ទាយមានជ័យ",
        "012345678",
      ],
      [
        2,
        "សុខ",
        "ពិសិដ្ឋ",
        "ប្រុស",
        "15/05/2015",
        "11",
        "សុខ ចាន់",
        "អាជីវករ",
        "ម៉ៅ សុភី",
        "មេផ្ទះ",
        "ភូមិរោគ",
        "ឃុំស្ពានស្រែង",
        "ស្រុកភ្នំស្រុក",
        "ខេត្តបន្ទាយមានជ័យ",
        "098765432",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "បញ្ជីសិស្សគំរូ");
    XLSX.writeFile(wb, `student_template_${targetClass}.xlsx`);
    toast("📥 បានទាញយកទម្រង់បញ្ជីសិស្ស Excel រួចរាល់", "success");
  };

  // 2. Download Pre-filled Score Template (Excel / CSV) with ALL current student names in the class!
  const handleDownloadScoreTemplateXLSX = () => {
    if (!students.length) {
      toast("⚠️ ថ្នាក់នេះមិនទាន់មានសិស្សនៅឡើយទេ សូមបញ្ចូលសិស្សជាមុនសិន", "error");
      return;
    }
    const wb = XLSX.utils.book_new();
    const headers = ["ល.រ", "គោត្តនាម", "នាម", "ភេទ", "អាយុ", ...SUBJECTS];
    const rows: (string | number)[][] = [headers];

    students.forEach((s, idx) => {
      // Pre-fill existing scores if any
      const existingScores = scoresMap[s.id] || {};
      const subCols = SUBJECTS.map((subj) => {
        const val = existingScores[subj];
        return val !== undefined && val !== "" ? Number(val) : "";
      });
      rows.push([idx + 1, s.lastName, s.firstName, s.gender, s.age || "", ...subCols]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `ពិន្ទុ_${MONTHS[selMonth]}`);
    XLSX.writeFile(wb, `score_entry_template_${selClass}_${MONTHS[selMonth]}.xlsx`);
    toast(`📥 បានទាញយកទម្រង់បញ្ចូលពិន្ទុ Excel (${students.length} សិស្ស)`, "success");
  };

  const handleDownloadScoreTemplateCSV = () => {
    if (!students.length) {
      toast("⚠️ ថ្នាក់នេះមិនទាន់មានសិស្សនៅឡើយទេ", "error");
      return;
    }
    const headers = ["ល.រ", "គោត្តនាម", "នាម", "ភេទ", ...SUBJECTS];
    const rows = [headers.join(",")];
    students.forEach((s, idx) => {
      const existingScores = scoresMap[s.id] || {};
      const subCols = SUBJECTS.map((subj) => existingScores[subj] ?? "");
      rows.push([idx + 1, s.lastName, s.firstName, s.gender, ...subCols].join(","));
    });
    downloadCSV(`score_entry_template_${selClass}_${MONTHS[selMonth]}.csv`, rows);
    toast(`📥 បានទាញយកទម្រង់ពិន្ទុ CSV (${students.length} សិស្ស)`, "success");
  };

  // 3. Robust Score Parser that generates a Live Preview & Match Table
  const generateScorePreview = (input: any): void => {
    if (!students.length) {
      toast("⚠️ មិនមានបញ្ជីសិស្សក្នុងថ្នាក់ដើម្បីផ្គូផ្គងពិន្ទុទេ", "error");
      return;
    }

    // Build comprehensive lookup map
    const studentLookupMap: Record<string, Student> = {};
    students.forEach((s, idx) => {
      const cleanLast = normalizeKhmerStr(s.lastName);
      const cleanFirst = normalizeKhmerStr(s.firstName);
      const cleanFull = normalizeKhmerStr(`${s.lastName} ${s.firstName}`);
      const cleanReverseFull = normalizeKhmerStr(`${s.firstName} ${s.lastName}`);

      studentLookupMap[`${cleanLast}_${cleanFirst}`] = s;
      studentLookupMap[cleanFull] = s;
      studentLookupMap[cleanReverseFull] = s;
      studentLookupMap[s.id] = s;
      if (s.code) studentLookupMap[normalizeKhmerStr(s.code)] = s;
    });

    const previewMap: Record<string, ScorePreviewRow> = {};
    students.forEach((s) => {
      previewMap[s.id] = {
        studentId: s.id,
        studentName: `${s.lastName} ${s.firstName}`.trim(),
        studentGender: s.gender,
        fileStudentName: "-",
        matchType: "unmatched",
        scores: {},
        subjectCount: 0,
      };
    });

    const unmatchedList: { rawName: string; scores: Record<string, number> }[] = [];

    // Helper to extract numeric scores from a dict
    const extractScoresDict = (dict: any): Record<string, number> => {
      const sc: Record<string, number> = {};
      if (!dict || typeof dict !== "object") return sc;
      Object.entries(dict).forEach(([k, v]) => {
        const cleanK = k.trim();
        if (
          [
            "lastname",
            "firstname",
            "fullname",
            "name",
            "gender",
            "dob",
            "age",
            "id",
            "key",
            "គោត្តនាម",
            "នាម",
            "ឈ្មោះ",
            "ភេទ",
            "អាយុ",
            "ល.រ",
            "រៀង",
            "ចំណាត់ថ្នាក់",
            "មធ្យមភាគ",
            "និទ្ទេស",
            "លទ្ធផល",
            "ពិន្ទុសរុប",
          ].some((ig) => cleanK.toLowerCase().includes(ig))
        ) {
          return;
        }
        const num = typeof v === "number" ? v : parseFloat(String(v));
        if (!isNaN(num) && num >= 0 && num <= 100) {
          sc[cleanK] = roundQuarter(num);
        }
      });
      return sc;
    };

    // Case A: JSON Object or Array
    let jsonParsed: any = null;
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          jsonParsed = JSON.parse(trimmed);
        } catch {
          jsonParsed = null;
        }
      }
    } else if (typeof input === "object" && !Array.isArray(input)) {
      jsonParsed = input;
    } else if (Array.isArray(input) && input.length > 0 && typeof input[0] === "object" && !Array.isArray(input[0])) {
      jsonParsed = input;
    }

    if (jsonParsed) {
      let items: { key?: string; data: any }[] = [];
      if (Array.isArray(jsonParsed)) {
        items = jsonParsed.map((item, idx) => ({ key: String(idx), data: item }));
      } else {
        items = Object.entries(jsonParsed).map(([k, v]) => ({ key: k, data: v }));
      }

      items.forEach((itemObj, idx) => {
        const d = itemObj.data;
        if (!d || typeof d !== "object") return;

        const ln = String(d.lastName || d.last_name || d["គោត្តនាម"] || "").trim();
        const fn = String(d.firstName || d.first_name || d["នាម"] || "").trim();
        const full = String(
          d.fullName || d.full_name || d.name || d["ឈ្មោះ"] || d["គោត្តនាម និងនាម"] || ""
        ).trim();
        const rawIdentifier = full || (ln && fn ? `${ln} ${fn}` : itemObj.key || `Row #${idx + 1}`);

        let matchedStudent: Student | undefined;
        let matchType: ScorePreviewRow["matchType"] = "unmatched";

        if (ln && fn) {
          const key = `${normalizeKhmerStr(ln)}_${normalizeKhmerStr(fn)}`;
          if (studentLookupMap[key]) {
            matchedStudent = studentLookupMap[key];
            matchType = "exact_name";
          }
        }
        if (!matchedStudent && full) {
          const key = normalizeKhmerStr(full);
          if (studentLookupMap[key]) {
            matchedStudent = studentLookupMap[key];
            matchType = "exact_name";
          }
        }
        if (!matchedStudent && itemObj.key && studentLookupMap[itemObj.key]) {
          matchedStudent = studentLookupMap[itemObj.key];
          matchType = "id_match";
        }

        const scoresObj = extractScoresDict(d.scores || d);
        const subCount = Object.keys(scoresObj).length;

        if (matchedStudent) {
          previewMap[matchedStudent.id] = {
            studentId: matchedStudent.id,
            studentName: `${matchedStudent.lastName} ${matchedStudent.firstName}`.trim(),
            studentGender: matchedStudent.gender,
            fileStudentName: rawIdentifier,
            matchType: matchType,
            scores: scoresObj,
            subjectCount: subCount,
          };
        } else if (subCount > 0) {
          unmatchedList.push({
            rawName: rawIdentifier,
            scores: scoresObj,
          });
        }
      });
    } else if (Array.isArray(input)) {
      // Case B: 2D String Array (Excel / CSV)
      const rawRows = input as string[][];
      if (rawRows.length >= 2) {
        let headerRowIdx = 0;
        for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
          const rowStr = rawRows[r].join(" ").toLowerCase();
          if (
            rowStr.includes("គោត្តនាម") ||
            rowStr.includes("នាម") ||
            rowStr.includes("ឈ្មោះ") ||
            rowStr.includes("lastname")
          ) {
            headerRowIdx = r;
            break;
          }
        }

        const header = rawRows[headerRowIdx].map((h) => h.trim());
        const lastIdx = header.findIndex(
          (h) => (h.includes("គោត្តនាម") || h.toLowerCase().includes("lastname") || h.toLowerCase().includes("last_name")) &&
            !h.includes("និងនាម") && !h.includes("-នាម") && !h.includes("_នាម")
        );
        const firstIdx = header.findIndex(
          (h) => (h.includes("នាម") || h.toLowerCase().includes("firstname") || h.toLowerCase().includes("first_name")) &&
            !h.includes("គោត្តនាម") && !h.includes("និងនាម") && !h.includes("-នាម") && !h.includes("_នាម") &&
            !h.includes("ឈ្មោះ") && !h.includes("ឪពុក") && !h.includes("ម្តាយ") && !h.includes("ម្ដាយ")
        );
        const fullIdx = header.findIndex(
          (h) =>
            (h.includes("គោត្តនាម និងនាម") ||
              h.includes("គោត្តនាម-នាម") ||
              h.includes("គោត្តនាម_នាម") ||
              h.includes("ឈ្មោះពេញ") ||
              h.includes("ឈ្មោះសិស្ស") ||
              h.toLowerCase().includes("fullname") ||
              h.toLowerCase().includes("full_name") ||
              h.includes("ឈ្មោះ") ||
              h.toLowerCase().includes("name")) &&
            !h.includes("ឪពុក") &&
            !h.includes("ម្តាយ") &&
            !h.includes("ម្ដាយ")
        );
        const idIdx = header.findIndex(
          (h) => h.toLowerCase() === "id" || h.toLowerCase() === "code" || h === "អត្តលេខ"
        );

        const colSubjectMap: { colIdx: number; subjectName: string }[] = [];
        header.forEach((hName, idx) => {
          if (idx === lastIdx || idx === firstIdx || idx === fullIdx || idx === idIdx) return;
          if (
            [
              "ល.រ",
              "រៀង",
              "id",
              "gender",
              "ភេទ",
              "អាយុ",
              "age",
              "មធ្យមភាគ",
              "ចំណាត់ថ្នាក់",
              "និទ្ទេស",
              "លទ្ធផល",
              "ពិន្ទុសរុប",
            ].some((k) => hName.toLowerCase().includes(k))
          )
            return;
          if (hName) {
            colSubjectMap.push({ colIdx: idx, subjectName: hName });
          }
        });

        for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.every((c) => !c)) continue;

          const ln = lastIdx >= 0 ? row[lastIdx] || "" : "";
          const fn = firstIdx >= 0 ? row[firstIdx] || "" : "";
          const full = fullIdx >= 0 ? row[fullIdx] || "" : "";
          const idVal = idIdx >= 0 ? row[idIdx] || "" : "";
          const rawIdentifier = full || (ln && fn ? `${ln} ${fn}` : idVal || `ជួរទី ${r}`);

          let matchedStudent: Student | undefined;
          let matchType: ScorePreviewRow["matchType"] = "unmatched";

          if (ln && fn) {
            const key = `${normalizeKhmerStr(ln)}_${normalizeKhmerStr(fn)}`;
            if (studentLookupMap[key]) {
              matchedStudent = studentLookupMap[key];
              matchType = "exact_name";
            }
          }
          if (!matchedStudent && full) {
            const key = normalizeKhmerStr(full);
            if (studentLookupMap[key]) {
              matchedStudent = studentLookupMap[key];
              matchType = "exact_name";
            }
          }
          if (!matchedStudent && idVal && studentLookupMap[idVal]) {
            matchedStudent = studentLookupMap[idVal];
            matchType = "id_match";
          }

          // Extract scores
          const scoresObj: Record<string, number> = {};
          colSubjectMap.forEach(({ colIdx, subjectName }) => {
            const valStr = row[colIdx];
            if (valStr !== undefined && valStr !== "") {
              const numVal = parseFloat(valStr);
              if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
                scoresObj[subjectName] = roundQuarter(numVal);
              }
            }
          });

          const subCount = Object.keys(scoresObj).length;

          if (matchedStudent) {
            previewMap[matchedStudent.id] = {
              studentId: matchedStudent.id,
              studentName: `${matchedStudent.lastName} ${matchedStudent.firstName}`.trim(),
              studentGender: matchedStudent.gender,
              fileStudentName: rawIdentifier,
              matchType: matchType,
              scores: scoresObj,
              subjectCount: subCount,
            };
          } else if (subCount > 0) {
            unmatchedList.push({
              rawName: rawIdentifier,
              scores: scoresObj,
            });
          }
        }
      }
    }

    const previewList = Object.values(previewMap);
    const matchedCount = previewList.filter((p) => p.matchType !== "unmatched" && p.subjectCount > 0).length;

    setScorePreviewList(previewList);
    setUnmatchedFileRows(unmatchedList);

    if (matchedCount === 0) {
      setLogMsg("⚠️ រកមិនឃើញឈ្មោះសិស្សដែលត្រូវគ្នាក្នុងឯកសារឡើយ (សូមផ្ទៀងផ្ទាត់ឈ្មោះ គោត្តនាម ឬប្រើ Template គំរូ)");
      toast("⚠️ រកមិនឃើញឈ្មោះសិស្សត្រូវគ្នាទេ", "error");
    } else {
      setLogMsg(`🔍 បានផ្គូផ្គងសិស្ស ${matchedCount} / ${students.length} នាក់ ដោយផ្អែកលើឈ្មោះត្រឹមត្រូវ!`);
      toast(`🔍 បានផ្គូផ្គងសិស្ស ${matchedCount} នាក់ សូមពិនិត្យផ្ទៀងផ្ទាត់!`, "info");
    }
  };

  // Handle Score File selection
  const handleSelectScoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogMsg("⏳ កំពុងអាន និងផ្ទៀងផ្ទាត់ឈ្មោះសិស្សក្នុង File...");
    try {
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        generateScorePreview(text);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        const rawRows = jsonRows.map((r) => r.map((c) => String(c ?? "").trim()));
        generateScorePreview(rawRows);
      } else {
        const text = await file.text();
        let rawRows: string[][] = [];
        if (text.includes(";") && !text.includes(",")) {
          rawRows = text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .filter((l) => l.trim())
            .map((l) => l.split(";").map((c) => c.replace(/^"|"$/g, "").trim()));
        } else {
          rawRows = parseCSV(text);
        }
        generateScorePreview(rawRows);
      }
      e.target.value = "";
    } catch (err: any) {
      setLogMsg("❌ កំហុសពេលអាន File: " + err.message);
      toast("❌ " + err.message, "error");
      e.target.value = "";
    }
  };

  // Handle Confirm Save Scores to Firestore
  const handleConfirmSaveScores = async () => {
    if (!scorePreviewList) return;
    const finalScoresMap: Record<string, ScoreMap> = { ...scoresMap };
    let savedCount = 0;

    scorePreviewList.forEach((row) => {
      if (row.matchType !== "unmatched" && row.subjectCount > 0) {
        finalScoresMap[row.studentId] = {
          ...(finalScoresMap[row.studentId] || {}),
          ...row.scores,
        };
        savedCount++;
      }
    });

    if (savedCount === 0) {
      toast("⚠️ គ្មានពិន្ទុដែលត្រូវរក្សាទុកទេ", "error");
      return;
    }

    setIsProcessing(true);
    setLogMsg("⏳ កំពុងរក្សាទុកពិន្ទុទៅកាន់ Firestore...");
    try {
      await onImportScores(finalScoresMap);
      setLogMsg(`✅ បានរក្សាទុកពិន្ទុសិស្ស ${savedCount} នាក់ ទៅ Firestore ដោយជោគជ័យ!`);
      toast(`✅ រក្សាទុកពិន្ទុសិស្ស ${savedCount} នាក់ រួចរាល់! 🔥`, "success");
      setScorePreviewList(null);
      setUnmatchedFileRows([]);
    } catch (err: any) {
      setLogMsg("❌ " + err.message);
      toast("❌ " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Student File selection
  const handleSelectStudentFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogMsg("⏳ កំពុងអាន និងផ្ទៀងផ្ទាត់បញ្ជីសិស្ស...");
    try {
      let parsedStudents: Omit<Student, "id">[] = [];
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const jsonObj = JSON.parse(text);
        const list = Array.isArray(jsonObj) ? jsonObj : jsonObj.students || jsonObj.data || [jsonObj];
        for (const item of list) {
          const s = parseStudentFromObject(item);
          if (s) parsedStudents.push(s);
        }
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        const rawRows = jsonRows.map((r) => r.map((c) => String(c ?? "").trim()));
        parsedStudents = parseRowsToStudents(rawRows);
      } else {
        const text = await file.text();
        let rawRows: string[][] = [];
        if (text.includes(";") && !text.includes(",")) {
          rawRows = text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .filter((l) => l.trim())
            .map((l) => l.split(";").map((c) => c.replace(/^"|"$/g, "").trim()));
        } else {
          rawRows = parseCSV(text);
        }
        parsedStudents = parseRowsToStudents(rawRows);
      }

      if (parsedStudents.length === 0) {
        setLogMsg("⚠️ រកមិនឃើញទិន្នន័យសិស្សក្នុង File នេះទេ (សូមពិនិត្យ Header គោត្តនាម, នាម, ភេទ)");
        toast("⚠️ រកមិនឃើញទិន្នន័យសិស្សទេ", "error");
        e.target.value = "";
        return;
      }

      setStudentPreviewList(parsedStudents);
      setLogMsg(`📋 បានរកឃើញសិស្ស ${parsedStudents.length} នាក់ សូមពិនិត្យផ្ទៀងផ្ទាត់មុននឹងរក្សាទុក!`);
      toast(`📋 រកឃើញសិស្ស ${parsedStudents.length} នាក់`, "info");
      e.target.value = "";
    } catch (err: any) {
      setLogMsg("❌ " + err.message);
      toast("❌ " + err.message, "error");
      e.target.value = "";
    }
  };

  // Handle Confirm Save Students to Firestore
  const handleConfirmSaveStudents = async () => {
    if (!studentPreviewList || studentPreviewList.length === 0) return;
    setIsProcessing(true);
    setLogMsg(`⏳ កំពុងរក្សាទុកសិស្ស ${studentPreviewList.length} នាក់ ទៅ Firestore...`);
    try {
      await onImportStudents(studentPreviewList, targetClass);
      setLogMsg(`✅ បាននាំចូលសិស្ស ${studentPreviewList.length} នាក់ ទៅថ្នាក់ ${targetClass} រួចរាល់!`);
      toast(`✅ នាំចូលសិស្ស ${studentPreviewList.length} នាក់ រួចរាល់! 🔥`, "success");
      setStudentPreviewList(null);
    } catch (err: any) {
      setLogMsg("❌ " + err.message);
      toast("❌ " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Export Full System Backup
  const handleExportAllXLSX = () => {
    const ranked = buildRankedList(students, scoresMap);
    const wb = XLSX.utils.book_new();

    // Sheet 1: Students
    const hStu = [
      "ល.រ",
      "គោត្តនាម",
      "នាម",
      "ភេទ",
      "ថ្ងៃខែឆ្នាំកំណើត",
      "អាយុ",
      "ឈ្មោះឪពុក",
      "មុខរបរឪពុក",
      "ឈ្មោះម្តាយ",
      "មុខរបរម្តាយ",
      "ភូមិ",
      "ឃុំ",
      "ស្រុក",
      "ខេត្ត",
      "ទូរស័ព្ទ",
    ];
    const rStu: (string | number)[][] = [hStu];
    students.forEach((s, i) => {
      rStu.push([
        i + 1,
        s.lastName,
        s.firstName,
        s.gender,
        s.dob || "",
        s.age || "",
        s.fatherName || "",
        s.fatherJob || "",
        s.motherName || "",
        s.motherJob || "",
        s.village || "",
        s.commune || "",
        s.district || "",
        s.province || "",
        s.phone || "",
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rStu), "ព័ត៌មានសិស្ស");

    // Sheet 2: Scores
    const hSco = [
      "ល.រ",
      "ចំណាត់ថ្នាក់",
      "គោត្តនាម",
      "នាម",
      "ភេទ",
      ...SUBJECTS,
      "ពិន្ទុសរុប",
      "មធ្យមភាគ",
      "លទ្ធផល",
      "និទ្ទេស",
    ];
    const rSco: (string | number)[][] = [hSco];
    ranked.forEach((s, i) => {
      const avg = getAvg(s.id, students, scoresMap);
      const g = gradeOf(avg);
      rSco.push([
        i + 1,
        s._rank || i + 1,
        s.lastName,
        s.firstName,
        s.gender,
        ...SUBJECTS.map((subj) => scoresMap[s.id]?.[subj] ?? ""),
        getTotal(s.id, scoresMap),
        Number(fmtAvg(avg)),
        resultOf(avg),
        g.l,
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rSco), `ពិន្ទុ_${MONTHS[selMonth]}`);

    // Sheet 3: Attendance
    const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
    const hAtt = ["ល.រ", "គោត្តនាម-នាម", "ភេទ", ...days, "ច្បាប់(P)", "អត់(A)"];
    const rAtt: (string | number)[][] = [hAtt];
    students.forEach((s, i) => {
      const p = days.filter((d) => attendanceMap[s.id]?.[+d] === "P").length;
      const a = days.filter((d) => attendanceMap[s.id]?.[+d] === "A").length;
      rAtt.push([
        i + 1,
        `${s.lastName} ${s.firstName}`,
        s.gender,
        ...days.map((d) => attendanceMap[s.id]?.[+d] || ""),
        p,
        a,
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rAtt), "វត្តមាន");

    XLSX.writeFile(wb, `plp2026_full_backup_${selClass}.xlsx`);
    toast("📋 Export ទាំងអស់ XLSX រួចរាល់", "success");
  };

  const handleExportScoresXLSX = () => {
    const ranked = buildRankedList(students, scoresMap);
    const semLabel = SEMESTERS.find((s) => s.id === semester)?.label || semester;
    const wb = XLSX.utils.book_new();
    const headers = [
      "ល.រ",
      "ចំណាត់ថ្នាក់",
      "គោត្តនាម",
      "នាម",
      "ភេទ",
      "អាយុ",
      ...SUBJECTS,
      "ពិន្ទុសរុប",
      "មធ្យមភាគ",
      "លទ្ធផល",
      "និទ្ទេស",
    ];
    const rows: (string | number)[][] = [headers];

    ranked.forEach((s, i) => {
      const avg = getAvg(s.id, students, scoresMap);
      const total = getTotal(s.id, scoresMap);
      const g = gradeOf(avg);
      const subScores = SUBJECTS.map((subj) => {
        const v = scoresMap[s.id]?.[subj];
        return v !== "" && v !== undefined ? Number(v) : "";
      });
      rows.push([
        i + 1,
        s._rank || i + 1,
        s.lastName,
        s.firstName,
        s.gender,
        s.age || "",
        ...subScores,
        total,
        Number(fmtAvg(avg)),
        resultOf(avg),
        g.l,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `ពិន្ទុ_${MONTHS[selMonth]}`);
    XLSX.writeFile(wb, `scores_${selClass}_${semLabel}_${MONTHS[selMonth]}.xlsx`);
    toast("📊 Export ពិន្ទុ XLSX ដោយជោគជ័យ", "success");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-5 w-full max-w-2xl shadow-2xl border border-slate-100 animate-fade-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📦</span>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">
                Import / Export ទិន្នន័យ (ធានាភាពសុក្រឹត ១០០%)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                ផ្គូផ្គងតាមឈ្មោះសិស្ស និងផ្ទៀងផ្ទាត់ដោយផ្ទាល់ភ្នែកមុនបញ្ចូលទៅ Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1.5 rounded-full hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 my-3 shrink-0">
          <button
            onClick={() => setTab("stu")}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-black border transition flex items-center justify-center gap-2 ${
              tab === "stu"
                ? "border-blue-600 bg-blue-50 text-blue-800 shadow-xs"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>👤</span> បញ្ជីសិស្ស (Students)
          </button>
          <button
            onClick={() => setTab("sco")}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-black border transition flex items-center justify-center gap-2 ${
              tab === "sco"
                ? "border-purple-600 bg-purple-50 text-purple-800 shadow-xs"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>📝</span> ពិន្ទុ & ការផ្គូផ្គងឈ្មោះ (Scores)
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {tab === "stu" ? (
            /* ================= STUDENT IMPORT TAB ================= */
            <div className="space-y-3">
              {/* Class Selector Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3.5 rounded-2xl shadow-inner">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <span>🏫</span> ជ្រើសរើសថ្នាក់ដែលត្រូវនាំចូលសិស្ស៖
                  </label>
                  <span className="text-[10px] bg-slate-700 text-slate-200 px-2.5 py-0.5 rounded-full font-bold">
                    {targetClass ? `ថ្នាក់ទី ${targetClass}` : "មិនទាន់ជ្រើស"}
                  </span>
                </div>
                <select
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white font-black text-sm rounded-xl p-2.5 outline-none focus:border-blue-400 cursor-pointer"
                >
                  {CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      🎓 ថ្នាក់ទី {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Download Card */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="font-bold text-amber-950 flex items-center gap-1">
                    <span>💡</span> មិនទាន់មានទម្រង់ Excel មែនទេ?
                  </div>
                  <div className="text-[11px] text-amber-800">
                    ទាញយកទម្រង់គំរូមានក្បាលតារាង (គោត្តនាម, នាម, ភេទ, ថ្ងៃកំណើត...)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadStudentTemplateXLSX}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-xs transition shrink-0"
                >
                  📥 ទាញយក Template Excel
                </button>
              </div>

              {/* Student Preview View (If loaded) */}
              {studentPreviewList ? (
                <div className="bg-blue-50/50 border-2 border-blue-300 rounded-2xl p-3 space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                      <span>📋</span> ផ្ទៀងផ្ទាត់បញ្ជីសិស្ស ({studentPreviewList.length} នាក់)
                    </span>
                    <button
                      onClick={() => setStudentPreviewList(null)}
                      className="text-xs text-red-600 hover:underline font-bold"
                    >
                      ✕ បោះបង់
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-blue-200 rounded-xl bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-blue-100 text-blue-900 text-[11px] font-black sticky top-0">
                        <tr>
                          <th className="p-2">ល.រ</th>
                          <th className="p-2">គោត្តនាម-នាម</th>
                          <th className="p-2">ភេទ</th>
                          <th className="p-2">ថ្ងៃកំណើត</th>
                          <th className="p-2">អាសយដ្ឋាន</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentPreviewList.map((st, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 font-mono text-slate-500">{i + 1}</td>
                            <td className="p-2 font-bold text-slate-900">
                              {st.lastName} {st.firstName}
                            </td>
                            <td className="p-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  st.gender === "ស្រី"
                                    ? "bg-pink-100 text-pink-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {st.gender}
                              </span>
                            </td>
                            <td className="p-2 text-slate-600">{st.dob || "-"}</td>
                            <td className="p-2 text-slate-500 text-[11px]">
                              {[st.village, st.commune, st.district, st.province]
                                .filter(Boolean)
                                .join(", ") || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStudentPreviewList(null)}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      ✕ បោះបង់
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleConfirmSaveStudents}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 text-xs rounded-xl shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
                    >
                      {isProcessing
                        ? "⏳ កំពុងរក្សាទុក..."
                        : `✅ ខ្ញុំបានផ្ទៀងផ្ទាត់ត្រឹមត្រូវ — បញ្ចូល ${studentPreviewList.length} នាក់ ទៅ ថ្នាក់ ${targetClass} 🔥`}
                    </button>
                  </div>
                </div>
              ) : (
                /* Import Mode Toggle */
                <div className="space-y-3">
                  <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-bold gap-1">
                    <button
                      type="button"
                      onClick={() => setImportMode("file")}
                      className={`flex-1 py-2 rounded-xl transition ${
                        importMode === "file"
                          ? "bg-white text-blue-700 shadow-xs font-black"
                          : "text-slate-600"
                      }`}
                    >
                      📁 Upload File (Excel / CSV / JSON)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode("text")}
                      className={`flex-1 py-2 rounded-xl transition ${
                        importMode === "text"
                          ? "bg-white text-blue-700 shadow-xs font-black"
                          : "text-slate-600"
                      }`}
                    >
                      📋 បិទអត្ថបទ JSON / CSV (Paste)
                    </button>
                  </div>

                  {importMode === "file" ? (
                    <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                      <div className="text-3xl mb-1">📂</div>
                      <div className="text-xs font-bold text-slate-800">
                        ជ្រើសរើសឯកសារបញ្ជីសិស្សពីកុំព្យូទ័រ/ទូរស័ព្ទ
                      </div>
                      <div className="text-[11px] text-slate-500">
                        គាំទ្រ Excel (.xlsx, .xls), CSV (UTF-8), និង JSON
                      </div>
                      <label className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-6 rounded-xl text-xs cursor-pointer shadow-md shadow-blue-500/20 transition">
                        📥 ជ្រើសរើស File បញ្ជីសិស្ស...
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls,.json"
                          onChange={handleSelectStudentFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">📋 ចម្លង & បិទអត្ថបទ ៖</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPastedText(`[
  {
    "lastName": "កា",
    "firstName": "បូប្ផា",
    "gender": "ស្រី",
    "dob": "1/9/2015",
    "fatherName": "អ៊ុច កុយ",
    "motherName": "ស្រិប ឡាំ",
    "village": "ភូមិរោគ",
    "commune": "ឃុំស្ពានស្រែង",
    "district": "ស្រុកភ្នំស្រុក",
    "province": "ខេត្តបន្ទាយមានជ័យ"
  }
]`);
                          }}
                          className="text-[10px] text-blue-600 hover:underline font-extrabold"
                        >
                          + គំរូ JSON
                        </button>
                      </div>

                      <textarea
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={`បិទអត្ថបទ JSON ឬ CSV នៅទីនេះ...`}
                        rows={5}
                        className="w-full font-mono text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:border-blue-500 outline-none leading-relaxed text-slate-800"
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPastedText("")}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                        >
                          សម្អាត
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = pastedText.trim();
                            if (!trimmed) {
                              toast("⚠️ សូមបញ្ចូលអត្ថបទជាមុនសិន", "error");
                              return;
                            }
                            if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
                              try {
                                const jsonObj = JSON.parse(trimmed);
                                const list = Array.isArray(jsonObj)
                                  ? jsonObj
                                  : jsonObj.students || jsonObj.data || [jsonObj];
                                const parsed: Omit<Student, "id">[] = [];
                                for (const item of list) {
                                  const s = parseStudentFromObject(item);
                                  if (s) parsed.push(s);
                                }
                                if (parsed.length) setStudentPreviewList(parsed);
                                else toast("❌ រកមិនឃើញទិន្នន័យសិស្សទេ", "error");
                              } catch {
                                toast("❌ JSON Format មិនត្រឹមត្រូវ", "error");
                              }
                            } else {
                              const rawRows = parseCSV(trimmed);
                              const parsed = parseRowsToStudents(rawRows);
                              if (parsed.length) setStudentPreviewList(parsed);
                              else toast("❌ រកមិនឃើញទិន្នន័យសិស្សទេ", "error");
                            }
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2 text-xs rounded-xl shadow-md shadow-blue-500/20 transition"
                        >
                          🔍 ពិនិត្យ & ផ្ទៀងផ្ទាត់មុននាំចូល
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ================= SCORE IMPORT & VERIFICATION TAB ================= */
            <div className="space-y-3">
              {/* Active Class & Month Banner */}
              <div className="bg-purple-900 text-white p-3.5 rounded-2xl shadow-inner flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <span>📝</span> នាំចូល & ផ្គូផ្គងពិន្ទុ៖ ថ្នាក់ {selClass} — ខែ{MONTHS[selMonth]}
                  </div>
                  <div className="text-[11px] text-purple-200">
                    សិស្សសរុបក្នុងថ្នាក់៖ <strong>{students.length} នាក់</strong>
                  </div>
                </div>
                <span className="text-[10px] bg-purple-800 text-purple-200 border border-purple-600 px-3 py-1 rounded-full font-bold">
                  {semester === "s1" ? "ឆមាសទី ១" : "ឆមាសទី ២"}
                </span>
              </div>

              {/* 🌟 1. SMART SCORE TEMPLATE GENERATOR (WITH ALL CURRENT STUDENT NAMES) */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black text-purple-950 text-xs flex items-center gap-1.5">
                      <span>✨</span> ជំហានទី ១៖ ទាញយកទម្រង់ពិន្ទុ (មានឈ្មោះសិស្សក្នុងថ្នាក់ {selClass} ស្រាប់)
                    </div>
                    <div className="text-[11px] text-purple-800 leading-relaxed mt-0.5">
                      ទម្រង់ Excel នេះមានចុះ <strong>ឈ្មោះសិស្សទាំង {students.length} នាក់ក្នុងថ្នាក់ស្រាប់</strong>។ លោកគ្រូអ្នកគ្រូគ្រាន់តែវាយពិន្ទុបំពេញ រួច Upload មកវិញ ប្រព័ន្ធនឹងផ្គូផ្គងតាមឈ្មោះ ១០០% គ្មានខុសឡើយ!
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadScoreTemplateXLSX}
                    className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-black py-2 px-3 rounded-xl text-xs shadow-md shadow-purple-600/20 transition flex items-center justify-center gap-1.5"
                  >
                    <span>📊</span> ទាញយក Template Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadScoreTemplateCSV}
                    className="bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 font-bold py-2 px-3 rounded-xl text-xs transition"
                  >
                    CSV
                  </button>
                </div>
              </div>

              {/* 🌟 2. LIVE SCORE VERIFICATION PREVIEW TABLE */}
              {scorePreviewList ? (
                <div className="bg-white border-2 border-purple-400 rounded-2xl p-3.5 space-y-3 shadow-lg animate-fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                        <span>🔍</span> ជំហានទី ២៖ ផ្ទៀងផ្ទាត់ការផ្គូផ្គងឈ្មោះ & ពិន្ទុ
                      </div>
                      <div className="text-[11px] text-slate-500">
                        សូមពិនិត្យមើលថាតើពិន្ទុត្រូវចំឈ្មោះសិស្សនីមួយៗហើយឬនៅ
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setScorePreviewList(null);
                        setUnmatchedFileRows([]);
                      }}
                      className="text-xs text-red-600 hover:underline font-bold"
                    >
                      ✕ ជ្រើសរើសឯកសារថ្មី
                    </button>
                  </div>

                  {/* Summary Badges */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                      <div className="text-[10px] font-bold text-emerald-700">✅ ផ្គូផ្គងត្រូវឈ្មោះ</div>
                      <div className="text-base font-black text-emerald-800">
                        {scorePreviewList.filter((p) => p.matchType !== "unmatched" && p.subjectCount > 0).length} នាក់
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2">
                      <div className="text-[10px] font-bold text-amber-700">⚪ គ្មានពិន្ទុក្នុង File</div>
                      <div className="text-base font-black text-amber-800">
                        {scorePreviewList.filter((p) => p.subjectCount === 0).length} នាក់
                      </div>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2">
                      <div className="text-[10px] font-bold text-rose-700">⚠️ ឈ្មោះក្រៅថ្នាក់</div>
                      <div className="text-base font-black text-rose-800">
                        {unmatchedFileRows.length} នាក់
                      </div>
                    </div>
                  </div>

                  {/* Detailed Match Table */}
                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-800 text-[11px] font-black sticky top-0">
                        <tr>
                          <th className="p-2 w-8">ល.រ</th>
                          <th className="p-2">ឈ្មោះសិស្សក្នុងថ្នាក់</th>
                          <th className="p-2">ឈ្មោះក្នុង File</th>
                          <th className="p-2 text-center">ស្ថានភាពផ្គូផ្គង</th>
                          <th className="p-2 text-right">ពិន្ទុដែលរកឃើញ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scorePreviewList.map((row, idx) => {
                          const isMatched = row.matchType !== "unmatched" && row.subjectCount > 0;
                          return (
                            <tr
                              key={row.studentId}
                              className={isMatched ? "hover:bg-emerald-50/40" : "bg-slate-50/60 opacity-80"}
                            >
                              <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-900">
                                {row.studentName}
                                <span className="ml-1 text-[10px] text-slate-400">({row.studentGender})</span>
                              </td>
                              <td className="p-2 text-slate-600 font-medium">
                                {row.fileStudentName}
                              </td>
                              <td className="p-2 text-center">
                                {isMatched ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    ✓ ត្រូវឈ្មោះ ១០០%
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    - គ្មានពិន្ទុ
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right font-mono">
                                {row.subjectCount > 0 ? (
                                  <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                    {row.subjectCount} មុខវិជ្ជា
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Unmatched Warning List */}
                  {unmatchedFileRows.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-900">
                      <div className="font-bold flex items-center gap-1 mb-1">
                        <span>⚠️</span> ឈ្មោះក្នុង File ដែលមិនមានក្នុងបញ្ជីថ្នាក់ {selClass} ៖
                      </div>
                      <div className="flex flex-wrap gap-1 text-[11px]">
                        {unmatchedFileRows.map((u, i) => (
                          <span
                            key={i}
                            className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md border border-rose-300 font-medium"
                          >
                            {u.rawName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setScorePreviewList(null);
                        setUnmatchedFileRows([]);
                      }}
                      className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      ✕ បោះបង់
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleConfirmSaveScores}
                      className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-black py-2.5 text-xs rounded-xl shadow-lg shadow-purple-600/30 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isProcessing
                        ? "⏳ កំពុងរក្សាទុក..."
                        : "✅ ខ្ញុំបានផ្ទៀងផ្ទាត់ត្រឹមត្រូវ — រក្សាទុកពិន្ទុទៅ Firestore 🔥"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Import Mode Toggle for Scores */
                <div className="space-y-3">
                  <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-bold gap-1">
                    <button
                      type="button"
                      onClick={() => setImportMode("file")}
                      className={`flex-1 py-2 rounded-xl transition ${
                        importMode === "file"
                          ? "bg-white text-purple-700 shadow-xs font-black"
                          : "text-slate-600"
                      }`}
                    >
                      📁 Upload File ពិន្ទុ (Excel / CSV / JSON)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode("text")}
                      className={`flex-1 py-2 rounded-xl transition ${
                        importMode === "text"
                          ? "bg-white text-purple-700 shadow-xs font-black"
                          : "text-slate-600"
                      }`}
                    >
                      📋 បិទអត្ថបទ JSON / CSV (Paste)
                    </button>
                  </div>

                  {importMode === "file" ? (
                    <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                      <div className="text-3xl mb-1">📊</div>
                      <div className="text-xs font-bold text-slate-800">
                        ជ្រើសរើស File Excel ឬ CSV ដែលលោកគ្រូអ្នកគ្រូបានបំពេញពិន្ទុ
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ប្រព័ន្ធនឹងពិនិត្យឈ្មោះសិស្ស និងបង្ហាញតារាងផ្ទៀងផ្ទាត់មុននឹង Save
                      </div>
                      <label className="inline-block bg-purple-700 hover:bg-purple-800 text-white font-black py-2.5 px-6 rounded-xl text-xs cursor-pointer shadow-md shadow-purple-600/20 transition">
                        📥 ជ្រើសរើស File ពិន្ទុ (Excel / CSV / JSON)...
                        <input
                          type="file"
                          accept=".json,.csv,.xlsx,.xls"
                          onChange={handleSelectScoreFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">📋 ចម្លង & បិទអត្ថបទពិន្ទុ ៖</span>
                      </div>

                      <textarea
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={`បិទអត្ថបទ JSON ឬ CSV ពិន្ទុនៅទីនេះ...`}
                        rows={5}
                        className="w-full font-mono text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:border-purple-500 outline-none leading-relaxed text-slate-800"
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPastedText("")}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                        >
                          សម្អាត
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = pastedText.trim();
                            if (!trimmed) {
                              toast("⚠️ សូមបញ្ចូលអត្ថបទពិន្ទុជាមុនសិន", "error");
                              return;
                            }
                            generateScorePreview(trimmed);
                          }}
                          className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-black py-2 text-xs rounded-xl shadow-md shadow-purple-600/20 transition"
                        >
                          🔍 ពិនិត្យ & ផ្ទៀងផ្ទាត់ពិន្ទុមុន Save
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Other Export Shortcuts */}
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportScoresXLSX}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-[11px] transition shadow-xs flex items-center justify-center gap-1"
                    >
                      <span>📊</span> Export ពិន្ទុ XLSX (មាន Rank)
                    </button>
                    <button
                      onClick={handleExportAllXLSX}
                      className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2 rounded-xl text-[11px] transition shadow-xs flex items-center justify-center gap-1"
                    >
                      <span>📋</span> Backup ទិន្នន័យទាំងអស់ XLSX
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Log Footer */}
        <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-medium shrink-0 flex items-center gap-2">
          <span>ℹ️</span> {logMsg}
        </div>
      </div>
    </div>
  );
};
