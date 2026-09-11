import React, { useState, useEffect } from "react";
import { Student, SemesterExamRecord } from "../../types";
import { EXAM_SUBJECTS, truncate2, roundQuarter, fmtScore } from "../../lib/constants";
import * as XLSX from "xlsx";

interface SemesterExamImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  semesterId: "s1" | "s2";
  existingExamRecords: Record<string, SemesterExamRecord>;
  onImportExamScores: (semId: "s1" | "s2", scoresByStudent: Record<string, Record<string, number | "">>) => Promise<void>;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  className?: string;
  initialJsonData?: any;
}

interface ExamScorePreviewRow {
  studentId: string;
  studentName: string;
  studentGender: string;
  fileStudentName: string;
  matchType: "exact_name" | "id_match" | "order_fallback" | "unmatched";
  scores: Record<string, number>;
  subjectCount: number;
}

export const SemesterExamImportModal: React.FC<SemesterExamImportModalProps> = ({
  isOpen,
  onClose,
  students,
  semesterId,
  existingExamRecords,
  onImportExamScores,
  toast,
  className = "",
  initialJsonData,
}) => {
  const [importMode, setImportMode] = useState<"file" | "text">("file");
  const [pastedText, setPastedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [logMsg, setLogMsg] = useState<string>("រង់ចាំ...");

  // Verification & Preview States
  const [scorePreviewList, setScorePreviewList] = useState<ExamScorePreviewRow[] | null>(null);
  const [unmatchedFileRows, setUnmatchedFileRows] = useState<{ rawName: string; scores: Record<string, number> }[]>([]);

  const semLabel = semesterId === "s1" ? "ឆមាសទី១" : "ឆមាសទី២";

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

  // Helper to smartly map raw scores dict to 11 MoEYS Semester Exam Subjects
  const extractSmartExamScores = (dict: any): Record<string, number> => {
    const result: Record<string, number> = {};
    if (!dict || typeof dict !== "object") return result;

    // 1. Collect all valid numeric entries with normalized keys
    const rawKeyValues: { origKey: string; normKey: string; val: number }[] = [];

    const ignoredKeywords = [
      "lastname", "firstname", "fullname", "name", "gender", "dob", "age",
      "id", "key", "គោត្តនាម", "នាម", "ឈ្មោះ", "ភេទ", "អាយុ", "ល.រ", "រៀង",
      "ចំណាត់ថ្នាក់", "មធ្យមភាគ", "និទ្ទេស", "លទ្ធផល", "ពិន្ទុប្រឡងសរុប",
      "ពិន្ទុសរុប", "ម.ប្រឡង", "ម.ប្រចាំខែ", "ម.ឆមាស", "សេចក្តីផ្សេងៗ",
      "ចំណេះដឹង", "បំណិន-បំណេះធ្វើ", "តម្លៃ-សីលធម៌", "សមត្ថភាព-ការចូលរួម"
    ];

    Object.entries(dict).forEach(([k, v]) => {
      const origKey = k.trim();
      const normKey = normalizeKhmerStr(origKey);

      // Check if this column should be ignored (metadata/ranking)
      if (
        ignoredKeywords.some((ig) => {
          const normIg = normalizeKhmerStr(ig);
          return normKey === normIg || normKey.includes(normIg);
        })
      ) {
        return;
      }

      const num = typeof v === "number" ? v : parseFloat(String(v));
      if (!isNaN(num) && num >= 0 && num <= 100) {
        rawKeyValues.push({ origKey, normKey, val: num });
      }
    });

    const findRawVal = (aliases: string[], exclude: string[] = []): number | undefined => {
      for (const item of rawKeyValues) {
        const match = aliases.some((a) => {
          const normA = normalizeKhmerStr(a);
          return item.normKey === normA || item.normKey.includes(normA) || normA.includes(item.normKey);
        });
        const notExcluded = !exclude.some((ex) => item.normKey.includes(normalizeKhmerStr(ex)));
        if (match && notExcluded) {
          return item.val;
        }
      }
      return undefined;
    };

    // -------------------------------------------------------------
    // RULE 1: បំណិនទាំង៤ របស់ភាសាខ្មែរ
    // -------------------------------------------------------------
    // 1.1 អំណាន ឬ សមត្ថភាពអាន
    const readScore = findRawVal(["អំណាន", "សមត្ថភាពអាន", "ការអាន", "reading"]);
    if (readScore !== undefined) {
      result["អំណាន"] = readScore;
    }

    // 1.2 សរសេរតាមអាន / តែងសេចក្ដី / សមត្ថភាពសរសេរ
    const dictationScore = findRawVal(["សរសេរតាមអាន", "dictation"]);
    const essayScore = findRawVal(["តែងសេចក្តី", "តែងសេចក្ដី", "essay", "composition"]);
    const writingScore = findRawVal(["សមត្ថភាពសរសេរ", "ការសរសេរ", "សរសេរ", "writing"], ["សរសេរតាមអាន"]);

    if (dictationScore !== undefined) {
      result["សរសេរតាមអាន"] = dictationScore;
    }
    if (essayScore !== undefined) {
      result["តែងសេចក្តី"] = essayScore;
    }
    if (writingScore !== undefined) {
      if (result["សរសេរតាមអាន"] === undefined && result["តែងសេចក្តី"] === undefined) {
        result["សរសេរតាមអាន"] = writingScore;
      } else if (result["សរសេរតាមអាន"] === undefined) {
        result["សរសេរតាមអាន"] = writingScore;
      } else if (result["តែងសេចក្តី"] === undefined) {
        result["តែងសេចក្តី"] = writingScore;
      }
    }

    // 1.3 ស្តាប់ និងនិយាយ ឬ សមត្ថភាពស្ដាប់ និងសមត្ថភាពនិយាយ
    const directListenSpeak = findRawVal([
      "ស្តាប់ និងនិយាយ",
      "ស្ដាប់ និងនិយាយ",
      "ស្តាប់-និយាយ",
      "ស្ដាប់-និយាយ",
      "listening and speaking",
      "speaking and listening",
    ]);
    if (directListenSpeak !== undefined) {
      result["ស្តាប់ និងនិយាយ"] = directListenSpeak;
    } else {
      const listenScore = findRawVal(
        ["សមត្ថភាពស្ដាប់", "សមត្ថភាពស្តាប់", "ស្ដាប់", "ស្តាប់", "listening"],
        ["និងនិយាយ", "-និយាយ", "និយាយ"]
      );
      const speakScore = findRawVal(
        ["សមត្ថភាពនិយាយ", "និយាយ", "speaking"],
        ["ស្តាប់", "ស្ដាប់"]
      );

      if (listenScore !== undefined && speakScore !== undefined) {
        result["ស្តាប់ និងនិយាយ"] = roundQuarter((listenScore + speakScore) / 2);
      } else if (listenScore !== undefined) {
        result["ស្តាប់ និងនិយាយ"] = roundQuarter(listenScore);
      } else if (speakScore !== undefined) {
        result["ស្តាប់ និងនិយាយ"] = roundQuarter(speakScore);
      }
    }

    // -------------------------------------------------------------
    // RULE 2: បំណិនទាំង៥ របស់គណិតវិទ្យា (ចំនួន, រង្វាស់រង្វាល់, ពីជគណិត, ស្ថិតិ, ធរណីមាត្រ)
    // ទាំង៥ ខាងលើនេះ បញ្ចូលទៅក្នុងតារាងតែ១ជួរឈរ(គណិតវិទ្យា) = សរុបពិន្ទុ / ចំនួនមុខវិជ្ជា
    // -------------------------------------------------------------
    const mathSubSkillScores: number[] = [];
    const numScore = findRawVal(["ចំនួន", "លេខ", "number"]);
    if (numScore !== undefined) mathSubSkillScores.push(numScore);

    const measureScore = findRawVal(["រង្វាស់រង្វាល់", "រង្វាស់", "measurement"]);
    if (measureScore !== undefined) mathSubSkillScores.push(measureScore);

    const algScore = findRawVal(["ពីជគណិត", "algebra"]);
    if (algScore !== undefined) mathSubSkillScores.push(algScore);

    const statScore = findRawVal(["ស្ថិតិ", "statistics", "stat"]);
    if (statScore !== undefined) mathSubSkillScores.push(statScore);

    const geomScore = findRawVal(["ធរណីមាត្រ", "geometry"]);
    if (geomScore !== undefined) mathSubSkillScores.push(geomScore);

    if (mathSubSkillScores.length > 0) {
      const mathSum = mathSubSkillScores.reduce((a, b) => a + b, 0);
      const mathAvg = roundQuarter(mathSum / mathSubSkillScores.length);
      result["គណិតវិទ្យា"] = mathAvg;
    } else {
      // Direct Math column fallback
      const directMath = findRawVal(["គណិតវិទ្យា", "គណិត", "math", "mathematics"]);
      if (directMath !== undefined) {
        result["គណិតវិទ្យា"] = roundQuarter(directMath);
      }
    }

    // -------------------------------------------------------------
    // RULE 3: វិទ្យាសាស្ត្រអនុវត្ត (នៅបឋមសិក្សា មានតែ១) -> "វិទ្យាសាស្ត្រ"
    // -------------------------------------------------------------
    const scienceScore = findRawVal([
      "វិទ្យាសាស្ត្រអនុវត្ត",
      "វិទ្យាសាស្ត្រ",
      "វិទ្យាសាស្រ្ត",
      "science",
      "applied science",
    ]);
    if (scienceScore !== undefined) {
      result["វិទ្យាសាស្ត្រ"] = scienceScore;
    }

    // -------------------------------------------------------------
    // RULE 4: សិក្សាសង្គម និង គេហវិទ្យា-អប់រំសិល្បះ
    // បើមានពិន្ទុទាំង២ យកទាំង២ជួរ តែបើមានតែ១ ត្រូវចូលក្នុងជួរឈរ ខាងដើម (សិក្សាសង្គម)
    // -------------------------------------------------------------
    const socialScore = findRawVal(["សិក្សាសង្គម", "សង្គម", "social studies", "social"]);
    const homeArtScore = findRawVal(
      [
        "គេហវិទ្យា-អប់រំសិល្បៈ",
        "គេហវិទ្យា-សិល្បៈ",
        "គេហ-សិល្បៈ",
        "គេហវិទ្យា",
        "អប់រំសិល្បៈ",
        "សិល្បៈ",
        "home economics",
        "art",
        "arts",
      ],
      ["សិក្សាសង្គម"]
    );

    if (socialScore !== undefined && homeArtScore !== undefined) {
      result["សិក្សាសង្គម"] = socialScore;
      result["គេហវិទ្យា-អប់រំសិល្បៈ"] = homeArtScore;
    } else if (socialScore !== undefined) {
      result["សិក្សាសង្គម"] = socialScore;
    } else if (homeArtScore !== undefined) {
      // If ONLY Home/Art is present, place in first column (សិក្សាសង្គម)
      result["សិក្សាសង្គម"] = homeArtScore;
    }

    // -------------------------------------------------------------
    // RULE 5: មុខវិជ្ជាបន្ថែមផ្សេងៗ (អប់រំកាយ-សុខភាព, បំណិនជីវិត, ភាសាបរទេស)
    // -------------------------------------------------------------
    const peScore = findRawVal([
      "អប់រំកាយ-សុខភាព",
      "អប់រំកាយ និងសុខភាព",
      "អប់រំកាយ",
      "កីឡា",
      "សុខភាព",
      "pe",
      "physical education",
    ]);
    if (peScore !== undefined) {
      result["អប់រំកាយ-សុខភាព"] = peScore;
    }

    const lifeSkillScore = findRawVal(["អប់រំបំណិនជីវិត", "បំណិនជីវិត", "បំណិន", "life skills"]);
    if (lifeSkillScore !== undefined) {
      result["អប់រំបំណិនជីវិត"] = lifeSkillScore;
    }

    const foreignLangScore = findRawVal(["ភាសាបរទេស", "អង់គ្លេស", "ភាសាអង់គ្លេស", "english", "foreign language"]);
    if (foreignLangScore !== undefined) {
      result["ភាសាបរទេស"] = foreignLangScore;
    }

    // Direct fallback for any exact matches from standard EXAM_SUBJECTS not yet picked up
    for (const item of rawKeyValues) {
      for (const subj of EXAM_SUBJECTS) {
        if (!result[subj] && (item.normKey === normalizeKhmerStr(subj) || item.origKey === subj)) {
          result[subj] = item.val;
        }
      }
    }

    // Clean all scores to roundQuarter (.00, .25, .50, .75)
    const finalCleanResult: Record<string, number> = {};
    for (const [k, v] of Object.entries(result)) {
      finalCleanResult[k] = roundQuarter(v);
    }

    return finalCleanResult;
  };

  // Generate Score Preview & Match Table
  const generatePreview = (input: any): void => {
    if (!students.length) {
      toast("⚠️ មិនមានបញ្ជីសិស្សក្នុងថ្នាក់ដើម្បីផ្គូផ្គងពិន្ទុទេ", "error");
      return;
    }

    // Build comprehensive lookup map
    const studentLookupMap: Record<string, Student> = {};
    students.forEach((s) => {
      const cleanLast = normalizeKhmerStr(s.lastName || "");
      const cleanFirst = normalizeKhmerStr(s.firstName || "");
      const cleanFull = normalizeKhmerStr(`${s.lastName || ""} ${s.firstName || ""}`);
      const cleanReverseFull = normalizeKhmerStr(`${s.firstName || ""} ${s.lastName || ""}`);

      if (cleanLast && cleanFirst) {
        studentLookupMap[`${cleanLast}_${cleanFirst}`] = s;
      }
      if (cleanFull) studentLookupMap[cleanFull] = s;
      if (cleanReverseFull) studentLookupMap[cleanReverseFull] = s;
      studentLookupMap[s.id] = s;
      if (s.code) studentLookupMap[normalizeKhmerStr(s.code)] = s;
    });

    const previewMap: Record<string, ExamScorePreviewRow> = {};
    students.forEach((s) => {
      previewMap[s.id] = {
        studentId: s.id,
        studentName: `${s.lastName || ""} ${s.firstName || ""}`.trim(),
        studentGender: s.gender || "",
        fileStudentName: "-",
        matchType: "unmatched",
        scores: {},
        subjectCount: 0,
      };
    });

    const unmatchedList: { rawName: string; scores: Record<string, number> }[] = [];

    // Parse Input
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
          d.fullName || d.full_name || d.name || d["ឈ្មោះ"] || d["គោត្តនាម និងនាម"] || d["គោត្តនាម-នាម"] || ""
        ).trim();
        const rawIdentifier = full || (ln && fn ? `${ln} ${fn}` : itemObj.key || `Row #${idx + 1}`);

        let matchedStudent: Student | undefined;
        let matchType: ExamScorePreviewRow["matchType"] = "unmatched";

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

        // Fallback by order index if row order matches students length
        if (!matchedStudent && typeof d["ល.រ"] === "number" && d["ល.រ"] >= 1 && d["ល.រ"] <= students.length) {
          const sByOrder = students[d["ល.រ"] - 1];
          if (sByOrder) {
            matchedStudent = sByOrder;
            matchType = "order_fallback";
          }
        }

        const scoresObj = extractSmartExamScores(d.scores || d);
        const subCount = Object.keys(scoresObj).length;

        if (matchedStudent) {
          previewMap[matchedStudent.id] = {
            studentId: matchedStudent.id,
            studentName: `${matchedStudent.lastName || ""} ${matchedStudent.firstName || ""}`.trim(),
            studentGender: matchedStudent.gender || "",
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
      // 2D Array
      const rawRows = input as string[][];
      if (rawRows.length >= 2) {
        let headerRowIdx = 0;
        for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
          const rowStr = rawRows[r].join(" ").toLowerCase();
          if (
            rowStr.includes("គោត្តនាម") ||
            rowStr.includes("នាម") ||
            rowStr.includes("ឈ្មោះ") ||
            rowStr.includes("អំណាន") ||
            rowStr.includes("គណិតវិទ្យា") ||
            rowStr.includes("ចំនួន") ||
            rowStr.includes("សមត្ថភាព")
          ) {
            headerRowIdx = r;
            break;
          }
        }

        const header = rawRows[headerRowIdx].map((h) => h.trim());
        const lastIdx = header.findIndex(
          (h) => h.includes("គោត្តនាម") && !h.includes("និងនាម") && !h.includes("-នាម")
        );
        const firstIdx = header.findIndex(
          (h) => (h.includes("នាម") || h.toLowerCase().includes("firstname")) && !h.includes("គោត្តនាម")
        );
        const fullIdx = header.findIndex(
          (h) =>
            h.includes("ឈ្មោះ") ||
            h.includes("គោត្តនាម និងនាម") ||
            h.includes("គោត្តនាម-នាម") ||
            h.toLowerCase().includes("fullname") ||
            h.toLowerCase().includes("name")
        );
        const idIdx = header.findIndex(
          (h) => h.toLowerCase() === "id" || h.toLowerCase() === "code" || h === "អត្តលេខ"
        );
        const rollIdx = header.findIndex((h) => h === "ល.រ" || h === "រៀង");

        const colScoreHeaders: { colIdx: number; colName: string }[] = [];
        header.forEach((hName, idx) => {
          if (idx === lastIdx || idx === firstIdx || idx === fullIdx || idx === idIdx) return;
          if (
            [
              "ល.រ",
              "រៀង",
              "gender",
              "ភេទ",
              "អាយុ",
              "age",
              "មធ្យមភាគ",
              "ចំណាត់ថ្នាក់",
              "និទ្ទេស",
              "លទ្ធផល",
              "ពិន្ទុប្រឡងសរុប",
              "ពិន្ទុសរុប",
              "ម.ប្រឡង",
              "ម.ប្រចាំខែ",
              "ម.ឆមាស",
            ].some((k) => hName.toLowerCase().includes(k))
          ) {
            return;
          }

          if (hName) {
            colScoreHeaders.push({ colIdx: idx, colName: hName });
          }
        });

        for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.every((c) => !c)) continue;

          const ln = lastIdx >= 0 ? row[lastIdx] || "" : "";
          const fn = firstIdx >= 0 ? row[firstIdx] || "" : "";
          const full = fullIdx >= 0 ? row[fullIdx] || "" : "";
          const idVal = idIdx >= 0 ? row[idIdx] || "" : "";
          const rollVal = rollIdx >= 0 ? parseInt(row[rollIdx] || "", 10) : NaN;
          const rawIdentifier = full || (ln && fn ? `${ln} ${fn}` : idVal || `ជួរទី ${r}`);

          let matchedStudent: Student | undefined;
          let matchType: ExamScorePreviewRow["matchType"] = "unmatched";

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
          if (!matchedStudent && !isNaN(rollVal) && rollVal >= 1 && rollVal <= students.length) {
            matchedStudent = students[rollVal - 1];
            matchType = "order_fallback";
          }

          // Build raw score dictionary for this row
          const rowRawDict: Record<string, number> = {};
          colScoreHeaders.forEach(({ colIdx, colName }) => {
            const valStr = row[colIdx];
            if (valStr !== undefined && valStr !== "") {
              const numVal = parseFloat(valStr);
              if (!isNaN(numVal) && numVal >= 0 && numVal <= 100) {
                rowRawDict[colName] = numVal;
              }
            }
          });

          // Extract smart mapped scores according to MoEYS standards
          const scoresObj = extractSmartExamScores(rowRawDict);
          const subCount = Object.keys(scoresObj).length;

          if (matchedStudent) {
            previewMap[matchedStudent.id] = {
              studentId: matchedStudent.id,
              studentName: `${matchedStudent.lastName || ""} ${matchedStudent.firstName || ""}`.trim(),
              studentGender: matchedStudent.gender || "",
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
      setLogMsg("⚠️ រកមិនឃើញឈ្មោះសិស្សដែលត្រូវគ្នាក្នុងឯកសារឡើយ (សូមផ្ទៀងផ្ទាត់ឈ្មោះ គោត្តនាម ឬប្រើ Template)");
      toast("⚠️ រកមិនឃើញឈ្មោះសិស្សត្រូវគ្នាទេ", "error");
    } else {
      setLogMsg(`🔍 បានផ្គូផ្គងសិស្ស ${matchedCount} / ${students.length} នាក់ ដោយជោគជ័យ!`);
      toast(`🔍 បានផ្គូផ្គងសិស្ស ${matchedCount} នាក់ សម្រាប់${semLabel}!`, "info");
    }
  };

  useEffect(() => {
    if (isOpen && initialJsonData) {
      generatePreview(initialJsonData);
    }
  }, [isOpen, initialJsonData]);

  if (!isOpen) return null;

  // Template XLSX Download for Semester Exam
  const handleDownloadExamTemplateXLSX = () => {
    if (!students.length) {
      toast("⚠️ ថ្នាក់នេះមិនទាន់មានសិស្សនៅឡើយទេ", "error");
      return;
    }
    const wb = XLSX.utils.book_new();
    const headers = ["ល.រ", "គោត្តនាម និងនាម", "ភេទ", ...EXAM_SUBJECTS];
    const rows: (string | number)[][] = [headers];

    students.forEach((s, idx) => {
      const rec = existingExamRecords[s.id] || { scores: {} };
      const subCols = EXAM_SUBJECTS.map((subj) => {
        const val = rec.scores?.[subj];
        return val !== undefined && val !== "" ? Number(val) : "";
      });
      const fullName = `${s.lastName || ""} ${s.firstName || ""}`.trim();
      rows.push([idx + 1, fullName, s.gender || "", ...subCols]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `ប្រឡង_${semesterId}`);
    XLSX.writeFile(wb, `exam_template_${semesterId}_ថ្នាក់_${className}.xlsx`);
    toast(`📥 បានទាញយកទម្រង់ប្រឡង ${semLabel} Excel (${students.length} សិស្ស)`, "success");
  };

  // Handle Score File Upload
  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogMsg("⏳ កំពុងអាន និងផ្ទៀងផ្ទាត់ឈ្មោះសិស្សក្នុង File...");
    try {
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        generatePreview(text);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        const rawRows = jsonRows.map((r) => r.map((c) => String(c ?? "").trim()));
        generatePreview(rawRows);
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
        generatePreview(rawRows);
      }
      e.target.value = "";
    } catch (err: any) {
      setLogMsg("❌ កំហុសពេលអាន File: " + err.message);
      toast("❌ " + err.message, "error");
      e.target.value = "";
    }
  };

  // Save to Firestore
  const handleConfirmSave = async () => {
    if (!scorePreviewList) return;
    const scoresByStudent: Record<string, Record<string, number | "">> = {};
    let savedCount = 0;

    scorePreviewList.forEach((row) => {
      if (row.matchType !== "unmatched" && row.subjectCount > 0) {
        scoresByStudent[row.studentId] = row.scores;
        savedCount++;
      }
    });

    if (savedCount === 0) {
      toast("⚠️ គ្មានពិន្ទុដែលត្រូវរក្សាទុកទេ", "error");
      return;
    }

    setIsProcessing(true);
    setLogMsg(`⏳ កំពុងរក្សាទុកពិន្ទុប្រឡង ${semLabel} ទៅ Firestore...`);
    try {
      await onImportExamScores(semesterId, scoresByStudent);
      setLogMsg(`✅ បានរក្សាទុកពិន្ទុប្រឡង ${semLabel} សិស្ស ${savedCount} នាក់ រួចរាល់! 🔥`);
      toast(`✅ រក្សាទុកពិន្ទុ ${semLabel} សិស្ស ${savedCount} នាក់ ជោគជ័យ!`, "success");
      setScorePreviewList(null);
      setUnmatchedFileRows([]);
      onClose();
    } catch (err: any) {
      setLogMsg("❌ " + err.message);
      toast("❌ " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-5 w-full max-w-2xl shadow-2xl border border-slate-100 animate-fade-in max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📥</span>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">
                នាំចូលពិន្ទុប្រឡង{semLabel} (Import Semester Exam Scores)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                ផ្គូផ្គង ១១ មុខវិជ្ជាប្រឡងឆមាសដោយផ្ទាល់ភ្នែក មុនបញ្ចូលទៅ Firestore
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-3.5 my-3 pr-1">
          {/* Active Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3.5 rounded-2xl shadow-inner flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <span>📘</span> នាំចូលពិន្ទុប្រឡង៖ ថ្នាក់ {className} — {semLabel}
              </div>
              <div className="text-[11px] text-blue-200 mt-0.5">
                សិស្សសរុបក្នុងថ្នាក់៖ <strong>{students.length} នាក់</strong> · ប្រឡង ១១ មុខវិជ្ជា
              </div>
            </div>
            <span className="text-[11px] bg-blue-700/80 border border-blue-500 px-3 py-1 rounded-full font-bold">
              {semLabel}
            </span>
          </div>

          {/* 🌟 SMART MAPPING RULES INFO */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border border-indigo-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="font-black text-indigo-950 flex items-center gap-1.5 text-xs">
              <span>🧠</span> ប្រព័ន្ធផ្គូផ្គង & គណនាពិន្ទុបំណិនស្វ័យប្រវត្តិតាមស្ដង់ដារ (Smart MoEYS Mapping)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-700">
              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100 space-y-1">
                <div className="font-bold text-indigo-900 flex items-center gap-1">
                  <span>📘</span> ភាសាខ្មែរ (បំណិនទាំង ៤)
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                  <li><strong>អំណាន</strong> ពី «សមត្ថភាពអាន»</li>
                  <li><strong>សរសេរតាមអាន / តែងសេចក្ដី</strong> ពី «សមត្ថភាពសរសេរ»</li>
                  <li><strong>ស្តាប់ និងនិយាយ</strong> មធ្យមភាគពី «សមត្ថភាពស្ដាប់» + «សមត្ថភាពនិយាយ»</li>
                </ul>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100 space-y-1">
                <div className="font-bold text-indigo-900 flex items-center gap-1">
                  <span>📐</span> គណិតវិទ្យា (បំណិនទាំង ៥)
                </div>
                <p className="text-slate-600">
                  បូកសរុបពិន្ទុ <strong>ចំនួន, រង្វាស់រង្វាល់, ពីជគណិត, ស្ថិតិ, ធរណីមាត្រ</strong> រួចចែករកមធ្យមភាគបញ្ចូលទៅជួរឈរតែមួយ <strong>«គណិតវិទ្យា»</strong>
                </p>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100 space-y-1">
                <div className="font-bold text-indigo-900 flex items-center gap-1">
                  <span>🔬</span> វិទ្យាសាស្ត្រអនុវត្ត
                </div>
                <p className="text-slate-600">
                  ផ្គូផ្គង «វិទ្យាសាស្ត្រអនុវត្ត» បញ្ចូលទៅក្នុងជួរឈរតែមួយ <strong>«វិទ្យាសាស្ត្រ»</strong>
                </p>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100 space-y-1">
                <div className="font-bold text-indigo-900 flex items-center gap-1">
                  <span>🌍</span> សិក្សាសង្គម & គេហ-សិល្បៈ
                </div>
                <p className="text-slate-600">
                  បើមានពិន្ទុទាំងពីរ យកទាំងពីរជួរឈរ · បើមានពិន្ទុតែមួយ នឹងបញ្ចូលទៅជួរឈរ <strong>«សិក្សាសង្គម»</strong> ស្វ័យប្រវត្តិ
                </p>
              </div>
            </div>
          </div>

          {/* 🌟 1. TEMPLATE DOWNLOAD */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-black text-blue-950 text-xs flex items-center gap-1.5">
                  <span>✨</span> ជំហានទី ១៖ ទាញយកទម្រង់ពិន្ទុប្រឡងឆមាស Excel (គំរូផ្លូវការ)
                </div>
                <div className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                  ទម្រង់ Excel មានឈ្មោះសិស្សទាំង <strong>{students.length} នាក់ក្នុងថ្នាក់ស្រាប់</strong> និង ១១ មុខវិជ្ជាប្រឡង (អំណាន, ស្តាប់-និយាយ, សរសេរតាមអាន, តែងសេចក្តី, គណិតវិទ្យា, វិទ្យាសាស្ត្រ, សិក្សាសង្គម...)។
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadExamTemplateXLSX}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-3 rounded-xl text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
            >
              <span>📊</span> ទាញយក Template Excel ប្រឡង{semLabel} (.xlsx)
            </button>
          </div>

          {/* 🌟 2. LIVE VERIFICATION PREVIEW TABLE */}
          {scorePreviewList ? (
            <div className="bg-white border-2 border-blue-400 rounded-2xl p-3.5 space-y-3 shadow-lg animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                    <span>🔍</span> ជំហានទី ២៖ ផ្ទៀងផ្ទាត់ការផ្គូផ្គងឈ្មោះ & ពិន្ទុប្រឡង
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

              {/* Badges */}
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

              {/* Match Table */}
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
                                {row.matchType === "exact_name" ? "✓ ត្រូវឈ្មោះ ១០០%" : "✓ តាមលំដាប់ ល.រ"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                - គ្មានពិន្ទុ
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {row.subjectCount > 0 ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[11px] font-mono">
                                  {row.subjectCount} មុខវិជ្ជា
                                </span>
                                <div className="flex flex-wrap justify-end gap-1 max-w-xs">
                                  {Object.entries(row.scores).map(([sub, score]) => (
                                    <span
                                      key={sub}
                                      className="inline-flex items-center gap-0.5 bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded text-[10px]"
                                      title={`${sub}: ${score}`}
                                    >
                                      <span className="font-medium text-slate-600 truncate max-w-[60px]">{sub}</span>:
                                      <strong className="font-mono text-blue-700">{fmtScore(score as number)}</strong>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Unmatched list if any */}
              {unmatchedFileRows.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-1 mb-1">
                    <span>⚠️</span> ឈ្មោះក្នុង File ដែលរកមិនឃើញក្នុងបញ្ជីថ្នាក់ {className} ៖
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
                  onClick={handleConfirmSave}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 text-xs rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isProcessing
                    ? "⏳ កំពុងរក្សាទុក..."
                    : `✅ ខ្ញុំបានផ្ទៀងផ្ទាត់ត្រឹមត្រូវ — រក្សាទុកពិន្ទុ ${semLabel} ទៅ Firestore 🔥`}
                </button>
              </div>
            </div>
          ) : (
            /* Upload options */
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
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                  <div className="text-3xl mb-1">📊</div>
                  <div className="text-xs font-bold text-slate-800">
                    ជ្រើសរើស File Excel ឬ JSON ពិន្ទុប្រឡងឆមាស
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ប្រព័ន្ធនឹងផ្ទៀងផ្ទាត់ឈ្មោះសិស្សស្វ័យប្រវត្តិមុនពេលរក្សាទុក
                  </div>
                  <label className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-6 rounded-xl text-xs cursor-pointer shadow-md shadow-blue-500/20 transition">
                    📥 ជ្រើសរើស File ពិន្ទុប្រឡង (Excel / CSV / JSON)...
                    <input
                      type="file"
                      accept=".json,.csv,.xlsx,.xls"
                      onChange={handleSelectFile}
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
                    placeholder={`បិទអត្ថបទ JSON ឬ CSV ពិន្ទុប្រឡងនៅទីនេះ...`}
                    rows={6}
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
                          toast("⚠️ សូមបញ្ចូលអត្ថបទពិន្ទុជាមុនសិន", "error");
                          return;
                        }
                        generatePreview(trimmed);
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2 text-xs rounded-xl shadow-md shadow-blue-500/20 transition"
                    >
                      🔍 ពិនិត្យ & ផ្ទៀងផ្ទាត់ពិន្ទុមុន Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Log Footer */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-medium shrink-0 flex items-center gap-2">
          <span>ℹ️</span> {logMsg}
        </div>
      </div>
    </div>
  );
};
