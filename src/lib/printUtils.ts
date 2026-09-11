import QRCode from "qrcode";
import { Student, ScoreMap, AttendanceMap, TeacherProfile, InvigilatorData } from "../types";
import {
  MONTHS, SEMESTERS, SUBJECTS,
  fmtAvg, gradeOf, resultOf, getTotal, getAvg, getRank, buildRankedList,
  getThreeWorkingDates, KH_ORDER, MT_ORDER, truncate2, toKhNum, KH_MONTHS_SOLAR
} from "./constants";

export function printHTML(contentHtml: string) {
  const printWin = window.open("", "_blank");
  if (!printWin) {
    const frame = document.getElementById("printFrame") as HTMLIFrameElement;
    if (frame) {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(contentHtml);
        doc.close();
        setTimeout(() => {
          frame.style.display = "block";
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          setTimeout(() => { frame.style.display = "none"; }, 2000);
        }, 700);
      }
    }
    return;
  }
  printWin.document.write(contentHtml);
  printWin.document.close();
  setTimeout(() => {
    printWin.focus();
    printWin.print();
  }, 800);
}

export function buildInvigilatorBoxHTML(d: InvigilatorData): string {
  const sigTag = (sig: string) =>
    sig
      ? `<img src="${sig}" style="height:26px;max-width:140px;display:block;margin-top:0.5px;">`
      : `<div style="height:20px;border-bottom:0.5px dotted #94a3b8;margin-top:1px"></div>`;

  return `<div style="border:1.0px solid #1e3a5f;border-radius:7px;padding:6px 9px;font-size:10px;color:#1e3a5f;line-height:1.2;min-width:225px;max-width:255px">
    <div>អគារ : <strong>${d.building || "……"}</strong>
    <strong>បន្ទប់លេខ : <strong>${d.room || "……"}</strong> &nbsp; វេន: <strong>${d.shift || "……"}</strong></div>
    <div style="border-top:0.5px dashed #93b8d8;margin-top:4px;padding-top:4px">
      <div>១. អនុរក្សឈ្មោះ : <strong>${d.sup1?.name || "…………………"}</strong></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px">${sigTag(d.sup1?.sig || "")}<span style="white-space:nowrap">☎ ${d.sup1?.phone || "……………"}</span></div>
    </div>
    <div style="border-top:0.5px dashed #93b8d8;margin-top:4px;padding-top:4px">
      <div>២. អនុរក្សឈ្មោះ : <strong>${d.sup2?.name || "…………………"}</strong></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:6px">${sigTag(d.sup2?.sig || "")}<span style="white-space:nowrap">☎ ${d.sup2?.phone || "……………"}</span></div>
    </div>
  </div>`;
}

export function buildSignatureHtml(tName: string, selMonth: number, villageName?: string, isAnnual?: boolean) {
  const dates = getThreeWorkingDates(selMonth);
  const rawVil = (villageName || "រោគ").trim();
  const vil = rawVil.startsWith("ភូមិ") ? rawVil : `ភូមិ${rawVil}`;
  const vilPrefix = `${vil}, `;

  if (isAnnual) {
    return `<div class="sig-section" style="display:flex;justify-content:space-between;margin-top:20px;font-size:10px;gap:4px">
    <div class="sig-col" style="text-align:center;flex:1">
      <div style="font-size:13px;font-weight:600;color:#1e3a5f">បានឃើញ និងឯកភាព</div>
      <div style="font-size:9px;text-align:left;color:#374151;line-height:1.6">${dates.d2.lunar}</div>
      <div style="font-size:9px;text-align:left;color:#374151">ស្ពានស្រែង, ${dates.d2.solar}</div>
      <div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px">នាយកកម្រង</div>
    </div>
    <div class="sig-col" style="text-align:center;flex:1">
      <div style="font-size:13px;font-weight:600;color:#1e3a5f">បានឃើញ និងពិនិត្យត្រឹមត្រូវ</div>
      <div style="font-size:9px;text-align:left;color:#374151;line-height:1.6">${dates.d1.lunar}</div>
      <div style="font-size:9px;text-align:left;color:#374151">${vilPrefix}${dates.d1.solar}</div>
      <div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px">នាយកសាលា</div>
    </div>
    <div class="sig-col" style="text-align:center;flex:1">
      <div style="font-size:9px;text-align:left;color:#374151;line-height:1.6">${dates.d0.lunar}</div>
      <div style="font-size:9px;text-align:left;color:#374151">${vilPrefix}${dates.d0.solar}</div>
      <div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px">គ្រូប្រចាំថ្នាក់</div>
      <div style="font-weight:900;color:#1e3a5f;margin-top:20px;font-size:11px;padding-top:2px;border-top:1px dotted #94a3b8">${tName}</div>
    </div>
  </div>`;
  }

  return `<div class="sig-section" style="display:flex;justify-content:space-between;margin-top:20px;font-size:10px;gap:4px">
    <div class="sig-col" style="text-align:center;flex:1">
      <div style="font-size:13px;font-weight:600;color:#1e3a5f">បានឃើញ និងឯកភាព</div>
      <div style="font-size:9px;text-align:left;color:#374151;line-height:1.6">${dates.d2.lunar}</div>
      <div style="font-size:9px;text-align:left;color:#374151">${vilPrefix}${dates.d2.solar}</div>
      <div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px">នាយក/នាយិកា</div>
    </div>
    <div class="sig-col" style="text-align:center;flex:1">
      <div style="font-size:13px;font-weight:600;color:#1e3a5f">បានឃើញ និងអនុម័ត</div>
      <div style="font-size:9px;text-align:left;color:#374151;line-height:1.6">${dates.d1.lunar}</div>
      <div style="font-size:9px;text-align:left;color:#374151">${vilPrefix}${dates.d1.solar}</div>
      <div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px">ប្រធាន គ.គ.ថ.</div>
    </div>
    <div class="sig-col" style="text-align:center;flex:1">
      <div style="font-size:9px;text-align:left;color:#374151;line-height:1.6">${dates.d0.lunar}</div>
      <div style="font-size:9px;text-align:left;color:#374151">${vilPrefix}${dates.d0.solar}</div>
      <div style="font-weight:700;color:#1e3a5f;font-size:10.5px;margin-top:2px">គ្រូប្រចាំថ្នាក់</div>
      <div style="font-weight:900;color:#1e3a5f;margin-top:20px;font-size:11px;padding-top:2px;border-top:1px dotted #94a3b8">${tName}</div>
    </div>
  </div>`;
}

