import { Student, ScoreMap } from "../types";
import { getAvg, gradeOf, fmtAvg, getThreeWorkingDates, MONTHS, SEMESTERS } from "./constants";

export function buildHonorAllPrintHTML(
  ranked: Student[],
  honorPhotos: Record<string, string>,
  selClass: string,
  semester: string,
  selMonth: number,
  teacher: any,
  scoresMap: Record<string, ScoreMap>
): string {
  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`;
  const school = teacher?.school || "សាលាបឋមសិក្សា";
  const dates = getThreeWorkingDates(selMonth);
  const MEDAL2 = ["🥇", "🥈", "🥉", "④", "⑤"];
  const GRADE_C: Record<string, string> = { A: "#15803d", B: "#1d4ed8", C: "#b45309", D: "#c2410c", E: "#dc2626", F: "#7f1d1d" };
  const BORDER_C = ["#f59e0b", "#94a3b8", "#b45309"];

  let hdr = `<div style="display:flex;justify-content:center;margin-bottom:4px"><div style="text-align:center"><div style="font-size:14px;font-weight:900;color:#1a1a2e">ព្រះរាជាណាចក្របកម្ពុជា</div><div style="font-size:12px;color:#333;margin-top:2px">ជាតិ សាសនា ព្រះមហាក្សត្រ</div></div></div>`;
  hdr += `<div style="text-align:left;font-size:12px;color:#1e3a5f;line-height:2;margin-bottom:4px"><div><strong>រដ្ឋបាលស្រុកភ្នំស្រុក</strong></div><div><strong>ការិយាល័យអប់រំ យុវជន និងកីឡាស្រុក</strong></div><div><strong>កម្រងស្ពានស្រែង</strong></div><div>${school}</div></div>`;
  hdr += `<hr style="border:none;border-top:2.5px solid #1e3a5f;margin:4px 0 8px"/><div style="text-align:center;font-size:16px;font-weight:900;color:#b45309;margin:5px 0 2px">តារាងកិត្តិយស</div><div style="text-align:center;font-size:14px;font-weight:800;color:#1e3a5f;margin-bottom:12px">ថ្នាក់ទី ${selClass} · ${SEMESTERS.find(s=>s.id===semester)?.label || semester} · ខែ${MONTHS[selMonth]}</div>`;

  const CW = 148, CH = 175, PD = 80;
  function buildSmallCard(s: Student | null, rank: number) {
    if (!s) return `<div style="width:${CW}px;height:${CH}px;"></div>`;
    const avg = Number(getAvg(s.id, ranked, scoresMap));
    const g = gradeOf(avg);
    const photo = honorPhotos[s.id] || s.photoUrl || null;
    const isTop3 = rank <= 3;
    const medal = rank <= 5 ? MEDAL2[rank - 1] : "";
    const bg = rank === 1 ? "linear-gradient(160deg,#fffbeb,#fef3c7)" : rank === 2 ? "linear-gradient(160deg,#f0f4ff,#e2e8f0)" : rank === 3 ? "linear-gradient(160deg,#fff7ed,#fed7aa)" : "#fff";
    const border = rank <= 3 ? BORDER_C[rank - 1] : "#d1d5db";
    const photoHTML = photo
      ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
      : `<div style="font-size:34px;line-height:1;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${s.gender === "ស្រី" ? "👩" : "👨"}</div>`;

    return `<div style="width:${CW}px;height:${CH}px;background:${bg};border:2px solid ${border};border-radius:12px;padding:7px 7px 5px;text-align:center;position:relative;box-shadow:0 2px 6px rgba(0,0,0,0.07);overflow:hidden;flex-shrink:0;">
      ${medal ? `<div style="position:absolute;top:-7px;left:50%;transform:translateX(-50%);font-size:18px;line-height:1;z-index:2">${medal}</div>` : ""}
      <div style="font-size:9px;font-weight:800;color:#94a3b8;margin-top:${medal ? "9" : "2"}px;margin-bottom:2px">ចំណាត់ #${rank}</div>
      <div style="width:${PD}px;height:${PD}px;border-radius:50%;margin:0 auto 5px;overflow:hidden;border:${isTop3 ? "3" : "2"}px solid ${border};background:#f1f5f9;">${photoHTML}</div>
      <div style="font-weight:900;font-size:10.5px;color:#1e3a5f;line-height:1.3;margin-bottom:2px">${s.lastName} ${s.firstName}</div>
      <div style="font-size:12px;font-weight:900;color:${GRADE_C[g.l]};margin-bottom:2px">${fmtAvg(avg)}</div>
      <div style="display:inline-block;background:${g.c};color:#fff;border-radius:14px;padding:1px 9px;font-size:9.5px;font-weight:800;">និទ្ទេស ${g.l}</div>
    </div>`;
  }

  let rows = "";
  for (let r = 0; r < ranked.length; r += 8) {
    const chunk = ranked.slice(r, r + 8);
    while (chunk.length < 8) chunk.push(null as any);
    rows += `<div style="display:flex;gap:12px;justify-content:center;margin-bottom:16px;page-break-inside:avoid;">`;
    for (let c = 0; c < 4; c++) {
      const top = chunk[c], bot = chunk[c + 4];
      rows += `<div style="display:flex;flex-direction:column;gap:10px;">`;
      rows += buildSmallCard(top, top ? top._rank || (r + c + 1) : 0);
      rows += buildSmallCard(bot, bot ? bot._rank || (r + c + 5) : 0);
      rows += `</div>`;
    }
    rows += `</div>`;
  }
  const cardsGrid = `<div style="margin-bottom:16px;">${rows}</div>`;
  const vil1 = (teacher?.village || "រោគ").trim();
  const vilPrefix1 = vil1.startsWith("ភូមិ") ? `${vil1}, ` : `ភូមិ${vil1}, `;

  const sig = `<div style="display:flex;justify-content:space-between;margin-top:14px;font-size:12px;gap:4px;">
    <div style="text-align:center;flex:1;"><div style="font-size:12px;font-weight:700;color:#1e3a5f;">បានឃើញ និងឯកភាព</div><div style="font-size:11px;text-align:left;color:#374151;line-height:1.8;margin-top:2px;">${dates.d2.lunar}</div><div style="font-size:11px;text-align:left;">${vilPrefix1}${dates.d2.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:11px;margin-top:3px;">នាយក/នាយិកា</div></div>
    <div style="text-align:center;flex:1;"><div style="font-size:12px;font-weight:700;color:#1e3a5f;">បានឃើញ និងអនុម័ត</div><div style="font-size:11px;text-align:left;color:#374151;line-height:1.8;margin-top:2px;">${dates.d1.lunar}</div><div style="font-size:11px;text-align:left;">${vilPrefix1}${dates.d1.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:11px;margin-top:3px;">ប្រធាន គ.គ.ថ.</div></div>
    <div style="text-align:center;flex:1;"><div style="font-size:11px;text-align:left;color:#374151;line-height:1.8;margin-top:2px;">${dates.d0.lunar}</div><div style="font-size:11px;text-align:left;">${vilPrefix1}${dates.d0.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:11px;margin-top:3px;">គ្រូប្រចាំថ្នាក់</div><div style="margin-top:20px;font-weight:900;color:#1e3a5f;font-size:11px;">${tName.trim()}</div></div>
  </div>`;

  return `<!DOCTYPE html><html lang="km"><head><meta charset="UTF-8"><title>តារាងកិត្តិយស</title><link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Hanuman','Battambang',sans-serif;font-size:11px;padding:.5cm .7cm;color:#1e293b}@page{size:A4;margin:.5cm .7cm}</style></head><body>${hdr}${cardsGrid}${sig}</body></html>`;
}

