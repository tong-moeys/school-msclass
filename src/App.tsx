import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, getDoc, getDocs
} from "firebase/firestore";
import { auth, db, firestoreConsoleUrl } from "./lib/firebase";
import {
  CLASSES, MONTHS, SEMESTERS, INNER_TABS, BLANK_STUDENT, calcAge
} from "./lib/constants";
import { Student, ScoreMap, AttendanceMap, TeacherProfile, InvigilatorData, InnerTab, ReportType, SemesterExamRecord, DomainGrades } from "./types";
import { deriveDomainLetter, computeStudentSemesterFinalAvg } from "./lib/constants";

import { Auth } from "./components/Auth";
import { StudentTable } from "./components/StudentTable";
import { ScoresTable } from "./components/ScoresTable";
import { SemesterExamTable } from "./components/SemesterExamTable";
import { MasterSemesterAnnualTable } from "./components/MasterSemesterAnnualTable";
import { AttendanceTable } from "./components/AttendanceTable";
import { DetailTable } from "./components/DetailTable";
import { HonorRoll } from "./components/HonorRoll";
import { GradeAnalysis } from "./components/GradeAnalysis";
import { ReportsView } from "./components/ReportsView";

import { AddStudentModal } from "./components/Modals/AddStudentModal";
import { PhotoModal } from "./components/Modals/PhotoModal";
import { IOModal } from "./components/Modals/IOModal";
import { InvigilatorModal } from "./components/Modals/InvigilatorModal";
import { VerifyModal } from "./components/Modals/VerifyModal";
import { InactivityModal } from "./components/Modals/InactivityModal";
import { GmailModal } from "./components/GmailModal";
import { initGmailAuth } from "./lib/gmailService";
import { ScreenSwitcherBar, ScreenMode, Orientation } from "./components/ScreenSwitcherBar";
import { DeviceViewportWrapper } from "./components/DeviceViewportWrapper";

