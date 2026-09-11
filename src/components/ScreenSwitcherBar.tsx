import React from "react";
import { Monitor, Globe, Tablet, Smartphone, RotateCw, ZoomIn, ZoomOut, ChevronDown, ChevronUp } from "lucide-react";

export type ScreenMode = "pc" | "web" | "app" | "phone";
export type Orientation = "portrait" | "landscape";

interface ScreenSwitcherBarProps {
  mode: ScreenMode;
  setMode: (mode: ScreenMode) => void;
  orientation: Orientation;
  setOrientation: (orientation: Orientation) => void;
  scale: number;
  setScale: (scale: number) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const ScreenSwitcherBar: React.FC<ScreenSwitcherBarProps> = ({
  mode,
  setMode,
  orientation,
  setOrientation,
  scale,
  setScale,
  isCollapsed,
  setIsCollapsed,
}) => {
  const modes: { id: ScreenMode; label: string; subLabel: string; icon: React.ReactNode; widthHint: string }[] = [
    {
      id: "pc",
      label: "PC",
      subLabel: "កុំព្យូទ័រ",
      icon: <Monitor className="w-3.5 h-3.5" />,
      widthHint: "100% Widescreen",
    },
    {
      id: "web",
      label: "Web",
      subLabel: "គេហទំព័រ",
      icon: <Globe className="w-3.5 h-3.5" />,
      widthHint: "1280px Container",
    },
    {
      id: "app",
      label: "App",
      subLabel: "ថេប្លេត / iPad",
      icon: <Tablet className="w-3.5 h-3.5" />,
      widthHint: orientation === "portrait" ? "820px × 1180px" : "1180px × 820px",
    },
    {
      id: "phone",
      label: "Phone",
      subLabel: "ទូរស័ព្ទដៃ",
      icon: <Smartphone className="w-3.5 h-3.5" />,
      widthHint: orientation === "portrait" ? "412px × 860px" : "860px × 412px",
    },
  ];

  const handleZoomOut = () => {
    const scales = [0.7, 0.8, 0.9, 1.0];
    const currentIndex = scales.findIndex((s) => Math.abs(s - scale) < 0.05);
    if (currentIndex > 0) setScale(scales[currentIndex - 1]);
    else if (currentIndex === -1) setScale(0.8);
  };

  const handleZoomIn = () => {
    const scales = [0.7, 0.8, 0.9, 1.0];
    const currentIndex = scales.findIndex((s) => Math.abs(s - scale) < 0.05);
    if (currentIndex >= 0 && currentIndex < scales.length - 1) setScale(scales[currentIndex + 1]);
    else if (currentIndex === -1) setScale(1.0);
  };

  if (isCollapsed) {
    return (
      <div className="fixed top-2 right-4 z-50 no-print">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-slate-900/95 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-full border border-slate-700 shadow-xl flex items-center gap-1.5 backdrop-blur-sm transition active:scale-95"
          title="បើករបារប្ដូរអេក្រង់ (PC, Web, App, Phone)"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span>🖥️ {mode.toUpperCase()}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <aside aria-label="ផ្ទាំងប្ដូរទំហំអេក្រង់" className="sticky top-0 z-50 no-print w-full bg-slate-950 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1.5 flex items-center justify-between gap-2 flex-wrap text-xs">
        {/* Left: Branding & Current Mode */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-[11px] text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2 py-0.5 rounded flex items-center gap-1">
            <span>🖥️</span>
            <span className="hidden sm:inline">អេក្រង់ (Screen):</span>
            <span className="text-white uppercase font-black">{mode}</span>
          </span>

          {/* Quick buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 shadow-inner">
            {modes.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  title={`${m.label} (${m.subLabel}) - ${m.widthHint}`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition whitespace-nowrap ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                  <span className="hidden md:inline text-[9px] font-normal opacity-80">
                    ({m.subLabel})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Controls: Orientation, Zoom, Collapse */}
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {/* Orientation Button (App / Phone only) */}
          {(mode === "app" || mode === "phone") && (
            <button
              onClick={() => setOrientation(orientation === "portrait" ? "landscape" : "portrait")}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded px-2 py-1 text-[10px] font-semibold transition"
              title="បង្វិលទិសដៅបញ្ឈរ/ផ្ដេក (Portrait / Landscape)"
            >
              <RotateCw className="w-3 h-3 text-amber-400" />
              <span>{orientation === "portrait" ? "បញ្ឈរ (Portrait)" : "ផ្ដេក (Landscape)"}</span>
            </button>
          )}

          {/* Zoom / Scale Controls */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 gap-1 text-[10px]">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.7}
              title="បង្រួម (Zoom Out)"
              className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono font-bold text-slate-300 w-9 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 1.0}
              title="ពង្រីក (Zoom In)"
              className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Collapse Bar Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
            title={isCollapsed ? "បង្ហាញរបារពេញលេញ" : "បង្រួមរបារនេះ"}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
