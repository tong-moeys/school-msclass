import React, { useState, useEffect } from "react";
import { ScreenMode, Orientation } from "./ScreenSwitcherBar";
import { Wifi, BatteryMedium, Signal } from "lucide-react";

interface DeviceViewportWrapperProps {
  mode: ScreenMode;
  orientation: Orientation;
  scale: number;
  children: React.ReactNode;
}

export const DeviceViewportWrapper: React.FC<DeviceViewportWrapperProps> = ({
  mode,
  orientation,
  scale,
  children,
}) => {
  const [timeStr, setTimeStr] = useState("09:41");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("km-KH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // 1. PC Mode: Full Width Widescreen experience
  if (mode === "pc") {
    return (
      <div className="w-full min-h-screen bg-slate-100 flex flex-col screen-mode-pc">
        {children}
      </div>
    );
  }

  // 2. Web Mode: Centered responsive Web Container
  if (mode === "web") {
    return (
      <div className="w-full min-h-screen bg-slate-200/90 py-4 px-2 sm:px-6 flex justify-center items-start screen-mode-web print:p-0 print:bg-transparent">
        <div
          style={{
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: "top center",
          }}
          className="w-full max-w-7xl bg-white shadow-2xl rounded-2xl border border-slate-300 overflow-hidden min-h-[92vh] flex flex-col transition-all print:border-none print:shadow-none print:rounded-none print:transform-none"
        >
          {children}
        </div>
      </div>
    );
  }

  // 3. App Mode: Tablet / iPad / PWA Chassis
  if (mode === "app") {
    const isPortrait = orientation === "portrait";
    return (
      <div className="w-full min-h-screen bg-slate-900 py-6 px-3 flex flex-col items-center justify-start overflow-x-auto screen-mode-app print:p-0 print:bg-transparent">
        {/* Device Container with Scale */}
        <div
          style={{
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: "top center",
          }}
          className={`w-full transition-all print:transform-none print:max-w-none ${
            isPortrait ? "max-w-[820px]" : "max-w-[1100px]"
          }`}
        >
          <div className="rounded-[36px] border-[12px] border-slate-800 shadow-2xl bg-white overflow-hidden flex flex-col ring-2 ring-slate-700/60 print:border-none print:ring-0 print:rounded-none">
            {/* Tablet Status Bar */}
            <div className="bg-slate-900 text-white px-6 py-2 flex items-center justify-between text-[11px] font-semibold select-none shrink-0 print:hidden border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold tracking-tight">{timeStr}</span>
                <span className="text-[10px] text-blue-400 bg-blue-950 px-2 py-0.5 rounded font-bold">
                  PLP Tablet App
                </span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700 mx-auto" title="Camera"></div>
              <div className="flex items-center gap-2 text-slate-300">
                <Wifi className="w-3.5 h-3.5" />
                <span className="text-[10px]">92%</span>
                <BatteryMedium className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Inner App Content with Scroll */}
            <div className="flex-1 flex flex-col overflow-y-auto max-h-[86vh] print:max-h-none print:overflow-visible">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Phone Mode: Smartphone Chassis
  if (mode === "phone") {
    const isPortrait = orientation === "portrait";
    return (
      <div className="w-full min-h-screen bg-slate-900 py-6 px-2 flex flex-col items-center justify-start overflow-x-auto screen-mode-phone print:p-0 print:bg-transparent">
        {/* Phone Container with Scale */}
        <div
          style={{
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: "top center",
          }}
          className={`w-full transition-all print:transform-none print:max-w-none ${
            isPortrait ? "max-w-[412px]" : "max-w-[860px]"
          }`}
        >
          <div className="rounded-[46px] border-[12px] border-slate-950 shadow-2xl bg-white overflow-hidden flex flex-col ring-2 ring-slate-700/80 relative print:border-none print:ring-0 print:rounded-none">
            {/* Dynamic Island / Notch Bar */}
            <div className="bg-slate-950 text-white px-6 pt-2.5 pb-2 flex items-center justify-between text-[11px] font-bold select-none shrink-0 print:hidden">
              <span className="font-mono">{timeStr}</span>
              {/* Dynamic Island Pill */}
              <div className="w-24 h-4 bg-black rounded-full mx-auto flex items-center justify-end px-2 gap-1 border border-slate-800">
                <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-900/80"></div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <span className="text-[9px]">98%</span>
                <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>

            {/* Inner Phone Content with Mobile Scroll */}
            <div className="flex-1 flex flex-col overflow-y-auto max-h-[82vh] print:max-h-none print:overflow-visible">
              {children}
            </div>

            {/* Bottom Home Indicator */}
            <div className="bg-white py-1.5 flex justify-center shrink-0 border-t border-slate-100 print:hidden">
              <div className="w-32 h-1 bg-slate-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