export function buildCandidateDocHTML(s: Student, selClass: string, teacher: TeacherProfile | null, stuList: Student[], scoresMap: Record<string, ScoreMap>, honorPhotos: Record<string, string>): string {
  const annualAvg = getAvg(s.id, stuList, scoresMap);
  const avgDisp = annualAvg !== null ? fmtAvg(annualAvg) : "—";
  const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
  const grade = avgVal !== null ? gradeOf(avgVal) : { l: "—", c: "#6b7280" };
  const rank = getRank(s.id, stuList, scoresMap);
  const photoUrl = honorPhotos[s.id] || s.photoUrl || null;
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";
  const latinName = s.latinName || ((s.lastName || "") + " " + (s.firstName || "")).toUpperCase();
  const districtName = s.district || "ភ្នំស្រុក";
  const provinceName = s.province || "បន្ទាយមានជ័យ";
  const communeName = s.commune || "ស្ពានស្រែង";
  const villageName = s.village || "រោគ";

  const qrPayload = `PLP2026_CANDIDATE|ID:${s.id}|NAME:${s.lastName} ${s.firstName}|CLASS:${selClass}|AVG:${avgVal !== null ? avgVal : '—'}|GRADE:${grade.l}|RANK:${rank !== null ? rank : '—'}|SCHOOL:${schoolName}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(qrPayload)}`;

  return `
  <div class="candidate-doc-page" style="width:100%;max-width:210mm;min-height:297mm;padding:12mm 15mm;background:#fff;font-family:'Hanuman','Battambang',sans-serif;box-sizing:border-box;color:#000;margin:0 auto;border:1px solid #e2e8f0;border-radius:4px;position:relative;">
    
    <div style="text-align:center;margin-bottom:4px;">
      <h2 style="font-size:15px;font-weight:900;margin:0;line-height:1.4;color:#000;">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
      <div style="font-size:11px;margin-top:2px;">꧁ ༺ ༻ ꧂</div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
      <div style="width:2.8cm;text-align:center;flex-shrink:0;padding-top:4px;">
        <img src="${qrUrl}" style="width:2.0cm;height:2.0cm;border:1px solid #1e3a5f;border-radius:6px;display:block;margin:0 auto;padding:2px;background:#fff;" alt="QR Code" />
        <div style="font-size:9px;font-weight:800;color:#1e3a5f;margin-top:2px;">🔍 ផ្ទៀងផ្ទាត់ QR</div>
      </div>

      <div style="flex:1;text-align:center;padding-top:14px;">
        <h3 style="font-size:19px;font-weight:900;margin:0;color:#000;letter-spacing:0.5px;">សលាកបត្របេក្ខជន</h3>
      </div>

      <div style="width:2.8cm;height:3.8cm;border:1.5px solid #000;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:#f9fafb;flex-shrink:0;position:relative;">
        ${photoUrl ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;" />` : `<div style="text-align:center;font-size:11px;color:#666;">រូបថត ៤x៦<br><span style="font-size:24px;">${s.gender === "ស្រី" ? "👩" : "👨"}</span></div>`}
        <div style="position:absolute;bottom:2px;font-size:10px;font-weight:700;background:rgba(255,255,255,0.85);width:100%;text-align:center;">ភេទ ${s.gender || "—"}</div>
      </div>
    </div>

    <div style="font-size:13px;line-height:2.2;color:#000;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;">
        <span>គោត្តនាម - នាម ៖ <strong style="font-size:14px;">${s.lastName || ""} ${s.firstName || ""}</strong></span>
        <span>អក្សរឡាតាំង ៖ <strong>${latinName}</strong></span>
        <span>ភេទ ៖ <strong>${s.gender || "—"}</strong></span>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <span>ជាតិខ្មែរ សញ្ជាតិខ្មែរ</span>
        <span>កើតនៅថ្ងៃទី <strong>${s.dob || '……/……/……'}</strong></span>
        <span>នៅភូមិ <strong>${villageName}</strong> ឃុំ <strong>${communeName}</strong> ស្រុក <strong>${districtName}</strong> ខេត្ត <strong>${provinceName}</strong></span>
      </div>

      <div>
        ជាសិស្ស ថ្នាក់ទី <strong>${selClass}</strong> នៃ <strong>${schoolName}</strong>
      </div>

      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;">
        <span>ឪពុកឈ្មោះ ៖ <strong>${s.fatherName || '………………………………'}</strong></span>
        <span>មុខរបរ ៖ <strong>${s.fatherJob || '………………………………'}</strong></span>
      </div>

      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;">
        <span>ម្ដាយឈ្មោះ ៖ <strong>${s.motherName || '………………………………'}</strong></span>
        <span>មុខរបរ ៖ <strong>${s.motherJob || '………………………………'}</strong></span>
      </div>

      <div>
        អាសយដ្ឋានបច្ចុប្បន្ន ៖ <strong>នៅភូមិ ${villageName} ឃុំ/សង្កាត់ ${communeName} ស្រុក ${districtName} ខេត្ត ${provinceName}</strong>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-top:2px;">
        <span>ត្រូវបានឡើងថ្នាក់ទី ៧ នៃអនុវិទ្យាល័យ <strong>ស្ពានមេត្រី</strong></span>
        <span>មធ្យមភាគប្រចាំឆ្នាំសិក្សា ៖ <strong style="font-size:15px;color:#000;">${avgDisp}</strong> &nbsp;&nbsp;&nbsp;&nbsp; និទ្ទេស ៖ <strong style="font-size:16px;color:${grade.c};font-weight:900;">${grade.l}</strong></span>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:20px;font-size:11.5px;line-height:1.6;text-align:center;">
      <div style="width:48%;">
        <div style="font-weight:700;">បានឃើញ និងឯកភាព</div>
        <div>ថ្ងៃ……………ខែ……………ឆ្នាំមមី អដ្ឋស័ក ព.ស ២៥៧០</div>
        <div>${districtName}, ថ្ងៃទី…… ខែ…… គ.ស ២០២៦</div>
        <div style="font-weight:700;margin-top:6px;">ប្រធានគណៈកម្មការជ្រើសរើសស្រុក</div>
      </div>
      <div style="width:48%;">
        <div>ថ្ងៃព្រហស្បតិ៍ ៥កើត ខែជេស្ឋ ឆ្នាំម្សាញ់ សប្តស័ក ព.ស. ២៥៦៩</div>
        <div>រោគ, ថ្ងៃទី២៨ ខែសីហា គ.ស ២០២៥</div>
        <div style="font-weight:700;margin-top:6px;">ហត្ថលេខាបេក្ខជន</div>
        <div style="margin-top:40px;font-weight:700;font-size:13.5px;">${s.lastName || ""} ${s.firstName || ""}</div>
      </div>
    </div>

    <div style="margin:25px 0 20px;border-top:1.5px dashed #444;position:relative;">
      <span style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#fff;padding:0 10px;font-size:10px;color:#666;">✂️ កាត់ត្រឹមនេះ</span>
    </div>

    <div style="text-align:center;margin-bottom:4px;">
      <h2 style="font-size:15px;font-weight:900;margin:0;line-height:1.4;color:#000;">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
      <div style="font-size:11px;margin-top:2px;">꧁ ༺ ༻ ꧂</div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
      <div style="width:2.8cm;text-align:center;flex-shrink:0;padding-top:4px;">
        <img src="${qrUrl}" style="width:2.0cm;height:2.0cm;border:1px solid #1e3a5f;border-radius:6px;display:block;margin:0 auto;padding:2px;background:#fff;" alt="QR Code" />
        <div style="font-size:9px;font-weight:800;color:#1e3a5f;margin-top:2px;">🔍 ផ្ទៀងផ្ទាត់ QR</div>
      </div>

      <div style="flex:1;text-align:center;padding-top:10px;">
        <h3 style="font-size:17px;font-weight:900;margin:0;color:#000;">លិខិតបញ្ជាក់ពីឪពុក ឬ អាណាព្យាបាល</h3>
      </div>

      <div style="width:2.8cm;flex-shrink:0;"></div>
    </div>

    <div style="font-size:13px;line-height:2.2;text-align:justify;color:#000;">
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;យើងខ្ញុំឈ្មោះ ៖ <strong>${s.fatherName || s.motherName || '………………………………………………'}</strong> ត្រូវជាឪពុក ឬម្ដាយ និងជាអាណាព្យាបាលរបស់សិស្សឈ្មោះ ៖ <strong>${s.lastName || ""} ${s.firstName || ""}</strong> ភេទ ៖ <strong>${s.gender || "—"}</strong> កើតនៅថ្ងៃទី <strong>${s.dob || '……/……/……'}</strong> នៅភូមិ <strong>${villageName}</strong> ឃុំ <strong>${communeName}</strong> ស្រុក <strong>${districtName}</strong> ខេត្ត <strong>${provinceName}</strong> ជាសិស្ស ថ្នាក់ទី <strong>${selClass}</strong> នៃ <strong>${schoolName}</strong> ក្នុងឆ្នាំសិក្សា <strong>២០២៥ - ២០២៦</strong>។
      <br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;សូមបញ្ជាក់ថាសិស្ស ឈ្មោះ ថ្ងៃ ខែ ឆ្នាំ កំណើត និងទីកន្លែងកំណើត ខាងលើនេះ ៖ ពិតជាកូនរបស់យើងខ្ញុំ និងត្រឹមត្រូវតាមតារាង បន្ទុកគ្រួសារ និងតាមប្រវត្តិរូប ពិតប្រាកដមែន។
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:20px;font-size:11.5px;line-height:1.6;text-align:center;">
      <div style="width:55%;">
        <div>ថ្ងៃព្រហស្បតិ៍ ៥កើត ខែជេស្ឋ ឆ្នាំម្សាញ់ សប្តស័ក ព.ស. ២៥៦៩</div>
        <div>រោគ, ថ្ងៃទី២៨ ខែសីហា គ.ស ២០២៥</div>
        <div style="font-weight:700;margin-top:6px;">ហត្ថលេខាឪពុក/ម្ដាយ ឬជាអាណាព្យាបាលរបស់សិស្ស</div>
      </div>
    </div>

  </div>
  `;
}

export async function generateStudentQRCodeDataUrl(
  s: Student,
  selClass: string,
  schoolName: string,
  avgVal: number | null,
  grade: string,
  rank: number | string
): Promise<string> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const verifyUrl = `${origin}/?verifyStudentId=${encodeURIComponent(s.id)}&class=${encodeURIComponent(selClass)}&name=${encodeURIComponent((s.lastName || "") + " " + (s.firstName || ""))}&avg=${avgVal !== null ? avgVal : ""}&grade=${encodeURIComponent(grade)}&rank=${encodeURIComponent(String(rank))}&school=${encodeURIComponent(schoolName)}`;

  try {
    return await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 220,
      color: {
        dark: "#1e3a5f",
        light: "#ffffff",
      },
    });
  } catch (err) {
    const qrPayload = `PLP2026_VERIFY|ID:${s.id}|NAME:${s.lastName} ${s.firstName}|CLASS:${selClass}|AVG:${avgVal}|GRADE:${grade}|RANK:${rank}|SCHOOL:${schoolName}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrPayload)}`;
  }
}

export function buildCertificateHTML(
  s: Student,
  selClass: string,
  teacher: TeacherProfile | null,
  stuList: Student[],
  scoresMap: Record<string, ScoreMap>,
  customQrUrl?: string
): string {
  const annualAvg = getAvg(s.id, stuList, scoresMap);
  const avgVal = annualAvg !== null ? Number(fmtAvg(annualAvg)) : null;
  const grade = avgVal !== null ? gradeOf(avgVal) : { l: "—", c: "#6b7280" };
  const rank = getRank(s.id, stuList, scoresMap);
  const resultText = avgVal !== null ? resultOf(avgVal) : "—";
  const schoolName = teacher?.school || "សាលាបឋមសិក្សា";
  const latinName = s.latinName || ((s.lastName || "") + " " + (s.firstName || "")).toUpperCase();
  const districtName = s.district || "ភ្នំស្រុក";
  const provinceName = s.province || "បន្ទាយមានជ័យ";
  const communeName = s.commune || "ស្ពានស្រែង";
  const villageName = s.village || "រោគ";

  const qrPayload = `PLP2026_VERIFY|ID:${s.id}|NAME:${s.lastName} ${s.firstName}|CLASS:${selClass}|AVG:${avgVal}|GRADE:${grade.l}|RANK:${rank}|SCHOOL:${schoolName}`;
  const qrUrl = customQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrPayload)}`;

  return `
  <div class="cert-page" style="width:100%;max-width:210mm;min-height:297mm;padding:15mm 12mm;background:#fff;border:10px double #1e3a5f;box-sizing:border-box;margin:0 auto;position:relative;font-family:'Hanuman','Battambang',sans-serif;color:#1e3a5f;border-radius:4px;page-break-after:always;">
    
    <div style="border:2px solid #b45309;padding:18px 22px;min-height:260mm;display:flex;flex-direction:column;justify-content:space-between;position:relative;background:#fafcfb;">
      
      <div style="text-align:center;line-height:1.5;">
        <h2 style="font-size:16px;font-weight:900;margin:0;color:#1e3a5f;">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
        <div style="font-size:12px;color:#b45309;margin-top:2px;">꧁ ༺ ༻ ꧂</div>
        <div style="font-size:12px;font-weight:700;margin-top:10px;text-align:left;color:#1e3a5f;line-height:1.6;">
          ក្រសួងអប់រំ យុវជន និងកីឡា<br>
          មន្ទីរអប់រំ យុវជន និងកីឡា${provinceName}<br>
          <strong>${schoolName}</strong>
        </div>
      </div>

      <div style="text-align:center;margin:20px 0 10px;">
        <h1 style="font-size:24px;font-weight:900;color:#1e3a5f;letter-spacing:1px;margin:0;">វិញ្ញាបនបត្របញ្ជាក់ការសិក្សា</h1>
        <div style="font-size:12px;font-weight:800;color:#b45309;margin-top:4px;letter-spacing:1px;">CERTIFICATE OF EDUCATION</div>
      </div>

      <div style="font-size:14px;line-height:2.3;color:#111827;text-align:center;padding:0 10px;">
        នាយក <strong>${schoolName}</strong><br> សូមបញ្ជាក់ថា ៖<br>
        សិស្សឈ្មោះ ៖ <strong style="font-size:18px;color:#1e3a5f;">${s.lastName || ""} ${s.firstName || ""}</strong> &nbsp;&nbsp;&nbsp;&nbsp; អក្សរឡាតាំង ៖ <strong style="font-size:15px;color:#1e3a5f;">${latinName}</strong><br>
        ភេទ ៖ <strong>${s.gender || "—"}</strong> &nbsp;&nbsp;&nbsp;&nbsp; ថ្ងៃខែឆ្នាំកំណើត ៖ <strong>${s.dob || '……/……/……'}</strong><br>
        ទីកន្លែងកំណើត ៖ <strong>ភូមិ ${villageName} ឃុំ ${communeName} ស្រុក ${districtName} ខេត្ត ${provinceName}</strong><br>
        បានសិក្សានៅ <strong>${schoolName}</strong> ថ្នាក់ទី <strong>${selClass}</strong> ក្នុងឆ្នាំសិក្សា <strong>២០២៥-២០២៦</strong><br>
        ដោយទទួលបានលទ្ធផលប្រឡងប្រចាំឆ្នាំ ៖
      </div>

      <div style="display:flex;justify-content:center;gap:14px;margin:15px 0;text-align:center;flex-wrap:wrap;">
        <div style="background:#f0f9ff;border:2px solid #3b82f6;border-radius:12px;padding:10px 16px;min-width:110px;">
          <div style="font-size:11px;color:#1d4ed8;font-weight:700;">មធ្យមភាគ</div>
          <div style="font-size:22px;font-weight:900;color:#1e3a5f;">${avgVal !== null ? fmtAvg(avgVal) : '—'}</div>
        </div>
        <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:10px 16px;min-width:110px;">
          <div style="font-size:11px;color:#15803d;font-weight:700;">និទ្ទេស</div>
          <div style="font-size:22px;font-weight:900;color:${grade.c};">${grade.l}</div>
        </div>
        <div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:12px;padding:10px 16px;min-width:110px;">
          <div style="font-size:11px;color:#b45309;font-weight:700;">ចំណាត់ថ្នាក់</div>
          <div style="font-size:22px;font-weight:900;color:#b45309;"> ${rank !== null ? rank : '—'}</div>
        </div>
        <div style="background:${resultText === 'ជាប់' ? '#f0fdf4' : '#fef2f2'};border:2px solid ${resultText === 'ជាប់' ? '#16a34a' : '#dc2626'};border-radius:12px;padding:10px 16px;min-width:110px;">
          <div style="font-size:11px;color:${resultText === 'ជាប់' ? '#15803d' : '#dc2626'};font-weight:700;">លទ្ធផល</div>
          <div style="font-size:22px;font-weight:900;color:${resultText === 'ជាប់' ? '#15803d' : '#dc2626'};">${resultText}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:15px;padding:0 10px;">
        <div style="text-align:center;border:1.5px dashed #2563eb;padding:8px;border-radius:12px;background:#fff;width:145px;">
          <img src="${qrUrl}" style="width:110px;height:110px;display:block;margin:0 auto;border:1px solid #e2e8f0;border-radius:6px;" alt="QR Code" />
          <div style="font-size:10px;font-weight:800;color:#2563eb;margin-top:4px;">🔍 QR ផ្ទៀងផ្ទាត់ព័ត៌មាន</div>
          <div style="font-size:8.5px;color:#6b7280;">Scan to Verify Credentials</div>
        </div>

        <div style="text-align:center;font-size:12px;line-height:1.6;color:#1e3a5f;">
          <div>ថ្ងៃ...................ខែ...................ឆ្នាំម្សាញ់ សប្តស័ក ព.ស. ២៥៦៩</div>
          <div>${villageName}, ថ្ងៃទី២៨ ខែសីហា គ.ស ២០២៥</div>
          <div style="font-weight:900;font-size:14px;margin-top:6px;">នាយកសាលា</div>
          <div style="margin-top:55px;font-weight:800;font-size:14px;">${teacher?.fullName || ''}</div>
        </div>
      </div>

      <div style="text-align:center;font-size:10px;color:#6b7280;margin-top:10px;border-top:1px solid #e2e8f0;padding-top:6px;">
        វិញ្ញាបនបត្រនេះត្រូវបានចេញផ្សាយតាមប្រព័ន្ធគ្រប់គ្រងសិស្ស PLP2026 · ផ្ទៀងផ្ទាត់ដោយ QR Code
      </div>

    </div>
  </div>
  `;
}