export default function App() {
  // Screen Mode Switcher State (app, web, pc, phone)
  const [screenMode, setScreenMode] = useState<ScreenMode>(() => {
    return (localStorage.getItem("plp_screen_mode") as ScreenMode) || "pc";
  });
  const [screenOrientation, setScreenOrientation] = useState<Orientation>("portrait");
  const [screenScale, setScreenScale] = useState<number>(1.0);
  const [isSwitcherCollapsed, setIsSwitcherCollapsed] = useState<boolean>(false);

  const handleSetScreenMode = (newMode: ScreenMode) => {
    setScreenMode(newMode);
    localStorage.setItem("plp_screen_mode", newMode);
    showToast(`🖥️ ប្ដូរទម្រង់អេក្រង់៖ ${newMode.toUpperCase()}`, "info");
  };

  // Auth & Teacher State
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // App Navigation & Class State
  const [selClass, setSelClass] = useState<string | null>(null);
  const [semester, setSemester] = useState<string>("s1");
  const [selMonth, setSelMonth] = useState<number>(3); // Default March / មីនា
  const [innerTab, setInnerTab] = useState<InnerTab>("info");
  const [reportType, setReportType] = useState<ReportType>("monthly");

  // Mode & Auto-save
  const [editMode, setEditMode] = useState<boolean>(false);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "error">("synced");

  // Firestore Realtime Data
  const [students, setStudents] = useState<Student[]>([]);
  const [scoresMap, setScoresMap] = useState<Record<string, ScoreMap>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceMap>>({});
  const [honorPhotos, setHonorPhotos] = useState<Record<string, string>>({});
  const [allMonthsScores, setAllMonthsScores] = useState<Record<string, Record<string, ScoreMap>>>({});

  // Semester Exam & Master Table Realtime Data
  const [examRecordsS1, setExamRecordsS1] = useState<Record<string, SemesterExamRecord>>({});
  const [examRecordsS2, setExamRecordsS2] = useState<Record<string, SemesterExamRecord>>({});
  const [annualRemarks, setAnnualRemarks] = useState<Record<string, string>>({});
  const [examSemester, setExamSemester] = useState<"s1" | "s2">("s1");

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg({ text: msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isIOModalOpen, setIsIOModalOpen] = useState(false);
  const [isInvigilatorModalOpen, setIsInvigilatorModalOpen] = useState(false);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [gmailModalParams, setGmailModalParams] = useState<{
    recipient?: string;
    subject?: string;
    htmlBody?: string;
  }>({});

  // Inactivity Auto-Logout State (30 minutes timeout for data security)
  const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 mins
  const INACTIVITY_WARNING_MS = 28 * 60 * 1000; // 28 mins
  const lastActivityRef = useRef<number>(Date.now());
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState(120);

  const handleAutoLogout = async () => {
    setShowInactivityWarning(false);
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Auto logout error:", e);
    } finally {
      setTeacher(null);
      setSelClass(null);
      showToast("🔒 បានចាកចេញដោយស្វ័យប្រវត្តិបន្ទាប់ពីអសកម្មភាព ៣០ នាទី ដើម្បីការពារទិន្នន័យសិស្ស!", "info");
    }
  };

  const handleManualLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Manual sign out error:", e);
    } finally {
      setTeacher(null);
      setSelClass(null);
      showToast("👋 បានចាកចេញពីគណនី", "info");
    }
  };

  const handleStayLoggedIn = () => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
  };

  // Activity detection event listeners
  useEffect(() => {
    if (!teacher) return;

    const handleUserActivity = () => {
      if (Date.now() - lastActivityRef.current > 1000) {
        lastActivityRef.current = Date.now();
        if (showInactivityWarning) {
          setShowInactivityWarning(false);
        }
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [teacher, showInactivityWarning]);

  // Periodic check for 30 minutes inactivity
  useEffect(() => {
    if (!teacher) {
      setShowInactivityWarning(false);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        handleAutoLogout();
      } else if (elapsed >= INACTIVITY_WARNING_MS) {
        const remainingSeconds = Math.max(0, Math.ceil((INACTIVITY_LIMIT_MS - elapsed) / 1000));
        setInactivitySecondsLeft(remainingSeconds);
        setShowInactivityWarning(true);
      } else {
        if (showInactivityWarning) {
          setShowInactivityWarning(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [teacher]);

  useEffect(() => {
    const unsub = initGmailAuth();
    return () => {
      if (unsub) unsub();
    };
  }, []);
  const [photoModalState, setPhotoModalState] = useState<{
    isOpen: boolean;
    studentId: string | null;
    name: string;
    gender: string;
  }>({ isOpen: false, studentId: null, name: "", gender: "ប្រុស" });

  const [verifyStudent, setVerifyStudent] = useState<Student | null>(null);

  // Invigilator State (local + sync)
  const [invigilatorData, setInvigilatorData] = useState<InvigilatorData>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("invigilatorData") || "null") || {
          building: "អគារ A",
          room: "01",
          shift: "ព្រឹក",
          sup1: { name: "", phone: "", sig: "" },
          sup2: { name: "", phone: "", sig: "" },
        }
      );
    } catch {
      return {
        building: "អគារ A",
        room: "01",
        shift: "ព្រឹក",
        sup1: { name: "", phone: "", sig: "" },
        sup2: { name: "", phone: "", sig: "" },
      };
    }
  });

  // 1. Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "teachers", user.uid));
          if (snap.exists()) {
            setTeacher({ uid: user.uid, ...snap.data() } as TeacherProfile);
          } else {
            setTeacher({
              uid: user.uid,
              email: user.email || "",
              fullName: user.email?.split("@")[0] || "គ្រូបង្រៀន",
              title: "លោក",
              phone: "",
              school: "សាលាបឋមសិក្សា",
              schoolID: "",
              level: "បឋមសិក្សា",
              province: "បន្ទាយមានជ័យ",
              district: "ភ្នំស្រុក",
              commune: "ស្ពានស្រែង",
              village: "រោគ",
              createdAt: Date.now(),
            });
          }
        } catch (e: any) {
          console.warn("Error/Offline fetching teacher profile, using default profile:", e);
          setTeacher({
            uid: user.uid,
            email: user.email || "",
            fullName: user.email?.split("@")[0] || "គ្រូបង្រៀន",
            title: "លោក",
            phone: "",
            school: "សាលាបឋមសិក្សា",
            schoolID: "",
            level: "បឋមសិក្សា",
            province: "បន្ទាយមានជ័យ",
            district: "ភ្នំស្រុក",
            commune: "ស្ពានស្រែង",
            village: "រោគ",
            createdAt: Date.now(),
          });
        }
      } else {
        setTeacher(null);
        setSelClass(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // 1b. Handle QR Code Verification Deep Link (e.g. ?verifyStudentId=xyz)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get("verifyStudentId");
    if (!verifyId) return;

    if (students.length > 0) {
      const found = students.find((s) => s.id === verifyId);
      if (found) {
        setVerifyStudent(found);
      } else {
        const name = params.get("name") || "សិស្ស";
        const nameParts = name.trim().split(" ");
        setVerifyStudent({
          id: verifyId,
          lastName: nameParts[0] || name,
          firstName: nameParts.slice(1).join(" ") || "",
          gender: "ប្រុស",
          dob: "",
        });
      }
    } else {
      const name = params.get("name") || "សិស្ស";
      const nameParts = name.trim().split(" ");
      setVerifyStudent({
        id: verifyId,
        lastName: nameParts[0] || name,
        firstName: nameParts.slice(1).join(" ") || "",
        gender: "ប្រុស",
        dob: "",
      });
    }
  }, [students]);

  // 2. Realtime Firestore Synchronization for Active Class
  useEffect(() => {
    if (!selClass) return;

    setSyncStatus("saving");

    // a) Realtime Students listener
    const studentsCol = collection(db, "classes", selClass, "students");
    const unsubStudents = onSnapshot(studentsCol, (snapshot) => {
      const list: Student[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Student);
      });
      list.sort((a, b) => {
        if (a.orderIndex !== undefined && b.orderIndex !== undefined && a.orderIndex !== b.orderIndex) {
          return a.orderIndex - b.orderIndex;
        }
        const cmpLast = (a.lastName || "").localeCompare(b.lastName || "", "km");
        if (cmpLast !== 0) return cmpLast;
        return (a.firstName || "").localeCompare(b.firstName || "", "km");
      });
      setStudents(list);
      setSyncStatus("synced");
    }, (err) => {
      console.error("Students sync error:", err);
      setSyncStatus("error");
    });

    // b) Realtime Honor Photos listener
    const photosCol = collection(db, "classes", selClass, "honorPhotos");
    const unsubPhotos = onSnapshot(photosCol, (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.photoUrl) map[docSnap.id] = d.photoUrl;
      });
      setHonorPhotos(map);
    });

    // c) Realtime S1 Exam Scores Listener
    const s1ExamCol = collection(db, "classes", selClass, "semesters", "s1", "examScores");
    const unsubS1Exam = onSnapshot(s1ExamCol, (snapshot) => {
      const map: Record<string, SemesterExamRecord> = {};
      snapshot.forEach((docSnap) => {
        map[docSnap.id] = docSnap.data() as SemesterExamRecord;
      });
      setExamRecordsS1(map);
    });

    // d) Realtime S2 Exam Scores Listener
    const s2ExamCol = collection(db, "classes", selClass, "semesters", "s2", "examScores");
    const unsubS2Exam = onSnapshot(s2ExamCol, (snapshot) => {
      const map: Record<string, SemesterExamRecord> = {};
      snapshot.forEach((docSnap) => {
        map[docSnap.id] = docSnap.data() as SemesterExamRecord;
      });
      setExamRecordsS2(map);
    });

    // e) Realtime Annual Remarks Listener
    const annualRemarksCol = collection(db, "classes", selClass, "annualRemarks");
    const unsubAnnualRemarks = onSnapshot(annualRemarksCol, (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.remark) map[docSnap.id] = d.remark;
      });
      setAnnualRemarks(map);
    });

    return () => {
      unsubStudents();
      unsubPhotos();
      unsubS1Exam();
      unsubS2Exam();
      unsubAnnualRemarks();
    };
  }, [selClass]);

  // 3. Realtime Scores & Attendance for Active Semester + Month
  useEffect(() => {
    if (!selClass || semester === "annual") return;

    // Scores Listener
    const scoresCol = collection(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "scores");
    const unsubScores = onSnapshot(scoresCol, (snapshot) => {
      const map: Record<string, ScoreMap> = {};
      snapshot.forEach((docSnap) => {
        map[docSnap.id] = docSnap.data().scores || {};
      });
      setScoresMap(map);
      setAllMonthsScores((prev) => ({
        ...prev,
        [`${semester}_${selMonth}`]: map,
      }));
    });

    // Attendance Listener
    const attCol = collection(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "attendance");
    const unsubAtt = onSnapshot(attCol, (snapshot) => {
      const map: Record<string, AttendanceMap> = {};
      snapshot.forEach((docSnap) => {
        map[docSnap.id] = docSnap.data().days || {};
      });
      setAttendanceMap(map);
    });

    return () => {
      unsubScores();
      unsubAtt();
    };
  }, [selClass, semester, selMonth]);

  // Fetch all months for detail breakdown if needed
  const fetchAllMonthsData = async (semId: string) => {
    if (!selClass) return;
    const cs = SEMESTERS.find((s) => s.id === semId);
    if (!cs) return;

    for (const mIdx of cs.months) {
      const key = `${semId}_${mIdx}`;
      try {
        const colRef = collection(db, "classes", selClass, "semesters", semId, "months", String(mIdx), "scores");
        const snap = await getDocs(colRef);
        const mScores: Record<string, ScoreMap> = {};
        snap.forEach((docSnap) => {
          mScores[docSnap.id] = docSnap.data().scores || {};
        });
        setAllMonthsScores((prev) => ({ ...prev, [key]: mScores }));
      } catch (err) {
        console.warn(`Could not fetch score data for month ${mIdx}:`, err);
      }
    }
  };

  // Firestore Write Operations
  const handleAddStudent = async (newStu: Omit<Student, "id">, photoDataUrl?: string) => {
    if (!selClass) return;
    setSyncStatus("saving");
    const stuRef = doc(collection(db, "classes", selClass, "students"));
    const ageVal = newStu.dob ? calcAge(newStu.dob) : newStu.age;
    const currentMaxOrder = students.reduce((max, s) => Math.max(max, s.orderIndex || 0, s.rollNo || 0), 0);
    const nextOrder = (newStu.orderIndex || newStu.rollNo) ?? (currentMaxOrder + 1);
    
    await setDoc(stuRef, {
      ...newStu,
      age: ageVal,
      orderIndex: nextOrder,
      rollNo: nextOrder,
      createdAt: newStu.createdAt || Date.now(),
    });

    if (photoDataUrl) {
      await setDoc(doc(db, "classes", selClass, "honorPhotos", stuRef.id), {
        photoUrl: photoDataUrl,
      });
    }
    setSyncStatus("synced");
    showToast("✅ បានបន្ថែមសិស្សក្នុង Firestore! 🔥", "success");
  };

  const handleUpdateStudent = async (id: string, updated: Partial<Student>) => {
    if (!selClass) return;
    setSyncStatus("saving");
    await setDoc(doc(db, "classes", selClass, "students", id), updated, { merge: true });
    setSyncStatus("synced");
  };

  const handleDeleteStudent = async (id: string) => {
    if (!selClass) return;
    const targetStu = students.find((s) => s.id === id);
    const stuName = targetStu ? `${targetStu.lastName || ""} ${targetStu.firstName || ""}`.trim() : "";
    if (!confirm(`តើអ្នកពិតជាចង់លុបសិស្ស ${stuName || "នេះ"} ចេញពីបញ្ជីថ្នាក់ ${selClass}?`)) return;
    setSyncStatus("saving");
    try {
      await deleteDoc(doc(db, "classes", selClass, "students", id));
      // Try cleaning up photo doc if exists
      try {
        await deleteDoc(doc(db, "classes", selClass, "honorPhotos", id));
      } catch {
        // ignore photo cleanup failure
      }
      setSyncStatus("synced");
      showToast(`🗑️ បានលុបសិស្ស ${stuName} ដោយជោគជ័យ`, "info");
    } catch (err: any) {
      setSyncStatus("error");
      showToast("❌ មិនអាចលុបបានទេ: " + err.message, "error");
    }
  };

  const handleUpdateScore = async (studentId: string, subject: string, value: number | "") => {
    if (!selClass || semester === "annual") return;
    setSyncStatus("saving");
    const docRef = doc(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "scores", studentId);
    const existing = scoresMap[studentId] || {};
    const updated = { ...existing, [subject]: value };
    await setDoc(docRef, { scores: updated }, { merge: true });
    setSyncStatus("synced");
  };

  // Exam Score Handlers
  const handleUpdateExamScore = async (semId: "s1" | "s2", studentId: string, subject: string, value: number | "") => {
    if (!selClass) return;
    setSyncStatus("saving");
    const docRef = doc(db, "classes", selClass, "semesters", semId, "examScores", studentId);
    const existingRec = (semId === "s1" ? examRecordsS1 : examRecordsS2)[studentId] || { scores: {} };
    const updatedScores = { ...(existingRec.scores || {}), [subject]: value };
    await setDoc(docRef, { scores: updatedScores }, { merge: true });
    setSyncStatus("synced");
  };

  const handleImportExamScores = async (
    semId: "s1" | "s2",
    scoresByStudent: Record<string, Record<string, number | "">>
  ) => {
    if (!selClass) return;
    setSyncStatus("saving");
    const targetRecords = semId === "s1" ? examRecordsS1 : examRecordsS2;
    for (const [studentId, newSubjScores] of Object.entries(scoresByStudent)) {
      const docRef = doc(db, "classes", selClass, "semesters", semId, "examScores", studentId);
      const existingRec = targetRecords[studentId] || { scores: {} };
      const mergedScores = { ...(existingRec.scores || {}), ...newSubjScores };
      await setDoc(docRef, { scores: mergedScores }, { merge: true });
    }
    setSyncStatus("synced");
  };

  const handleUpdateExamDomain = async (semId: "s1" | "s2", studentId: string, domainKey: keyof DomainGrades, value: string) => {
    if (!selClass) return;
    setSyncStatus("saving");
    const docRef = doc(db, "classes", selClass, "semesters", semId, "examScores", studentId);
    const existingRec = (semId === "s1" ? examRecordsS1 : examRecordsS2)[studentId] || { domains: {} };
    const updatedDomains = { ...(existingRec.domains || {}), [domainKey]: value };
    await setDoc(docRef, { domains: updatedDomains }, { merge: true });
    setSyncStatus("synced");
  };

  const handleUpdateExamRemark = async (semId: "s1" | "s2", studentId: string, remark: string) => {
    if (!selClass) return;
    setSyncStatus("saving");
    const docRef = doc(db, "classes", selClass, "semesters", semId, "examScores", studentId);
    await setDoc(docRef, { remarks: remark }, { merge: true });
    setSyncStatus("synced");
  };

  const handleAutoPopulateDomains = async (semId: "s1" | "s2") => {
    if (!selClass || !students.length) return;
    setSyncStatus("saving");
    const targetMap = semId === "s1" ? examRecordsS1 : examRecordsS2;
    const studentScoresMap: Record<string, ScoreMap> = {};
    students.forEach((s) => {
      studentScoresMap[s.id] = targetMap[s.id]?.scores || {};
    });

    for (const s of students) {
      const semFinalAvg = computeStudentSemesterFinalAvg(s.id, semId, allMonthsScores, studentScoresMap);
      const letter = deriveDomainLetter(semFinalAvg);
      const docRef = doc(db, "classes", selClass, "semesters", semId, "examScores", s.id);
      await setDoc(
        docRef,
        {
          domains: {
            knowledge: letter,
            skills: letter,
            values: letter,
            participation: letter,
          },
        },
        { merge: true }
      );
    }
    setSyncStatus("synced");
    showToast(`⚡ បានបំពេញនិទ្ទេសស្វ័យប្រវត្តិសម្រាប់ ${semId === "s1" ? "ឆមាសទី១" : "ឆមាសទី២"} រួចរាល់!`, "success");
  };

  const handleUpdateAnnualRemark = async (studentId: string, remark: string) => {
    if (!selClass) return;
    setSyncStatus("saving");
    const docRef = doc(db, "classes", selClass, "annualRemarks", studentId);
    await setDoc(docRef, { remark }, { merge: true });
    setSyncStatus("synced");
  };

  const handleToggleAttendance = async (studentId: string, day: number) => {
    if (!selClass || semester === "annual") return;
    setSyncStatus("saving");
    const docRef = doc(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "attendance", studentId);
    const existing = attendanceMap[studentId] || {};
    const cur = existing[day] || "";
    const nxt = cur === "" ? "P" : cur === "P" ? "A" : "";
    const updated = { ...existing, [day]: nxt };
    await setDoc(docRef, { days: updated }, { merge: true });
    setSyncStatus("synced");
  };

  const handleSavePhoto = async (studentId: string, photoUrl: string | null) => {
    if (!selClass) return;
    setSyncStatus("saving");
    const photoRef = doc(db, "classes", selClass, "honorPhotos", studentId);
    if (photoUrl) {
      await setDoc(photoRef, { photoUrl });
    } else {
      await deleteDoc(photoRef);
    }
    setSyncStatus("synced");
  };

  const handleImportStudents = async (stus: Omit<Student, "id">[], targetClass?: string) => {
    const destClass = targetClass || selClass;
    if (!destClass) return;
    setSyncStatus("saving");
    const startOrder = destClass === selClass ? students.length : 0;
    for (let i = 0; i < stus.length; i++) {
      const stu = stus[i];
      const ref = doc(collection(db, "classes", destClass, "students"));
      const assignedOrder = stu.orderIndex || stu.rollNo || (startOrder + i + 1);
      await setDoc(ref, {
        ...stu,
        orderIndex: assignedOrder,
        rollNo: assignedOrder,
        createdAt: stu.createdAt || (Date.now() + i),
      });
    }
    setSyncStatus("synced");
    if (selClass !== destClass) {
      setSelClass(destClass);
      showToast(`✅ បាននាំចូលសិស្ស ${stus.length} នាក់ ទៅកាន់ ថ្នាក់ ${destClass}!`, "success");
    } else {
      showToast(`✅ បាននាំចូលសិស្ស ${stus.length} នាក់ រួចរាល់!`, "success");
    }
  };

  const handleImportScores = async (newScoresMap: Record<string, ScoreMap>) => {
    if (!selClass || semester === "annual") return;
    setSyncStatus("saving");
    for (const [sid, scoreObj] of Object.entries(newScoresMap)) {
      const docRef = doc(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "scores", sid);
      await setDoc(docRef, { scores: scoreObj }, { merge: true });
    }
    setSyncStatus("synced");
  };

  const handleSaveCoreGrades = async () => {
    if (!selClass || !students.length) return;
    setSyncStatus("saving");
    for (const s of students) {
      const khRaw = ["សមត្ថភាពស្ដាប់", "សមត្ថភាពអាន", "សមត្ថភាពនិយាយ", "សមត្ថភាពសរសេរ"].map((subj) => scoresMap[s.id]?.[subj]);
      const mtRaw = ["ចំនួន", "រង្វាស់រង្វាល់", "ពីជគណិត", "ធរណីមាត្រ", "ស្ថិតិ"].map((subj) => scoresMap[s.id]?.[subj]);

      const docRef = doc(db, "classes", selClass, "semesters", semester, "months", String(selMonth), "coreGrades", s.id);
      await setDoc(docRef, {
        khmerComponents: khRaw,
        mathComponents: mtRaw,
        savedAt: new Date().toISOString(),
      });
    }
    setSyncStatus("synced");
    showToast("💾 រក្សាទុកនិទ្ទេសគោលក្នុង Firestore រួចរាល់! 🔥");
  };

  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold text-xs">⏳ កំពុងភ្ជាប់ទៅកាន់ Firebase...</p>
      </div>
    );
  }

  if (!teacher || !selClass) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950">
        <ScreenSwitcherBar
          mode={screenMode}
          setMode={handleSetScreenMode}
          orientation={screenOrientation}
          setOrientation={setScreenOrientation}
          scale={screenScale}
          setScale={setScreenScale}
          isCollapsed={isSwitcherCollapsed}
          setIsCollapsed={setIsSwitcherCollapsed}
        />
        <DeviceViewportWrapper
          mode={screenMode}
          orientation={screenOrientation}
          scale={screenScale}
        >
          <Auth
            teacher={teacher}
            setTeacher={setTeacher}
            onSelectClass={(cls) => {
              setSelClass(cls);
              showToast(`📂 ថ្នាក់ ${cls} - ភ្ជាប់ទៅ Firestore 🔥`, "info");
            }}
            toast={showToast}
          />
        </DeviceViewportWrapper>
      </div>
    );
  }

  const curSem = SEMESTERS.find((s) => s.id === semester) || SEMESTERS[0];
  const totalStudents = students.length;
  const maleCount = students.filter((s) => s.gender === "ប្រុស").length;
  const femaleCount = students.filter((s) => s.gender === "ស្រី").length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950">
      <ScreenSwitcherBar
        mode={screenMode}
        setMode={handleSetScreenMode}
        orientation={screenOrientation}
        setOrientation={setScreenOrientation}
        scale={screenScale}
        setScale={setScreenScale}
        isCollapsed={isSwitcherCollapsed}
        setIsCollapsed={setIsSwitcherCollapsed}
      />
      <DeviceViewportWrapper
        mode={screenMode}
        orientation={screenOrientation}
        scale={screenScale}
      >
        <div className="flex flex-col min-h-screen bg-slate-100 font-sans text-slate-800">
          {/* Toast Notification */}
          {toastMsg && (
            <div
              className={`fixed top-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-2xl z-50 animate-bounce ${
                toastMsg.type === "error"
                  ? "bg-red-600"
                  : toastMsg.type === "info"
                  ? "bg-blue-600"
                  : "bg-emerald-600"
              }`}
            >
              {toastMsg.text}
            </div>
          )}

          {/* Header Bar */}
          <header className="bg-slate-900 text-white px-2 py-1 flex items-center justify-between gap-1.5 no-print shadow-md text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-[11px] font-extrabold shrink-0">
                🎓
              </div>
              <div className="min-w-0 flex items-center gap-1.5">
                <h1 className="font-black text-xs text-white leading-tight truncate">
                  PLP ២០២៦
                </h1>
                <span className="text-slate-400">·</span>
                <span className="text-[10px] text-slate-300 font-medium truncate max-w-[130px] sm:max-w-none">
                  {teacher.title} {teacher.fullName} ({teacher.school})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
              {/* Quick Screen Mode Switcher in Header */}
              <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded px-1 py-0.5 gap-0.5 text-[9px] font-bold">
                <span className="text-slate-400 text-[8px] px-0.5 hidden xl:inline">Screen:</span>
                {(["pc", "web", "app", "phone"] as ScreenMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSetScreenMode(m)}
                    className={`px-1.5 py-0.5 rounded uppercase font-extrabold transition ${
                      screenMode === m
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                    title={`ប្ដូរទម្រង់អេក្រង់ ${m.toUpperCase()}`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 rounded px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-1 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Realtime
              </span>

              <a
                href={firestoreConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/80 rounded px-1.5 py-0.5 text-[9px] font-black transition flex items-center gap-1 shadow-xs whitespace-nowrap active:scale-95"
                title="ចូលទៅកាន់ Firebase Firestore Console (បើកក្នុង Tab ថ្មី)"
              >
                <span>🔥</span>
                <span>Firestore</span>
                <span className="text-[8px] opacity-75">↗</span>
              </a>

              <button
                onClick={() => {
                  setGmailModalParams({});
                  setIsGmailModalOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white border border-red-500 rounded px-1.5 py-0.5 text-[9px] font-bold transition flex items-center gap-0.5 shadow-xs whitespace-nowrap"
                title="ប្រព័ន្ធអ៊ីមែល Gmail"
              >
                ✉️ Gmail
              </button>

              <button
                onClick={() => setSelClass(null)}
                className="bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-800 rounded px-1.5 py-0.5 text-[9px] font-bold transition whitespace-nowrap"
                title="ប្តូរថ្នាក់"
              >
                ⛔️ ប្តូរថ្នាក់
              </button>

              <button
                onClick={handleManualLogout}
                className="bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded px-1.5 py-0.5 text-[9px] font-bold transition flex items-center gap-0.5 shadow-xs whitespace-nowrap"
                title="ចាកចេញពីប្រព័ន្ធ (Sign Out)"
              >
                🚪 ចាកចេញ
              </button>
            </div>
          </header>

      {/* Ultra-Compact Dropdowns & Controls Toolbar (ទំហំតូចបំផុត) */}
      <div className="bg-slate-100 border-b border-slate-300 px-2 py-1 flex flex-wrap items-center justify-between gap-1.5 no-print text-[11px]">
        {/* Dropdown Selectors Group */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Class Dropdown */}
          <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded px-1 py-0.5 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold">🏫</span>
            <select
              value={selClass || ""}
              onChange={(e) => {
                const newCls = e.target.value;
                setSelClass(newCls);
                localStorage.setItem("selectedClass", newCls);
                showToast(`📂 ថ្នាក់ ${newCls}`, "info");
              }}
              className="bg-transparent font-black text-blue-900 text-[11px] focus:outline-none cursor-pointer py-0 pr-1"
              title="ជ្រើសរើសថ្នាក់"
            >
              {CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  ថ្នាក់ {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Dropdown */}
          <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded px-1 py-0.5 shadow-2xs">
            <span className="text-[10px] text-slate-500 font-bold">📚</span>
            <select
              value={semester}
              onChange={(e) => {
                const newSem = e.target.value;
                setSemester(newSem);
                const targetSem = SEMESTERS.find((s) => s.id === newSem);
                if (targetSem && targetSem.months.length > 0) {
                  if (!targetSem.months.includes(selMonth)) {
                    setSelMonth(targetSem.months[0]);
                  }
                }
                showToast(`📚 ${targetSem?.label || newSem}`, "info");
              }}
              className="bg-transparent font-bold text-slate-800 text-[11px] focus:outline-none cursor-pointer py-0 pr-1"
              title="ជ្រើសរើសឆមាស"
            >
              {SEMESTERS.map((sm) => (
                <option key={sm.id} value={sm.id}>
                  {sm.label}
                </option>
              ))}
            </select>
          </div>

          {/* Month Dropdown */}
          {semester !== "annual" && (
            <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded px-1 py-0.5 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-bold">📅</span>
              <select
                value={selMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setSelMonth(m);
                  showToast(`📅 ខែ${MONTHS[m]}`, "info");
                }}
                className="bg-transparent font-bold text-slate-800 text-[11px] focus:outline-none cursor-pointer py-0 pr-1"
                title="ជ្រើសរើសខែ"
              >
                {curSem.months.map((mIdx) => (
                  <option key={mIdx} value={mIdx}>
                    ខែ{MONTHS[mIdx]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tab / Module Dropdown */}
          <div className="flex items-center gap-0.5 bg-white border border-blue-300 rounded px-1 py-0.5 shadow-2xs">
            <span className="text-[10px] text-blue-600 font-bold">📑</span>
            <select
              value={innerTab}
              onChange={(e) => {
                const t = e.target.value as InnerTab;
                setInnerTab(t);
                if (
                  t === "detail" ||
                  t === "report" ||
                  t === "school_report" ||
                  t === "semester_exam" ||
                  t === "master_table"
                ) {
                  fetchAllMonthsData("s1");
                  fetchAllMonthsData("s2");
                }
              }}
              className="bg-transparent font-black text-blue-700 text-[11px] focus:outline-none cursor-pointer py-0 pr-1"
              title="ជ្រើសរើសផ្ទាំងទិន្នន័យ"
            >
              {INNER_TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.icon} {tab.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Side: Stats & Micro Actions */}
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <div className="bg-slate-200/80 border border-slate-300 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
            <span>👥 {totalStudents}</span>
            <span className="text-slate-400">|</span>
            <span className="text-blue-700">👨 {maleCount}</span>
            <span className="text-slate-400">|</span>
            <span className="text-pink-700">👩 {femaleCount}</span>
          </div>

          {editMode ? (
            <button
              onClick={() => {
                setEditMode(false);
                showToast("✅ បានរក្សាទុកការកែប្រែក្នុង Firestore!");
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-1.5 py-0.5 rounded shadow-xs transition whitespace-nowrap"
            >
              💾 Save
            </button>
          ) : (
            <button
              onClick={() => {
                setEditMode(true);
                showToast("✏️ ម៉ូតកែសម្រួល (Edit Mode) - រាល់ការកែប្រែនឹង Sync ដោយស្វ័យប្រវត្តិ", "info");
              }}
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-[10px] px-1.5 py-0.5 rounded transition whitespace-nowrap"
            >
              ✏️ កែ
            </button>
          )}

          {innerTab === "info" && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-1.5 py-0.5 rounded shadow-xs transition whitespace-nowrap"
            >
              ➕ សិស្ស
            </button>
          )}

          <button
            onClick={() => setIsIOModalOpen(true)}
            className="bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold text-[10px] px-1.5 py-0.5 rounded transition whitespace-nowrap"
          >
            📦 IO Excel
          </button>
        </div>
      </div>

      {/* Edit Mode Warning Banner */}
      {editMode && (
        <div className="bg-amber-50 border-b border-amber-300 text-amber-900 px-2 py-0.5 text-[10px] font-bold no-print flex justify-between items-center gap-2">
          <span className="truncate">⚠️ ម៉ូតកែសម្រួលសកម្ម — រាល់ការកែប្រែ Sync ទៅកាន់ Firestore Realtime!</span>
          <button
            onClick={() => setEditMode(false)}
            className="bg-amber-200 hover:bg-amber-300 px-1 py-0.2 rounded text-[9px] shrink-0"
          >
            បិទម៉ូតកែ
          </button>
        </div>
      )}

      {/* Ultra-Compact Quick Tab Strip (រៀបទំហំតូចបំផុត) */}
      <div className="bg-white border-b border-slate-200 px-1.5 py-0.5 flex items-center gap-0.5 overflow-x-auto no-print scrollbar-thin">
        {INNER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setInnerTab(tab.id as InnerTab);
              if (
                tab.id === "detail" ||
                tab.id === "report" ||
                tab.id === "school_report" ||
                tab.id === "semester_exam" ||
                tab.id === "master_table"
              ) {
                fetchAllMonthsData("s1");
                fetchAllMonthsData("s2");
              }
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
              innerTab === tab.id
                ? "bg-blue-600 text-white shadow-2xs font-black"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Display */}
      <main className="flex-1 overflow-y-auto">
        {innerTab === "info" && (
          <StudentTable
            students={students}
            editMode={editMode}
            honorPhotos={honorPhotos}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
            onTriggerAutoSave={() => setSyncStatus("saving")}
          />
        )}

        {innerTab === "scores" && (
          <ScoresTable
            students={students}
            scoresMap={scoresMap}
            editMode={editMode}
            onUpdateScore={handleUpdateScore}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
            honorPhotos={honorPhotos}
          />
        )}

        {innerTab === "semester_exam" && (
          <SemesterExamTable
            students={students}
            semesterId={examSemester}
            onSemesterChange={(semId) => setExamSemester(semId)}
            examRecords={examSemester === "s1" ? examRecordsS1 : examRecordsS2}
            allMonthsScores={allMonthsScores}
            editMode={editMode}
            onUpdateExamScore={(sid, subj, val) => handleUpdateExamScore(examSemester, sid, subj, val)}
            onUpdateExamDomain={(sid, domKey, val) => handleUpdateExamDomain(examSemester, sid, domKey, val)}
            onUpdateExamRemark={(sid, rem) => handleUpdateExamRemark(examSemester, sid, rem)}
            onAutoPopulateDomains={handleAutoPopulateDomains}
            onImportExamScores={handleImportExamScores}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
            honorPhotos={honorPhotos}
            schoolName={teacher.school}
            teacherName={teacher.fullName}
            className={selClass || ""}
            toast={showToast}
          />
        )}

        {innerTab === "master_table" && (
          <MasterSemesterAnnualTable
            students={students}
            allMonthsScores={allMonthsScores}
            examRecordsS1={examRecordsS1}
            examRecordsS2={examRecordsS2}
            annualRemarks={annualRemarks}
            editMode={editMode}
            onUpdateExamScore={handleUpdateExamScore}
            onUpdateExamDomain={handleUpdateExamDomain}
            onUpdateAnnualRemark={handleUpdateAnnualRemark}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
            honorPhotos={honorPhotos}
            schoolName={teacher.school}
            teacherName={teacher.fullName}
            className={selClass || ""}
          />
        )}

        {innerTab === "attendance" && (
          <AttendanceTable
            students={students}
            attendanceMap={attendanceMap}
            editMode={editMode}
            onToggleAttendance={handleToggleAttendance}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
            honorPhotos={honorPhotos}
          />
        )}

        {innerTab === "detail" && (
          <DetailTable
            students={students}
            semesterId={semester !== "annual" ? semester : "s1"}
            onSemesterChange={(sId) => {
              setSemester(sId);
              fetchAllMonthsData(sId);
            }}
            allMonthsScores={allMonthsScores}
          />
        )}

        {(innerTab === "report" || innerTab === "school_report" || innerTab === "candidate" || innerTab === "certificate") && (
          <ReportsView
            students={students}
            scoresMap={scoresMap}
            attendanceMap={attendanceMap}
            honorPhotos={honorPhotos}
            selClass={selClass}
            semester={semester}
            selMonth={selMonth}
            teacher={teacher}
            invigilatorData={invigilatorData}
            reportType={
              innerTab === "candidate"
                ? "candidate"
                : innerTab === "certificate"
                ? "certificate"
                : reportType
            }
            activeCategory={innerTab === "school_report" ? "school" : "class"}
            onCategoryChange={(cat) => {
              if (cat === "school") setInnerTab("school_report");
              else if (cat === "class") setInnerTab("report");
            }}
            onReportTypeChange={setReportType}
            onOpenInvigilatorModal={() => setIsInvigilatorModalOpen(true)}
            onOpenVerifyModal={(s) => setVerifyStudent(s)}
            onSaveCoreGrades={handleSaveCoreGrades}
            toast={showToast}
            allMonthsScores={allMonthsScores}
            examRecordsS1={examRecordsS1}
            examRecordsS2={examRecordsS2}
            annualRemarks={annualRemarks}
            onUpdateExamScore={handleUpdateExamScore}
            onUpdateExamDomain={handleUpdateExamDomain}
            onUpdateExamRemark={handleUpdateExamRemark}
            onAutoPopulateDomains={handleAutoPopulateDomains}
            onImportExamScores={handleImportExamScores}
            onUpdateAnnualRemark={handleUpdateAnnualRemark}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
            onOpenGmailModal={(params) => {
              if (params) setGmailModalParams(params);
              else setGmailModalParams({});
              setIsGmailModalOpen(true);
            }}
          />
        )}

        {innerTab === "honor" && (
          <HonorRoll
            students={students}
            scoresMap={scoresMap}
            honorPhotos={honorPhotos}
            selClass={selClass}
            semester={semester}
            selMonth={selMonth}
            teacher={teacher}
            onOpenPhotoModal={(id, name, gender) =>
              setPhotoModalState({ isOpen: true, studentId: id, name, gender })
            }
          />
        )}

        {innerTab === "gradeanalysis" && (
          <GradeAnalysis
            students={students}
            scoresMap={scoresMap}
            selClass={selClass}
            semester={semester}
            selMonth={selMonth}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 px-4 py-2 flex flex-wrap items-center justify-between text-xs no-print border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span>🔥 {teacher.fullName}</span>
          <span>·</span>
          <span>
            ថ្នាក់ {selClass} · {curSem.label} {semester !== "annual" && `· ខែ${MONTHS[selMonth]}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-0.5 rounded-full">
            <span className="text-white text-[11px] font-bold">⚡ Auto-save</span>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
            />
          </div>

          <span
            className={`font-extrabold ${
              syncStatus === "saving"
                ? "text-blue-400 animate-pulse"
                : syncStatus === "error"
                ? "text-red-400"
                : "text-emerald-400"
            }`}
          >
            {syncStatus === "saving"
              ? "⚡ Auto-saving..."
              : syncStatus === "error"
              ? "❌ Sync Error"
              : "✅ Synced Firestore"}
          </span>
        </div>
      </footer>

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStudent={handleAddStudent}
        toast={showToast}
      />

      <PhotoModal
        isOpen={photoModalState.isOpen}
        studentId={photoModalState.studentId}
        studentName={photoModalState.name}
        studentGender={photoModalState.gender}
        currentPhoto={photoModalState.studentId ? honorPhotos[photoModalState.studentId] || null : null}
        onClose={() =>
          setPhotoModalState({ isOpen: false, studentId: null, name: "", gender: "ប្រុស" })
        }
        onSavePhoto={handleSavePhoto}
        toast={showToast}
      />

      <IOModal
        isOpen={isIOModalOpen}
        onClose={() => setIsIOModalOpen(false)}
        students={students}
        scoresMap={scoresMap}
        attendanceMap={attendanceMap}
        selClass={selClass}
        semester={semester}
        selMonth={selMonth}
        onImportStudents={handleImportStudents}
        onImportScores={handleImportScores}
        examRecordsS1={examRecordsS1}
        examRecordsS2={examRecordsS2}
        onImportExamScores={handleImportExamScores}
        toast={showToast}
      />

      <InvigilatorModal
        isOpen={isInvigilatorModalOpen}
        onClose={() => setIsInvigilatorModalOpen(false)}
        invigilatorData={invigilatorData}
        onSave={(data) => {
          setInvigilatorData(data);
          try {
            localStorage.setItem("invigilatorData", JSON.stringify(data));
          } catch {}
        }}
        toast={showToast}
      />

      <VerifyModal
        isOpen={!!verifyStudent}
        student={verifyStudent}
        selClass={selClass}
        schoolName={teacher.school}
        students={students}
        scoresMap={scoresMap}
        onClose={() => setVerifyStudent(null)}
      />

      <GmailModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        defaultRecipient={gmailModalParams.recipient}
        defaultSubject={gmailModalParams.subject}
        defaultHtmlBody={gmailModalParams.htmlBody}
        students={students}
        toast={showToast}
      />

      <InactivityModal
        isOpen={showInactivityWarning}
        secondsRemaining={inactivitySecondsLeft}
        onStayLoggedIn={handleStayLoggedIn}
        onLogoutNow={handleAutoLogout}
      />

      <iframe id="printFrame" className="hidden" title="Print Frame" />
        </div>
      </DeviceViewportWrapper>
    </div>
  );
}
