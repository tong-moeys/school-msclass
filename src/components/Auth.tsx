import React, { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, firestoreConsoleUrl } from "../lib/firebase";
import { CLASSES } from "../lib/constants";
import { TeacherProfile } from "../types";

interface AuthProps {
  teacher: TeacherProfile | null;
  setTeacher: (t: TeacherProfile | null) => void;
  onSelectClass: (cls: string) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const Auth: React.FC<AuthProps> = ({ teacher, setTeacher, onSelectClass, toast }) => {
  const [view, setView] = useState<"login" | "reg1" | "reg2" | "reg3" | "classes">(
    teacher ? "classes" : "login"
  );
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");

  // Reg Step 1
  const [r1Last, setR1Last] = useState("");
  const [r1First, setR1First] = useState("");
  const [r1Title, setR1Title] = useState("លោក");
  const [r1Email, setR1Email] = useState("");
  const [r1Pass, setR1Pass] = useState("");
  const [r1Phone, setR1Phone] = useState("");

  // Reg Step 2
  const [r2School, setR2School] = useState("");
  const [r2SchoolID, setR2SchoolID] = useState("");
  const [r2Level, setR2Level] = useState("បឋមសិក្សា");

  // Reg Step 3
  const [r3Province, setR3Province] = useState("បន្ទាយមានជ័យ");
  const [r3District, setR3District] = useState("ភ្នំស្រុក");
  const [r3Commune, setR3Commune] = useState("ស្ពានស្រែង");
  const [r3Village, setR3Village] = useState("រោគ");
  const [regErr, setRegErr] = useState("");

  const handleLogin = async () => {
    if (!loginEmail || !loginPass) {
      toast("⚠️ សូមបំពេញ Email និង Password!", "error");
      return;
    }
    setLoading(true);
    setLoginErr("");
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPass);
      const snap = await getDoc(doc(db, "teachers", cred.user.uid));
      if (snap.exists()) {
        const profile = { uid: cred.user.uid, ...snap.data() } as TeacherProfile;
        setTeacher(profile);
      } else {
        const fallback: TeacherProfile = {
          uid: cred.user.uid,
          email: cred.user.email || "",
          fullName: cred.user.email?.split("@")[0] || "គ្រូបង្រៀន",
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
        };
        setTeacher(fallback);
      }
      setView("classes");
      toast("✅ ចូលប្រើប្រាស់បានជោគជ័យ! 🔥", "success");
    } catch (e: any) {
      setLoginErr("❌ " + e.message);
      toast("❌ " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegFinish = async () => {
    const fullName = `${r1Last.trim()} ${r1First.trim()}`;
    const profile: Omit<TeacherProfile, "uid"> = {
      fullName,
      title: r1Title,
      phone: r1Phone.trim(),
      email: r1Email.trim(),
      school: r2School.trim() || "សាលាបឋមសិក្សា",
      schoolID: r2SchoolID.trim(),
      level: r2Level,
      province: r3Province,
      district: r3District.trim(),
      commune: r3Commune.trim(),
      village: r3Village.trim(),
      createdAt: Date.now(),
    };
    setRegErr("");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, r1Email.trim(), r1Pass);
      await setDoc(doc(db, "teachers", cred.user.uid), profile);
      const fullTeacher: TeacherProfile = { uid: cred.user.uid, ...profile };
      setTeacher(fullTeacher);
      setView("classes");
      toast("✅ ចុះឈ្មោះបានជោគជ័យ! 🔥", "success");
    } catch (e: any) {
      setRegErr("❌ " + e.message);
      toast("❌ " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setTeacher(null);
    setView("login");
    toast("👋 ចាកចេញ", "info");
  };

  if (teacher && view === "classes") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in border border-slate-100">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl text-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              🎓
            </div>
          </div>
          <h2 className="text-center text-xl font-extrabold text-indigo-950 mb-1">
            សម្រាប់បញ្ចូលពិន្ទុតេស្ត (PLP2026)
          </h2>
          <p className="text-center text-xs text-slate-500 mb-4 font-medium">
            Firebase Firestore Realtime Database
          </p>

          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
            <div className="text-2xl">
              {teacher.title === "លោកស្រី" || teacher.title === "អ្នកគ្រូ" ? "👩‍🏫" : "👨‍🏫"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-800 text-sm truncate">
                {teacher.title} {teacher.fullName}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {teacher.level} · {teacher.school}
              </div>
              <div className="text-[11px] text-slate-400 truncate">📧 {teacher.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-2.5 py-1.5 rounded-lg font-bold text-xs transition"
              title="ចាកចេញ"
            >
              ⛔️
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl px-3 py-2 mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>🔥 Firestore Connected</span>
            </div>
            <a
              href={firestoreConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-xs transition flex items-center gap-1 shrink-0"
              title="បើកមើល Database ក្នុង Firebase Console"
            >
              <span>🔥 Firestore</span>
              <span className="text-[9px]">↗</span>
            </a>
          </div>

          <p className="font-bold text-blue-900 text-xs mb-3 flex items-center gap-1">
            <span>🏫</span> ជ្រើសរើសថ្នាក់រៀន
          </p>

          <div className="grid grid-cols-3 gap-2.5">
            {CLASSES.map((cls) => (
              <button
                key={cls}
                onClick={() => onSelectClass(cls)}
                className={`bg-white border-2 rounded-xl p-3 text-center transition flex flex-col items-center justify-center font-bold hover:border-blue-600 hover:bg-blue-50 active:scale-95 ${
                  ["3A", "3B"].includes(cls) ? "border-blue-500 bg-blue-50/50" : "border-slate-200"
                }`}
              >
                <span className="text-sm text-slate-900 font-extrabold">{cls}</span>
                {["3A", "3B"].includes(cls) && (
                  <span className="text-[10px] text-amber-500 font-normal">🔥 ថ្នាក់សកម្ម</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      {view === "login" && (
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
          <div className="text-center mb-5">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-xl flex items-center justify-center text-white mx-auto mb-2 shadow-md">
              🎓
            </div>
            <h2 className="text-base font-extrabold text-slate-900">🔐 លទ្ធផល (ABC - PLP 2026)</h2>
            <p className="text-xs text-slate-500 mt-1">
              ប្រព័ន្ធគ្រប់គ្រងពិន្ទុតេស្តសិស្ស · Firebase Auth & Firestore
            </p>
          </div>

          {loginErr && (
            <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-2.5 text-xs mb-3 font-medium">
              {loginErr}
            </div>
          )}

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">📧 Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="teacher@school.com"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">🔒 Password</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600 transition"
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs hover:opacity-95 active:scale-[0.98] transition shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {loading ? "⏳ កំពុងចូល..." : "🔐 ចូលប្រើប្រាស់"}
          </button>

          <div className="text-center mt-3">
            <button
              onClick={() => setView("reg1")}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              ➕ ចុះឈ្មោះគ្រូថ្មី (Register)
            </button>
          </div>
        </div>
      )}

      {/* Reg Step 1 */}
      {view === "reg1" && (
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
          <button
            onClick={() => setView("login")}
            className="text-xs text-blue-600 font-bold mb-3 hover:underline"
          >
            ← ត្រឡប់ទៅ Login
          </button>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
              1
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 text-xs font-extrabold flex items-center justify-center">
              2
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 text-xs font-extrabold flex items-center justify-center">
              3
            </div>
          </div>
          <h2 className="text-base font-extrabold text-slate-900">👤 ព័ត៌មានគ្រូបង្រៀន</h2>
          <p className="text-xs text-slate-500 mb-4">ជំហានទី ១/៣</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">គោត្តនាម</label>
              <input
                type="text"
                value={r1Last}
                onChange={(e) => setR1Last(e.target.value)}
                placeholder="ស្វាង"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">នាម</label>
              <input
                type="text"
                value={r1First}
                onChange={(e) => setR1First(e.target.value)}
                placeholder="មនោរម្យ"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                លោក / លោកស្រី / អ្នកគ្រូ
              </label>
              <select
                value={r1Title}
                onChange={(e) => setR1Title(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600 bg-white"
              >
                <option>លោក</option>
                <option>លោកស្រី</option>
                <option>អ្នកគ្រូ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">📧 Email</label>
              <input
                type="email"
                value={r1Email}
                onChange={(e) => setR1Email(e.target.value)}
                placeholder="teacher@school.com"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">🔒 Password</label>
              <input
                type="password"
                value={r1Pass}
                onChange={(e) => setR1Pass(e.target.value)}
                placeholder="យ៉ាងតិច ៦ ខ្ទង់"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">📞 លេខទូរស័ព្ទ</label>
              <input
                type="text"
                value={r1Phone}
                onChange={(e) => setR1Phone(e.target.value)}
                placeholder="0xx xxx xxx"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <button
            onClick={() => {
              if (!r1Last || !r1First) {
                toast("⚠️ សូមបំពេញ គោត្តនាម និងនាម!", "error");
                return;
              }
              if (!r1Email || !r1Email.includes("@")) {
                toast("⚠️ Email មិនត្រឹមត្រូវ!", "error");
                return;
              }
              if (r1Pass.length < 6) {
                toast("⚠️ Password យ៉ាងតិច ៦ ខ្ទង់!", "error");
                return;
              }
              setView("reg2");
            }}
            className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-blue-700 transition"
          >
            បន្ទាប់ →
          </button>
        </div>
      )}

      {/* Reg Step 2 */}
      {view === "reg2" && (
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
          <button
            onClick={() => setView("reg1")}
            className="text-xs text-blue-600 font-bold mb-3 hover:underline"
          >
            ← ថយក្រោយ
          </button>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center">
              ✓
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
              2
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 text-xs font-extrabold flex items-center justify-center">
              3
            </div>
          </div>
          <h2 className="text-base font-extrabold text-slate-900">🏫 ព័ត៌មានសាលារៀន</h2>
          <p className="text-xs text-slate-500 mb-4">ជំហានទី ២/៣</p>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ឈ្មោះសាលារៀន</label>
              <input
                type="text"
                value={r2School}
                onChange={(e) => setR2School(e.target.value)}
                placeholder="សាលាបឋមសិក្សា ...."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">លេខសម្គាល់សាលា</label>
              <input
                type="text"
                value={r2SchoolID}
                onChange={(e) => setR2SchoolID(e.target.value)}
                placeholder="0.............."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">កម្រិតសិក្សា</label>
              <select
                value={r2Level}
                onChange={(e) => setR2Level(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600 bg-white"
              >
                <option>បឋមសិក្សា</option>
                <option>អនុវិទ្យាល័យ</option>
                <option>វិទ្យាល័យ</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setView("reg3")}
            className="w-full bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-blue-700 transition"
          >
            បន្ទាប់ →
          </button>
        </div>
      )}

      {/* Reg Step 3 */}
      {view === "reg3" && (
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
          <button
            onClick={() => setView("reg2")}
            className="text-xs text-blue-600 font-bold mb-3 hover:underline"
          >
            ← ថយក្រោយ
          </button>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center">
              ✓
            </div>
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center">
              ✓
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
              3
            </div>
          </div>
          <h2 className="text-base font-extrabold text-slate-900">📍 ទីតាំងសាលារៀន</h2>
          <p className="text-xs text-slate-500 mb-4">ជំហានទី ៣/៣</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ខេត្ត/ក្រុង</label>
              <select
                value={r3Province}
                onChange={(e) => setR3Province(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600 bg-white"
              >
                <option>បន្ទាយមានជ័យ</option>
                <option>ភ្នំពេញ</option>
                <option>កណ្តាល</option>
                <option>កំពង់ចាម</option>
                <option>បាត់ដំបង</option>
                <option>សៀមរាប</option>
                <option>ព្រះសីហនុ</option>
                <option>ក្រចេះ</option>
                <option>ស្ទឹងត្រែង</option>
                <option>ត្បូងឃ្មុំ</option>
                <option>កំពង់ស្ពឺ</option>
                <option>កំពង់ធំ</option>
                <option>កំពង់ឆ្នាំង</option>
                <option>ព្រៃវែង</option>
                <option>ស្វាយរៀង</option>
                <option>តាកែវ</option>
                <option>ពោធិ៍សាត់</option>
                <option>មណ្ឌលគីរី</option>
                <option>រតនគីរី</option>
                <option>ឧត្តរមានជ័យ</option>
                <option>កែប</option>
                <option>ប៉ៃលិន</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ស្រុក/ខណ្ឌ</label>
              <input
                type="text"
                value={r3District}
                onChange={(e) => setR3District(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ឃុំ/សង្កាត់</label>
              <input
                type="text"
                value={r3Commune}
                onChange={(e) => setR3Commune(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ភូមិ</label>
              <input
                type="text"
                value={r3Village}
                onChange={(e) => setR3Village(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {regErr && (
            <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-2.5 text-xs mb-3">
              {regErr}
            </div>
          )}

          <button
            onClick={handleRegFinish}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs hover:opacity-95 transition shadow-md disabled:opacity-50"
          >
            {loading ? "⏳ កំពុងបង្កើត..." : "✅ ចុះឈ្មោះ → Firestore 🔥"}
          </button>
        </div>
      )}
    </div>
  );
};