export function buildStudentCardHTML(
  s: Student,
  selClass: string,
  teacher: TeacherProfile | null,
  scoresMap: Record<string, ScoreMap>,
  attendanceMap: Record<string, AttendanceMap>,
  selMonth: number,
  semester: string,
  stuList: Student[]
): string {
  const school = teacher?.school || "សាលាបឋមសិក្សា";
  const tName2 = `${teacher?.title || ""} ${teacher?.fullName || ""}`.trim();
  const tchPhone = teacher?.phone || "—";

  const cleanStudentId = (s.code && String(s.code).trim()) 
    ? toKhNum(s.code) 
    : (s.id && !s.id.includes('-') && s.id.length <= 8 && !isNaN(Number(s.id))) 
      ? toKhNum(s.id) 
      : toKhNum(String((stuList.findIndex(st => st.id === s.id) >= 0 ? stuList.findIndex(st => st.id === s.id) : 0) + 1).padStart(2, '0'));

  let allVals: number[] = [];
  const subjectRowsHtml = SUBJECTS.map((subj, ri) => {
    const raw = scoresMap[s.id]?.[subj];
    const val = (raw !== undefined && raw !== "" && raw !== null && !isNaN(Number(raw))) ? Number(raw) : null;
    if (val !== null) allVals.push(val);
    const g = gradeOf(val !== null ? val : -1);
    const gc = val === null ? "color: red; font-weight: 700;" : val >= 9.5 ? "color: #15803d; font-weight: 700;" : val >= 8.0 ? "color: #1d4ed8; font-weight: 700;" : val >= 7.0 ? "color: #b45309; font-weight: 700;" : val >= 6.5 ? "color: #c2410c; font-weight: 700;" : val >= 5.0 ? "color: #cc6600; font-weight: 700;" : "color: red; font-weight: 700;";
    return `<tr><td style="border: 1px solid #003366; padding: 4px; text-align: center;">${ri + 1}</td><td style="border: 1px solid #003366; padding: 4px 6px; text-align: left;">${subj}</td><td style="border: 1px solid #003366; padding: 4px; text-align: center; font-weight: 700;">${val !== null ? fmtAvg(val) : "0.00"}</td><td style="border: 1px solid #003366; padding: 4px; text-align: center; ${gc}">${val !== null ? g.l : "F"}</td><td style="border: 1px solid #003366;"></td></tr>`;
  }).join("");

  const overallAvg = allVals.length > 0 ? truncate2(allVals.reduce((a, b) => a + b, 0) / allVals.length) : null;
  const overallDisp = overallAvg !== null ? fmtAvg(overallAvg) : "0.00";
  const overallG = gradeOf(overallAvg !== null ? overallAvg : -1);
  const overallGC = overallAvg === null ? "color: red; font-weight: 700;" : overallAvg >= 9.5 ? "color: #15803d; font-weight: 700;" : overallAvg >= 8.0 ? "color: #1d4ed8; font-weight: 700;" : overallAvg >= 7.0 ? "color: #b45309; font-weight: 700;" : overallAvg >= 6.5 ? "color: #c2410c; font-weight: 700;" : overallAvg >= 5.0 ? "color: #cc6600; font-weight: 700;" : "color: red; font-weight: 700;";

  const stuRank = getRank(s.id, stuList, scoresMap) ?? "—";

  const stuAtt = attendanceMap[s.id] || {};
  const attAbs = Object.values(stuAtt).filter(v => v === "A").length;
  const attPres = Object.values(stuAtt).filter(v => v === "P").length;

  let dob = "—";
  if (s.dob) {
    try {
      const d = new Date(s.dob);
      dob = toKhNum(d.getDate()) + " " + KH_MONTHS_SOLAR[d.getMonth()] + " " + toKhNum(d.getFullYear());
    } catch (e) {
      dob = s.dob;
    }
  }

  const addr = [s.village, s.commune, s.district, s.province].filter(Boolean).join(" ") || "—";

  const remarkMap: Record<string, string> = {
    A: "ទទួលបាននិទ្ទេស <strong>A</strong> — លទ្ធផលល្អប្រសើរ!",
    B: "ទទួលបាននិទ្ទេស <strong>B</strong> — លទ្ធផលល្អ!",
    C: "ទទួលបាននិទ្ទេស <strong>C</strong> — ត្រូវខំប្រឹងបន្ថែម!",
    D: "ទទួលបាននិទ្ទេស <strong>D</strong> — ត្រូវខំប្រឹងរៀន!",
    E: "ទទួលបាននិទ្ទេស <strong>E</strong> — ត្រូវខិតខំប្រឹងរៀន!",
    F: "ទទួលបាននិទ្ទេស <strong>F</strong> — ត្រូវខំប្រឹងពិសេស!",
  };
  const remarkText = remarkMap[overallG.l] || remarkMap.F;
  const dates = getThreeWorkingDates(selMonth);

  return `
  <div class="sc-wrap" style="border: 2px solid #003366; padding: 12px 14px; background: #fff; font-size: 11px; min-height: 520px; display: flex; flex-direction: column; font-family: 'Hanuman','Battambang',sans-serif; color: #1e293b; box-sizing: border-box; width: 100%; border-radius: 4px;">
    <div class="sc-main" style="display: flex; gap: 12px; width: 100%; flex: 1;">
      <div class="sc-left" style="width: 50%; padding-right: 12px; border-right: 2px dashed #003366; box-sizing: border-box;">
        <div class="sc-header-kh" style="text-align: center; line-height: 1.4; margin-bottom: 8px; color: #003366;">
          <h3 style="font-size: 13px; font-weight: 700; margin: 2px 0; color: #003366;">ព្រះរាជាណាចក្រកម្ពុជា<br>ជាតិ សាសនា ព្រះមហាក្សត្រ<br>---------</h3>
          <h3 style="text-align: left; font-size: 12px; font-weight: 700; margin-top: 4px; color: #003366;">${school}</h3>
          <div style="text-align: center; margin: 6px 0; font-size: 11px; font-weight: 700;">តាមដានការសិក្សារបស់សិស្សសម្រាប់ខែ${MONTHS[selMonth]}<br>ថ្នាក់ទី<strong>${selClass}</strong></div>
        </div>
        <table class="sc-info-tbl" style="width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.6;">
          <tbody>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">អត្តលេខ :</td><td style="padding: 3px 6px;"><strong>${cleanStudentId}</strong></td><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ឆ្នាំសិក្សា :</td><td style="padding: 3px 6px;"><strong>២០២៥-២០២៦</strong></td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ឈ្មោះសិស្ស :</td><td colspan="2" style="padding: 3px 6px;"><strong>${s.lastName || ""} ${s.firstName || ""}</strong></td><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ភេទ :</td><td style="padding: 3px 6px;"><strong>${s.gender || "—"}</strong></td></tr>
            <tr><td colspan="4" style="padding: 3px 6px;">ថ្ងៃខែឆ្នាំកំណើត : <strong>${dob}</strong></td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ឈ្មោះឪពុក :</td><td style="padding: 3px 6px;"><strong>${s.fatherName || "—"}</strong></td><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">មុខរបរ :</td><td style="padding: 3px 6px;"><strong>${s.fatherJob || "-"}</strong></td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ឈ្មោះម្តាយ :</td><td style="padding: 3px 6px;"><strong>${s.motherName || "—"}</strong></td><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">មុខរបរ :</td><td style="padding: 3px 6px;"><strong>${s.motherJob || "-"}</strong></td></tr>
            <tr><td colspan="4" style="padding: 3px 6px;">ទីលំនៅ : ${addr}</td></tr>
            <tr><td colspan="2" style="padding: 3px 6px;">☎ គ្រូប្រចាំថ្នាក់ :</td><td colspan="2" style="padding: 3px 6px;"><strong>${tchPhone}</strong></td></tr>
            <tr><td colspan="2" style="padding: 3px 6px;">ចំនួនអវត្តមាន :</td><td colspan="2" style="padding: 3px 6px;">មានច្បាប់ <strong>${attPres}</strong> ដង ឥតច្បាប់ <strong>${attAbs}</strong> ដង</td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">មធ្យមភាគ :</td><td colspan="3" style="padding: 3px 6px;"><strong style="font-size: 13px; color: #1e3a5f;">${overallDisp}</strong></td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">ចំណាត់ថ្នាក់ :</td><td colspan="3" style="padding: 3px 6px;"><strong style="font-size: 13px; color: #1e3a5f;">${stuRank}</strong></td></tr>
            <tr><td style="font-weight: 700; background: #f0f4fa; color: #1e3a5f; padding: 3px 6px; white-space: nowrap;">និទ្ទេស :</td><td colspan="3" style="padding: 3px 6px;"><strong style="font-size: 14px; ${overallGC}">${overallG.l}</strong></td></tr>
          </tbody>
        </table>
        <div class="sc-remark" style="margin-top: 10px; padding: 8px 10px; border: 1px solid #003366; line-height: 1.7; font-size: 11px; background: #fefefe; border-radius: 6px;">
          <strong>មូលវិចារគ្រូប្រចាំថ្នាក់ :</strong><br>សិស្ស ${s.lastName || ""} ${s.firstName || ""} ${remarkText}
        </div>
      </div>
      <div class="sc-right" style="width: 50%; padding-left: 12px; box-sizing: border-box;">
        <h2 style="text-align: center; color: #b30000; font-size: 14px; font-weight: 800; margin: 0 0 8px;">លទ្ធផលសិក្សាសម្រាប់ ខែ${MONTHS[selMonth]}</h2>
        <table class="sc-main-tbl" style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #003366; color: #fff;">
              <th style="border: 1px solid #003366; padding: 5px 4px; text-align: center; width: 30px;">ល.រ</th>
              <th style="border: 1px solid #003366; padding: 5px 4px; text-align: left;">មុខវិជ្ជា</th>
              <th style="border: 1px solid #003366; padding: 5px 4px; text-align: center; width: 45px;">ពិន្ទុ</th>
              <th style="border: 1px solid #003366; padding: 5px 4px; text-align: center; width: 45px;">និទ្ទេស</th>
              <th style="border: 1px solid #003366; padding: 5px 4px; text-align: center; width: 45px;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRowsHtml}
            <tr style="background: #f1f5f9; font-weight: 800;">
              <td colspan="2" style="border: 1px solid #003366; padding: 5px 6px; text-align: left; color: #1e3a5f;">មធ្យមភាគរួម</td>
              <td style="border: 1px solid #003366; padding: 5px 4px; text-align: center; color: #1e3a5f; font-size: 12px;">${overallDisp}</td>
              <td style="border: 1px solid #003366; padding: 5px 4px; text-align: center; ${overallGC} font-size: 13px;">${overallG.l}</td>
              <td style="border: 1px solid #003366;"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="sc-footer" style="margin-top: 16px; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; line-height: 1.8; border: none;">
      <div class="sc-foot-col" style="width: 32%; text-align: center;">
        <span style="font-size: 10px; color: #374151;">${dates.d0.lunar}</span><br>
        <span style="font-size: 10px; color: #374151;">${dates.d0.solar}</span><br>
        <strong>គ្រូបន្ទុកថ្នាក់</strong><br><br>
        <strong style="color: #1e3a5f;">${tName2}</strong>
      </div>
      <div class="sc-foot-col" style="width: 32%; text-align: center;">
        <strong>មតិរបស់អាណាព្យាបាល</strong><br><br><br>.......................................................................
      </div>
      <div class="sc-foot-col" style="width: 32%; text-align: center;">
        <strong>បានឃើញ និងឯកភាព</strong><br>
        <span style="font-size: 10px; color: #374151;">${dates.d2.lunar}</span><br>
        <span style="font-size: 10px; color: #374151;">${dates.d2.solar}</span><br>
        <strong>នាយកសាលា</strong>
      </div>
    </div>
  </div>`;
}

