import React, { useState } from "react";
import { Student } from "../../types";
import { BLANK_STUDENT, SAMPLE_STUDENTS, calcAge, normalizeDateInput } from "../../lib/constants";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (newStudent: Omit<Student, "id">, photoDataUrl?: string) => Promise<void>;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onAddStudent,
  toast,
}) => {
  const [formData, setFormData] = useState<Omit<Student, "id">>({ ...BLANK_STUDENT });
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showJsonPaste, setShowJsonPaste] = useState(false);
  const [jsonText, setJsonText] = useState("");

  if (!isOpen) return null;

  const handleApplySample = (sample: Omit<Student, "id">) => {
    const dob = normalizeDateInput(sample.dob);
    const age = dob ? calcAge(dob) : sample.age;
    setFormData({
      ...sample,
      dob,
      age,
    });
    toast(`✨ បានបំពេញទិន្នន័យ ${sample.lastName} ${sample.firstName} រួចរាល់!`, "success");
  };

  const handleParseJson = () => {
    try {
      if (!jsonText.trim()) return;
      const parsed = JSON.parse(jsonText.trim());
      const item = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!item || typeof item !== "object") {
        toast("⚠️ ទម្រង់ JSON មិនត្រឹមត្រូវ!", "error");
        return;
      }
      const lastName = String(item.lastName || item.last_name || item["គោត្តនាម"] || "").trim();
      const firstName = String(item.firstName || item.first_name || item["នាម"] || "").trim();
      const rawGender = String(item.gender || item.sex || item["ភេទ"] || "").trim();
      const gender: "ប្រុស" | "ស្រី" = rawGender.includes("ស្រី") || rawGender.toLowerCase().includes("f") ? "ស្រី" : "ប្រុស";
      const rawDob = String(item.dob || item.birth || item["ថ្ងៃខែឆ្នាំកំណើត"] || "").trim();
      const dob = normalizeDateInput(rawDob);
      const age = String(item.age || (dob ? calcAge(dob) : "")).trim();

      setFormData({
        lastName,
        firstName,
        gender,
        dob,
        age,
        fatherName: String(item.fatherName || item.father || item["ឈ្មោះឪពុក"] || item["ឪពុក"] || "").trim(),
        fatherJob: String(item.fatherJob || item["មុខរបរឪពុក"] || "").trim(),
        motherName: String(item.motherName || item.mother || item["ឈ្មោះម្តាយ"] || item["ម្តាយ"] || "").trim(),
        motherJob: String(item.motherJob || item["មុខរបរម្តាយ"] || item["មុខរបរម្ដាយ"] || "").trim(),
        village: String(item.village || item["ភូមិ"] || "").trim(),
        commune: String(item.commune || item["ឃុំ"] || "").trim(),
        district: String(item.district || item["ស្រុក"] || "").trim(),
        province: String(item.province || item["ខេត្ត"] || "").trim(),
        phone: String(item.phone || item["ទូរស័ព្ទ"] || "").trim(),
      });
      setShowJsonPaste(false);
      setJsonText("");
      toast(`✅ បានទាញយកទិន្នន័យ ${lastName} ${firstName} ជោគជ័យ!`, "success");
    } catch (e: any) {
      toast("❌ កំហុសក្នុងការ Parse JSON: " + e.message, "error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoDataUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      toast("⚠️ សូមបំពេញ គោត្តនាម និងនាម!", "error");
      return;
    }
    setLoading(true);
    try {
      const normalizedDob = normalizeDateInput(formData.dob);
      const ageVal = normalizedDob ? calcAge(normalizedDob) : formData.age;
      await onAddStudent({ ...formData, dob: normalizedDob, age: ageVal }, photoDataUrl);
      setFormData({ ...BLANK_STUDENT });
      setPhotoDataUrl("");
      onClose();
    } catch (e: any) {
      toast("❌ " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-fade-in">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-blue-950 text-base flex items-center gap-1.5">
              <span>➕</span> បន្ថែមសិស្សថ្មី (Add Student)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJsonPaste(!showJsonPaste)}
              className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md hover:bg-blue-100 transition"
              title="បិទភ្ជាប់កូដ JSON សិស្ស"
            >
              📋 បិទភ្ជាប់ JSON
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quick Sample Selector */}
        {SAMPLE_STUDENTS.length > 0 && (
          <div className="mb-3 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-600">✨ បំពេញទិន្នន័យគំរូ:</span>
            <div className="flex gap-1.5 flex-wrap">
              {SAMPLE_STUDENTS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplySample(s)}
                  className="bg-white hover:bg-blue-50 text-blue-900 border border-slate-200 hover:border-blue-300 font-bold px-2 py-1 rounded-lg text-[11px] transition shadow-2xs"
                >
                  👩‍🎓 {s.lastName} {s.firstName} ({s.gender})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* JSON Paste Drawer */}
        {showJsonPaste && (
          <div className="mb-4 p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs animate-fade-in">
            <label className="block font-bold text-blue-950 mb-1">
              📋 បិទភ្ជាប់ JSON សិស្ស (Paste JSON Array / Object):
            </label>
            <textarea
              rows={4}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={`[{\n  "lastName": "កា",\n  "firstName": "បូប្ផា",\n  "gender": "ស្រី",\n  "dob": "1/9/2015",\n  "fatherName": "អ៊ុច កុយ",\n  ...\n}]`}
              className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowJsonPaste(false)}
                className="px-2.5 py-1 rounded-md text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 font-bold text-[11px]"
              >
                បិទ
              </button>
              <button
                type="button"
                onClick={handleParseJson}
                className="px-3 py-1 rounded-md text-white bg-blue-600 hover:bg-blue-700 font-bold text-[11px] shadow-xs"
              >
                ⚡ បំពេញចូលទម្រង់
              </button>
            </div>
          </div>
        )}

        {/* Photo Upload Ring */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <div
            onClick={() => document.getElementById("addModalFileInput")?.click()}
            className="w-20 h-20 rounded-full border-2 border-dashed border-blue-400 bg-blue-50/50 flex items-center justify-center overflow-hidden cursor-pointer relative group"
          >
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">📷</span>
            )}
            <div className="absolute inset-0 bg-black/40 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              ជ្រើសរូប
            </div>
          </div>

          <div className="flex gap-2">
            <label className="bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer hover:bg-blue-100">
              📁 Upload
              <input
                id="addModalFileInput"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <label className="bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer hover:bg-emerald-100">
              📷 Camera
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {photoDataUrl && (
              <button
                onClick={() => setPhotoDataUrl("")}
                className="bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-1 text-[11px] font-bold hover:bg-red-100"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">គោត្តនាម *</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="កា"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">នាម *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="បូប្ផា"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ភេទ</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as "ប្រុស" | "ស្រី" })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600 bg-white"
            >
              <option value="ប្រុស">ប្រុស</option>
              <option value="ស្រី">ស្រី</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ថ្ងៃខែឆ្នាំកំណើត</label>
            <input
              type="date"
              value={formData.dob || ""}
              onChange={(e) => {
                const dob = e.target.value;
                const age = calcAge(dob);
                setFormData({ ...formData, dob, age });
              }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">អាយុ</label>
            <input
              type="text"
              value={formData.age || ""}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              placeholder="គិតស្វ័យប្រវត្តិ"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600 bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ទូរស័ព្ទ</label>
            <input
              type="text"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="0xx xxx xxx"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ឈ្មោះឪពុក</label>
            <input
              type="text"
              value={formData.fatherName || ""}
              onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">មុខរបរឪពុក</label>
            <input
              type="text"
              value={formData.fatherJob || ""}
              onChange={(e) => setFormData({ ...formData, fatherJob: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ឈ្មោះម្តាយ</label>
            <input
              type="text"
              value={formData.motherName || ""}
              onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">មុខរបរម្តាយ</label>
            <input
              type="text"
              value={formData.motherJob || ""}
              onChange={(e) => setFormData({ ...formData, motherJob: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ភូមិ</label>
            <input
              type="text"
              value={formData.village || ""}
              onChange={(e) => setFormData({ ...formData, village: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ឃុំ</label>
            <input
              type="text"
              value={formData.commune || ""}
              onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ស្រុក</label>
            <input
              type="text"
              value={formData.district || ""}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ខេត្ត</label>
            <input
              type="text"
              value={formData.province || ""}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            ✕ បោះបង់
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {loading ? "⏳ កំពុងរក្សាទុក..." : "✅ រក្សាទុក → Firestore 🔥"}
          </button>
        </div>
      </div>
    </div>
  );
};