export function buildHonorTop5PrintHTML(
  ranked: Student[],
  honorPhotos: Record<string, string>,
  selClass: string,
  semester: string,
  selMonth: number,
  teacher: any,
  scoresMap: Record<string, ScoreMap>
): string {
  const top5 = ranked.slice(0, 5);
  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`;
  const school = teacher?.school || "សាលាបឋមសិក្សា";
  const dates = getThreeWorkingDates(selMonth);
  const MEDAL2 = ["🥇", "🥈", "🥉", "④", "⑤"];
  const GRADE_C: Record<string, string> = { A: "#15803d", B: "#1d4ed8", C: "#b45309", D: "#c2410c", E: "#dc2626", F: "#7f1d1d" };

  let hdr = `<div style="display:flex;justify-content:center;margin-bottom:4px"><div style="text-align:center"><div style="font-size:14px;font-weight:900;color:#1a1a2e">ព្រះរាជាណាចក្របកម្ពុជា</div><div style="font-size:12px;color:#333;margin-top:2px">ជាតិ សាសនា ព្រះមហាក្សត្រ</div></div></div>`;
  hdr += `<div style="text-align:left;font-size:12px;color:#1e3a5f;line-height:2;margin-bottom:4px"><div><strong>រដ្ឋបាលស្រុកភ្នំស្រុក</strong></div><div><strong>ការិយាល័យអប់រំ យុវជន និងកីឡាស្រុក</strong></div><div><strong>កម្រងស្ពានស្រែង</strong></div><div>${school}</div></div>`;
  hdr += `<hr style="border:none;border-top:2.5px solid #1e3a5f;margin:4px 0 8px"/><div style="text-align:center;font-size:16px;font-weight:900;color:#b45309;margin:5px 0 2px">តារាងកិត្តិយស</div><div style="text-align:center;font-size:14px;font-weight:800;color:#1e3a5f;margin-bottom:16px">ថ្នាក់ទី ${selClass} · ${SEMESTERS.find(s=>s.id===semester)?.label || semester} · ខែ${MONTHS[selMonth]}</div>`;

  const BORDER_C = ["#f59e0b", "#94a3b8", "#b45309", "#d1d5db", "#d1d5db"];
  const CARD_BG = ["linear-gradient(160deg,#fffbeb,#fef3c7)", "linear-gradient(160deg,#f0f4ff,#e2e8f0)", "linear-gradient(160deg,#fff7ed,#fed7aa)", "#fafafa", "#fafafa"];
  const CW = 160, CH = 220, PD = 100;

  function buildRoundCard(s: Student | null, i: number, extra = "") {
    if (!s) return `<div style="width:${CW}px;height:${CH}px;flex-shrink:0;${extra}"></div>`;
    const avg = Number(getAvg(s.id, ranked, scoresMap));
    const g = gradeOf(avg);
    const photo = honorPhotos[s.id] || s.photoUrl || null;
    const photoHTML = photo
      ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
      : `<div style="font-size:48px;line-height:1;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">${s.gender === "ស្រី" ? "👩" : "👨"}</div>`;

    return `<div style="width:${CW}px;height:${CH}px;flex-shrink:0;background:${CARD_BG[i]};border:2.5px solid ${BORDER_C[i]};border-radius:16px;padding:10px 10px 8px;text-align:center;position:relative;box-shadow:0 4px 12px rgba(0,0,0,0.08);overflow:hidden;${extra}">
      <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:24px;line-height:1;z-index:2">${MEDAL2[i]}</div>
      <div style="font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:4px;margin-top:8px">ចំណាត់ #${i + 1}</div>
      <div style="width:${PD}px;height:${PD}px;border-radius:50%;margin:0 auto 7px;overflow:hidden;border:3px solid ${BORDER_C[i]};background:#f1f5f9;">${photoHTML}</div>
      <div style="font-weight:900;font-size:11.5px;color:#1e3a5f;line-height:1.35;margin-bottom:4px">${s.lastName} ${s.firstName}</div>
      <div style="font-size:14px;font-weight:900;color:${GRADE_C[g.l]};margin-bottom:3px">${fmtAvg(avg)}</div>
      <div style="display:inline-block;background:${g.c};color:#fff;border-radius:20px;padding:2px 12px;font-size:11px;font-weight:800;">និទ្ទេស ${g.l}</div>
    </div>`;
  }

  const s1 = top5[0] || null, s2 = top5[1] || null, s3 = top5[2] || null, s4 = top5[3] || null, s5 = top5[4] || null;
  const raised = `position:relative;transform:translateY(-${Math.round(CH * 0.25)}px);z-index:3;`;

  let cardsHTML = `<div style="margin-bottom:${Math.round(CH * 0.25) + 8}px;padding-top:${Math.round(CH * 0.25) + 4}px;">
    <div style="display:grid;grid-template-columns:repeat(3,${CW}px);gap:18px;justify-content:center;margin-bottom:0;">
      ${buildRoundCard(s2, 1)}
      ${buildRoundCard(s1, 0, raised)}
      ${buildRoundCard(s3, 2)}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,${CW}px);gap:18px;justify-content:center;margin-top:12px;">
      ${buildRoundCard(s4, 3)}
      <div style="width:${CW}px;height:${CH}px;flex-shrink:0;"></div>
      ${buildRoundCard(s5, 4)}
    </div>
  </div>`;
  const vil2 = (teacher?.village || "រោគ").trim();
  const vilPrefix2 = vil2.startsWith("ភូមិ") ? `${vil2}, ` : `ភូមិ${vil2}, `;

  const sig = `<div style="display:flex;justify-content:space-between;margin-top:14px;font-size:12px;gap:4px;">
    <div style="text-align:center;flex:1;"><div style="font-size:12px;font-weight:700;color:#1e3a5f;">បានឃើញ និងឯកភាព</div><div style="font-size:11px;text-align:left;color:#374151;line-height:1.8;margin-top:2px;">${dates.d2.lunar}</div><div style="font-size:11px;text-align:left;">${vilPrefix2}${dates.d2.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:11px;margin-top:3px;">នាយក/នាយិកា</div></div>
    <div style="text-align:center;flex:1;"><div style="font-size:12px;font-weight:700;color:#1e3a5f;">បានឃើញ និងអនុម័ត</div><div style="font-size:11px;text-align:left;color:#374151;line-height:1.8;margin-top:2px;">${dates.d1.lunar}</div><div style="font-size:11px;text-align:left;">${vilPrefix2}${dates.d1.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:11px;margin-top:3px;">ប្រធាន គ.គ.ថ.</div></div>
    <div style="text-align:center;flex:1;"><div style="font-size:11px;text-align:left;color:#374151;line-height:1.8;margin-top:2px;">${dates.d0.lunar}</div><div style="font-size:11px;text-align:left;">${vilPrefix2}${dates.d0.solar}</div><div style="font-weight:700;color:#1e3a5f;font-size:11px;margin-top:3px;">គ្រូប្រចាំថ្នាក់</div><div style="margin-top:20px;font-weight:900;color:#1e3a5f;font-size:11px;">${tName.trim()}</div></div>
  </div>`;

  return `<!DOCTYPE html><html lang="km"><head><meta charset="UTF-8"><title>តារាងកិត្តិយស Top 5</title><link href="https://fonts.googleapis.com/css2?family=Hanuman:wght@400;700;900&family=Battambang:wght@400;700&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Hanuman','Battambang',sans-serif;font-size:11px;padding:.6cm .8cm;color:#1e293b}@page{size:A4;margin:.6cm .8cm}</style></head><body>${hdr}${cardsHTML}${sig}</body></html>`;
}