export function buildTraineeBookHTML(
  s: Student,
  sIdx: number,
  selClass: string,
  teacher: TeacherProfile | null,
  scoresMap: Record<string, ScoreMap>,
  attendanceMap: Record<string, AttendanceMap>,
  stuList: Student[]
): string {
  const school = teacher?.school || "សាលាបឋមសិក្សា រោគ";
  const tName = `${teacher?.title || ""} ${teacher?.fullName || ""}`.trim();
  const dates = getThreeWorkingDates(0);

  const cleanStudentId = (s.code && String(s.code).trim()) 
    ? toKhNum(s.code) 
    : (s.id && !s.id.includes('-') && s.id.length <= 8 && !isNaN(Number(s.id))) 
      ? toKhNum(s.id) 
      : toKhNum(String(sIdx + 1).padStart(2, '0'));

  const TRAINEE_SUBJECTS = [
    { no: 1, name: "សមត្ថភាពអាន", keys: ["សមត្ថភាពអាន", "អាន"] },
    { no: 2, name: "សមត្ថភាពស្ដាប់ និងនិយាយ", keys: ["សមត្ថភាពស្ដាប់", "សមត្ថភាពនិយាយ", "ស្ដាប់", "និយាយ"] },
    { no: 3, name: "សរសេរតាមអាន", keys: ["សមត្ថភាពសរសេរ", "សរសេរ"] },
    { no: 4, name: "តែងសេចក្តី", keys: ["តែងសេចក្តី", "ភាសាខ្មែរ"] },
    { no: 5, name: "គណិតវិទ្យា", keys: ["គណិតវិទ្យា", "ចំនួន", "រង្វាស់រង្វាល់", "ធរណីមាត្រ", "ពីជគណិត", "ស្ថិតិ"] },
    { no: 6, name: "វិទ្យាសាស្រ្ត", keys: ["វិទ្យាសាស្ត្រ", "វិទ្យាសាស្រ្ត"] },
    { no: 7, name: "សិក្សាសង្គម", keys: ["សិក្សាសង្គម", "សង្គម"] },
    { no: 8, name: "គេហៈ-សិល្បៈ", keys: ["គេហ-សិល្បៈ", "គេហៈ-សិល្បៈ"] },
    { no: 9, name: "អប់រំកាយ-សុខភាព", keys: ["អប់រំកាយ-សុខភាព", "អប់រំកាយ"] },
    { no: 10, name: "បំណិនជីវិត", keys: ["បំណិន", "បំណិនជីវិត"] },
    { no: 11, name: "ភាសាបរទេស", keys: ["ភាសាបរទេស", "អង់គ្លេស"] },
  ];

  const stuScores = scoresMap[s.id] || {};
  let totalScore = 0;
  let scoreCount = 0;

  TRAINEE_SUBJECTS.forEach((sub) => {
    let matchedVal: number | null = null;
    for (const k of sub.keys) {
      if (stuScores[k] !== undefined && stuScores[k] !== "" && !isNaN(Number(stuScores[k]))) {
        matchedVal = Number(stuScores[k]);
        break;
      }
    }
    if (matchedVal !== null) {
      totalScore += matchedVal;
      scoreCount++;
    }
  });

  const avgVal = scoreCount > 0 ? truncate2(totalScore / scoreCount) : 0;
  const overallGrade = gradeOf(avgVal).l;

  const stuAtt = attendanceMap[s.id] || {};
  const attAbs = Object.values(stuAtt).filter((v) => v === "A").length;
  const attPres = Object.values(stuAtt).filter((v) => v === "P").length;

  let dob = "—";
  if (s.dob) {
    try {
      const d = new Date(s.dob);
      dob = toKhNum(d.getDate()) + "/" + toKhNum(d.getMonth() + 1) + "/" + toKhNum(d.getFullYear());
    } catch (e) {
      dob = s.dob;
    }
  }

  const subjectRowsHTML = TRAINEE_SUBJECTS.map((sub) => {
    let subScore: number | null = null;
    for (const k of sub.keys) {
      if (stuScores[k] !== undefined && stuScores[k] !== "" && !isNaN(Number(stuScores[k]))) {
        subScore = Number(stuScores[k]);
        break;
      }
    }
    const scoreDisp = subScore !== null ? fmtAvg(subScore) : "0.00";
    const subGrade = subScore !== null ? gradeOf(subScore).l : "-";
    return `
      <tr>
        <td>${sub.no}</td>
        <td style="text-align: left; padding-left: 6px; font-weight: 600;">${sub.name}</td>
        <td>${scoreDisp}</td>
        <td>${subGrade}</td>
        <td>${scoreDisp}</td>
        <td>${subGrade}</td>
        <td style="font-weight: 700;">${scoreDisp}</td>
        <td style="font-weight: 700;">${subGrade}</td>
        <td></td>
      </tr>
    `;
  }).join("");

  let extraRowsHTML = "";
  for (let r = 12; r <= 17; r++) {
    extraRowsHTML += `<tr><td>${r}</td><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  }

  return `
  <div class="trainee-card-wrap" style="border: 2px solid #334155; padding: 10px 12px; background: #fff; font-size: 11px; min-height: 520px; display: flex; flex-direction: column; font-family: 'Hanuman','Battambang',sans-serif; color: #0f172a; box-sizing: border-box; width: 100%; border-radius: 4px;">
    <style>
      .tb-tbl { border-collapse: collapse; width: 100%; border: 1px solid #334155; font-size: 10.5px; }
      .tb-tbl td, .tb-tbl th { border: 1px solid #334155; padding: 4px 5px; text-align: center; vertical-align: middle; line-height: 1.3; }
      .tb-hdr { background: #f8fafc; font-weight: 700; color: #0f172a; }
    </style>

    <div style="display: flex; gap: 12px; width: 100%; flex: 1;">
      <!-- LEFT SIDE (50%) -->
      <div style="width: 50%; padding-right: 12px; border-right: 2px dashed #003366; box-sizing: border-box; display: flex; flex-direction: column;">
        <table class="tb-tbl" style="margin-bottom: 6px;">
          <tbody>
            <tr class="tb-hdr">
              <td style="width:35px;">ល.រ</td>
              <td style="width:80px;">អត្តលេខ</td>
              <td style="text-align: left; padding-left: 6px;">គោត្តនាម និងនាម</td>
              <td style="width:40px;">ភេទ</td>
              <td style="width:95px;">ថ្ងៃខែឆ្នាំកំណើត</td>
            </tr>
            <tr>
              <td>${toKhNum(sIdx + 1)}</td>
              <td style="font-weight: 700; color: #1e3a5f;">${cleanStudentId}</td>
              <td style="text-align: left; padding-left: 6px; font-weight: 800; color: #1e3a5f;">${s.lastName} ${s.firstName}</td>
              <td>${s.gender}</td>
              <td>${dob}</td>
            </tr>
          </tbody>
        </table>

        <div style="font-weight: 700; text-align: center; padding: 4px; background: #f1f5f9; border: 1px solid #334155; border-bottom: none; font-size: 11px; color: #1e3a5f;">
          លទ្ធផលនៃការសិក្សា
        </div>

        <table class="tb-tbl">
          <thead>
            <tr class="tb-hdr">
              <th rowspan="2" style="width:28px;">ល.រ</th>
              <th rowspan="2" style="text-align: left; padding-left: 6px;">មុខវិជ្ជា</th>
              <th colspan="2">ឆមាសទី ១</th>
              <th colspan="2">ឆមាសទី ២</th>
              <th colspan="2">ប្រចាំឆ្នាំ</th>
              <th rowspan="2" style="width:75px;">មូលវិចារ/ហត្ថលេខា</th>
            </tr>
            <tr class="tb-hdr">
              <th style="width:38px;">ពិន្ទុ</th>
              <th style="width:35px;">និទ្ទេស</th>
              <th style="width:38px;">ពិន្ទុ</th>
              <th style="width:35px;">និទ្ទេស</th>
              <th style="width:38px;">ពិន្ទុ</th>
              <th style="width:35px;">និទ្ទេស</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRowsHTML}
            ${extraRowsHTML}

            <!-- Summary rows -->
            <tr style="font-weight: 700; background: #f8fafc;">
              <td>18</td>
              <td style="text-align: left; padding-left: 6px;">សរុបពិន្ទុប្រឡងឆមាស</td>
              <td>${fmtAvg(totalScore)}</td>
              <td>&nbsp;</td>
              <td>${fmtAvg(totalScore)}</td>
              <td>&nbsp;</td>
              <td>${fmtAvg(totalScore)}</td>
              <td>&nbsp;</td>
              <td rowspan="4" style="vertical-align: middle; padding: 4px; font-size: 10px;">
                <strong>គ្រូប្រចាំថ្នាក់:</strong><br>
                <span style="color: #1e3a5f;">${tName}</span>
              </td>
            </tr>
            <tr style="font-weight: 700; background: #f8fafc;">
              <td>19</td>
              <td style="text-align: left; padding-left: 6px;">មធ្យមភាគពិន្ទុប្រឡងឆមាស</td>
              <td>${fmtAvg(avgVal)}</td>
              <td>${overallGrade}</td>
              <td>${fmtAvg(avgVal)}</td>
              <td>${overallGrade}</td>
              <td>${fmtAvg(avgVal)}</td>
              <td>${overallGrade}</td>
            </tr>
            <tr style="font-weight: 700; background: #f8fafc;">
              <td>20</td>
              <td style="text-align: left; padding-left: 6px;">មធ្យមភាគពិន្ទុខែប្រចាំឆមាស</td>
              <td>${fmtAvg(avgVal)}</td>
              <td>${overallGrade}</td>
              <td>${fmtAvg(avgVal)}</td>
              <td>${overallGrade}</td>
              <td>${fmtAvg(avgVal)}</td>
              <td>${overallGrade}</td>
            </tr>
            <tr style="font-weight: 700; background: #f8fafc;">
              <td>21</td>
              <td style="text-align: left; padding-left: 6px;">មធ្យមភាគពិន្ទុប្រចាំឆមាស</td>
              <td>${fmtAvg(avgVal)}</td>
              <td>${overallGrade}</td>
              <td>${fmtAvg(avgVal)}</td>
              <td>${overallGrade}</td>
              <td>${fmtAvg(avgVal)}</td>
              <td>${overallGrade}</td>
            </tr>
          </tbody>
        </table>

        <!-- Absence Table -->
        <div style="margin-top: 8px;">
          <div style="font-weight: 700; text-align: center; padding: 3px; background: #f1f5f9; border: 1px solid #334155; border-bottom: none; font-size: 10.5px;">
            ចំនួនអវត្តមានក្នុងឆ្នាំសិក្សា
          </div>
          <table class="tb-tbl">
            <thead>
              <tr class="tb-hdr">
                <th style="text-align: left; padding-left: 6px;">អវត្តមាន</th>
                <th style="width: 60px;">ឆមាសទី ១</th>
                <th style="width: 60px;">ឆមាសទី ២</th>
                <th style="width: 60px;">ប្រចាំឆ្នាំ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: left; padding-left: 6px;">- មានច្បាប់</td>
                <td>${attPres}</td>
                <td>${attPres}</td>
                <td>${attPres * 2}</td>
              </tr>
              <tr>
                <td style="text-align: left; padding-left: 6px;">- អត់ច្បាប់</td>
                <td>${attAbs}</td>
                <td>${attAbs}</td>
                <td>${attAbs * 2}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- RIGHT SIDE (50%) -->
      <div style="width: 50%; padding-left: 12px; box-sizing: border-box; display: flex; flex-direction: column;">
        <table class="tb-tbl" style="margin-bottom: 6px;">
          <tbody>
            <tr class="tb-hdr">
              <td style="font-weight: 800; color: #1e3a5f; text-align: center;">${school}</td>
              <td style="width: 140px; font-weight: 700;">សិស្សសរុប ${stuList.length} នាក់</td>
            </tr>
            <tr>
              <td colspan="2" style="font-weight: 700; color: #1e3a5f; text-align: center;">
                ថ្នាក់ទី${selClass} ឆ្នាំសិក្សា២០២៥-២០២៦
              </td>
            </tr>
          </tbody>
        </table>

        <div style="font-weight: 700; text-align: center; padding: 4px; background: #f1f5f9; border: 1px solid #334155; border-bottom: none; font-size: 11px; color: #1e3a5f;">
          ការវាយតម្លៃ
        </div>

        <table class="tb-tbl">
          <thead>
            <tr class="tb-hdr">
              <th style="text-align: left; padding-left: 6px;">ផ្នែកទាំង ៤</th>
              <th style="width: 65px;">ឆមាសទី១</th>
              <th style="width: 65px;">ឆមាសទី២</th>
              <th style="width: 65px;">ប្រចាំឆ្នាំ</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="text-align: left; padding-left: 6px;">១- ការសិក្សា</td><td></td><td></td><td></td></tr>
            <tr><td style="text-align: left; padding-left: 6px;">២- សីលធម៌រស់នៅ</td><td></td><td></td><td></td></tr>
            <tr><td style="text-align: left; padding-left: 6px;">៣- ពលកម្ម-បង្កបង្កើនផល</td><td></td><td></td><td></td></tr>
            <tr><td style="text-align: left; padding-left: 6px;">៤- សុខភាព-អនាម័យ</td><td></td><td></td><td></td></tr>
          </tbody>
        </table>

        <!-- លទ្ធផលប្រចាំឆ្នាំ Box -->
        <div style="border: 1px solid #334155; margin-top: 6px; padding: 6px 8px; font-size: 10.5px; line-height: 1.6;">
          <div style="font-weight: 700; color: #1e3a5f; margin-bottom: 2px;">លទ្ធផលប្រចាំឆ្នាំ</div>
          <div>- ត្រូវបានឡើងថ្នាក់ទី.............................................................................................</div>
          <div>- ត្រូវប្រឡងឡើងថ្នាក់៖ មុខវិជ្ជាដែលត្រូវប្រឡង.............................................................</div>
          <div>- ត្រូវរៀនត្រួតថ្នាក់ទី.............................................................................................</div>
        </div>

        <!-- ការសរសើរ និង កំណែលំអ Box -->
        <div style="border: 1px solid #334155; margin-top: 6px; font-size: 10.5px;">
          <div style="font-weight: 700; background: #f1f5f9; border-bottom: 1px solid #334155; padding: 3px 6px; text-align: center;">
            ការសរសើរ និង កំណែលំអ
          </div>
          <div style="display: flex; min-height: 50px;">
            <div style="width: 50%; border-right: 1px solid #334155; padding: 4px 6px;">
              <strong>ការសរសើរ:</strong>
            </div>
            <div style="width: 50%; padding: 4px 6px;">
              <strong>កំណែលំអ:</strong>
            </div>
          </div>
        </div>

        <div style="flex: 1;"></div>

        <!-- SIGNATURE AREA (NO BORDERS inside, TWO DATES: LUNAR TOP, SOLAR BOTTOM) -->
        <div style="margin-top: 10px; padding: 6px 4px; font-size: 11px; line-height: 1.7; border: none;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; text-align: center;">
            <!-- Principal Signature Column (LEFT) -->
            <div style="flex: 1; text-align: center;">
              <div style="font-weight: 800; color: #1e3a5f; margin-bottom: 2px;">មូលវិចារ នាយិកា</div>
              <div style="font-size: 10px; color: #374151;">${dates.d2.lunar}</div>
              <div style="font-size: 10px; color: #374151;">${dates.d2.solar}</div>
              <div style="font-weight: 800; color: #1e3a5f; margin-top: 4px;">នាយកសាលា</div>
            </div>

            <!-- Teacher Signature Column (RIGHT) -->
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 10px; color: #374151;">${dates.d0.lunar}</div>
              <div style="font-size: 10px; color: #374151;">${dates.d0.solar}</div>
              <div style="font-weight: 800; color: #1e3a5f; margin-top: 4px;">គ្រូបន្ទុកថ្នាក់</div>
              <div style="margin-top: 28px; font-weight: 800; color: #1e3a5f;">${tName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
