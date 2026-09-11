import React, { useState, useEffect } from "react";

interface PhotoModalProps {
  isOpen: boolean;
  studentId: string | null;
  studentName: string;
  studentGender: string;
  currentPhoto: string | null;
  onClose: () => void;
  onSavePhoto: (studentId: string, photoDataUrl: string | null) => Promise<void>;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  studentId,
  studentName,
  studentGender,
  currentPhoto,
  onClose,
  onSavePhoto,
  toast,
}) => {
  const [photo, setPhoto] = useState<string | null>(currentPhoto);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPhoto(currentPhoto);
  }, [currentPhoto, isOpen]);

  if (!isOpen || !studentId) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSavePhoto(studentId, photo);
      toast(photo ? "📷 រូបភាពបានរក្សាទុកក្នុង Firestore ✅" : "🗑️ បានលុបរូបភាពហើយ");
      onClose();
    } catch (e: any) {
      toast("❌ " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl border border-slate-100 animate-fade-in text-center">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-extrabold text-blue-950 text-sm">📷 រូបភាពសិស្ស</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>

        <div className="font-bold text-slate-800 text-xs mb-3 truncate">{studentName}</div>

        <div className="flex justify-center mb-4">
          <div
            onClick={() => document.getElementById("photoModalFileInput")?.click()}
            className="w-28 h-28 rounded-full border-2 border-dashed border-blue-400 bg-blue-50/50 flex items-center justify-center overflow-hidden cursor-pointer relative group"
          >
            {photo ? (
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">{studentGender === "ស្រី" ? "👩" : "👨"}</span>
            )}
            <div className="absolute inset-0 bg-black/40 text-white text-[10px] font-bold flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition">
              ចុចផ្លាស់ប្តូរ
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          <label className="bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-3 py-1 text-xs font-bold cursor-pointer hover:bg-blue-100">
            📁 Upload
            <input
              id="photoModalFileInput"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <label className="bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-3 py-1 text-xs font-bold cursor-pointer hover:bg-emerald-100">
            📷 Camera
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {photo && (
            <button
              onClick={() => setPhoto(null)}
              className="bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-1 text-xs font-bold hover:bg-red-100"
            >
              🗑️ លុបរូប
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            បោះបង់
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? "⏳..." : "💾 Save"}
          </button>
        </div>
      </div>
    </div>
  );
};
