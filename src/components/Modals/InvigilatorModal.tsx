import React, { useState, useRef, useEffect } from "react";
import { InvigilatorData } from "../../types";

interface InvigilatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  invigilatorData: InvigilatorData;
  onSave: (d: InvigilatorData) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const InvigilatorModal: React.FC<InvigilatorModalProps> = ({
  isOpen,
  onClose,
  invigilatorData,
  onSave,
  toast,
}) => {
  const [building, setBuilding] = useState(invigilatorData.building || "");
  const [room, setRoom] = useState(invigilatorData.room || "");
  const [shift, setShift] = useState(invigilatorData.shift || "ព្រឹក");

  const [sup1Name, setSup1Name] = useState(invigilatorData.sup1?.name || "");
  const [sup1Phone, setSup1Phone] = useState(invigilatorData.sup1?.phone || "");
  const [sup1Sig, setSup1Sig] = useState(invigilatorData.sup1?.sig || "");

  const [sup2Name, setSup2Name] = useState(invigilatorData.sup2?.name || "");
  const [sup2Phone, setSup2Phone] = useState(invigilatorData.sup2?.phone || "");
  const [sup2Sig, setSup2Sig] = useState(invigilatorData.sup2?.sig || "");

  const canvas1Ref = useRef<HTMLCanvasElement | null>(null);
  const canvas2Ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBuilding(invigilatorData.building || "");
      setRoom(invigilatorData.room || "");
      setShift(invigilatorData.shift || "ព្រឹក");
      setSup1Name(invigilatorData.sup1?.name || "");
      setSup1Phone(invigilatorData.sup1?.phone || "");
      setSup1Sig(invigilatorData.sup1?.sig || "");
      setSup2Name(invigilatorData.sup2?.name || "");
      setSup2Phone(invigilatorData.sup2?.phone || "");
      setSup2Sig(invigilatorData.sup2?.sig || "");

      setTimeout(() => {
        setupCanvas(canvas1Ref.current, invigilatorData.sup1?.sig);
        setupCanvas(canvas2Ref.current, invigilatorData.sup2?.sig);
      }, 100);
    }
  }, [isOpen, invigilatorData]);

  const setupCanvas = (canvas: HTMLCanvasElement | null, initialSig?: string) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e3a5f";

    if (initialSig) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = initialSig;
    }

    let drawing = false;
    let last = { x: 0, y: 0 };

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    const start = (e: any) => {
      drawing = true;
      last = getPos(e);
      e.preventDefault();
    };

    const move = (e: any) => {
      if (!drawing) return;
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
      e.preventDefault();
    };

    const end = () => {
      drawing = false;
    };

    canvas.onmousedown = start;
    canvas.onmousemove = move;
    window.onmouseup = end;

    canvas.ontouchstart = start;
    canvas.ontouchmove = move;
    canvas.ontouchend = end;
  };

  const clearSig = (num: 1 | 2) => {
    const canvas = num === 1 ? canvas1Ref.current : canvas2Ref.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (num === 1) setSup1Sig("");
    else setSup2Sig("");
  };

  const handleSave = () => {
    const sig1Data = canvas1Ref.current ? canvas1Ref.current.toDataURL("image/png") : sup1Sig;
    const sig2Data = canvas2Ref.current ? canvas2Ref.current.toDataURL("image/png") : sup2Sig;

    const data: InvigilatorData = {
      building: building.trim(),
      room: room.trim(),
      shift: shift as any,
      sup1: { name: sup1Name.trim(), phone: sup1Phone.trim(), sig: sig1Data },
      sup2: { name: sup2Name.trim(), phone: sup2Phone.trim(), sig: sig2Data },
    };

    onSave(data);
    toast("✅ រក្សាទុកព័ត៌មានអនុរក្សរួចរាល់");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl border border-slate-100 animate-fade-in text-xs space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="font-extrabold text-blue-950 text-sm">🖋️ ព័ត៌មានអនុរក្ស (Invigilators)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block font-bold text-slate-700 mb-1">ឈ្មោះអគារ</label>
            <input
              type="text"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="អគារ A"
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">លេខបន្ទប់</label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="01"
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">វេន</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white focus:border-blue-600"
            >
              <option>ព្រឹក</option>
              <option>ល្ងាច</option>
            </select>
          </div>
        </div>

        {/* Supervisor 1 */}
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
          <div className="font-extrabold text-blue-900">👤 អនុរក្សទី១</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={sup1Name}
              onChange={(e) => setSup1Name(e.target.value)}
              placeholder="ឈ្មោះអនុរក្ស១"
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none"
            />
            <input
              type="text"
              value={sup1Phone}
              onChange={(e) => setSup1Phone(e.target.value)}
              placeholder="លេខទូរស័ព្ទ"
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none"
            />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold mb-1">✍️ ហត្ថលេខា (គូសខាងក្រោម)</div>
            <canvas
              ref={canvas1Ref}
              width={380}
              height={80}
              className="w-full h-20 border border-dashed border-blue-300 rounded-lg bg-white touch-none"
            />
            <div className="text-right mt-1">
              <button
                onClick={() => clearSig(1)}
                className="text-[10px] text-red-600 font-bold hover:underline"
              >
                🗑️ សម្អាតហត្ថលេខា
              </button>
            </div>
          </div>
        </div>

        {/* Supervisor 2 */}
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
          <div className="font-extrabold text-blue-900">👤 អនុរក្សទី២</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={sup2Name}
              onChange={(e) => setSup2Name(e.target.value)}
              placeholder="ឈ្មោះអនុរក្ស២"
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none"
            />
            <input
              type="text"
              value={sup2Phone}
              onChange={(e) => setSup2Phone(e.target.value)}
              placeholder="លេខទូរស័ព្ទ"
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none"
            />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold mb-1">✍️ ហត្ថលេខា (គូសខាងក្រោម)</div>
            <canvas
              ref={canvas2Ref}
              width={380}
              height={80}
              className="w-full h-20 border border-dashed border-blue-300 rounded-lg bg-white touch-none"
            />
            <div className="text-right mt-1">
              <button
                onClick={() => clearSig(2)}
                className="text-[10px] text-red-600 font-bold hover:underline"
              >
                🗑️ សម្អាតហត្ថលេខា
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
          >
            បោះបង់
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
          >
            💾 រក្សាទុក
          </button>
        </div>
      </div>
    </div>
  );
};
