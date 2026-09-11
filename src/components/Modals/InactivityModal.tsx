import React from "react";

interface InactivityModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export const InactivityModal: React.FC<InactivityModalProps> = ({
  isOpen,
  secondsRemaining,
  onStayLoggedIn,
  onLogoutNow,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border-2 border-amber-500 text-center animate-fade-in">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner border border-amber-200">
          🔒
        </div>

        <h3 className="text-slate-900 font-extrabold text-lg mb-1">
          សេចក្តីជូនដំណឹងអំពីសុវត្ថិភាពទិន្នន័យ
        </h3>

        <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
          ដោយសារគ្មានសកម្មភាពរយៈពេល <strong className="text-amber-700">២៨ នាទី</strong> ប្រព័ន្ធនឹងចាកចេញពីគណនីដោយស្វ័យប្រវត្តិក្នងរយៈពេល ៖
        </p>

        {/* Live Countdown Circle */}
        <div className="my-4 flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-full border-4 border-amber-500 bg-amber-50 flex items-center justify-center text-3xl font-black text-amber-700 shadow-md tracking-wider">
            {timeFormatted}
          </div>
          <span className="text-[11px] text-slate-500 font-bold mt-2">
            ដើម្បីការពារទិន្នន័យផ្ទាល់ខ្លួន និងព័ត៌មានសិស្ស
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-6">
          តើអ្នកចង់បន្តប្រើប្រាស់ប្រព័ន្ធនេះទៀតដែរឬទេ?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onLogoutNow}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition border border-slate-300"
          >
            🚪 ចាកចេញឥឡូវនេះ
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-lg shadow-emerald-600/30 border border-emerald-500 flex items-center justify-center gap-1.5"
          >
            ✅ នៅបន្តប្រើប្រាស់
          </button>
        </div>
      </div>
    </div>
  );
};
