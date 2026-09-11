export interface TeacherProfile {
  uid: string;
  fullName: string;
  title: string;
  phone: string;
  email: string;
  school: string;
  schoolID: string;
  level: string;
  province: string;
  district: string;
  commune: string;
  village: string;
  position?: string;
  createdAt: number;
}

export interface Student {
  id: string;
  code?: string;
  rollNo?: number;
  orderIndex?: number;
  lastName: string;
  firstName: string;
  gender: 'ប្រុស' | 'ស្រី' | string;
  dob?: string;
  age?: string;
  fatherName?: string;
  fatherJob?: string;
  motherName?: string;
  motherJob?: string;
  village?: string;
  commune?: string;
  district?: string;
  province?: string;
  phone?: string;
  photoUrl?: string;
  latinName?: string;
  createdAt?: number;
  _rank?: number;
}

export interface ScoreMap {
  [subject: string]: number | string;
}

export interface AttendanceMap {
  [day: number]: 'P' | 'A' | '';
}

export interface SupervisorInfo {
  name: string;
  phone: string;
  sig: string;
}

export interface InvigilatorData {
  building: string;
  room: string;
  shift: 'ព្រឹក' | 'ល្ងាច' | string;
  sup1: SupervisorInfo;
  sup2: SupervisorInfo;
}

export interface CoreGradeRecord {
  khmerComponents: Record<string, string | null>;
  khmerAvg: number | null;
  khmerGrade: string | null;
  mathComponents: Record<string, string | null>;
  mathAvg: number | null;
  mathGrade: string | null;
  savedAt?: string;
}

export interface PtomRecord {
  familyStatus?: string;
  khmerBaseline?: string;
  mathBaseline?: string;
  khmerQ1Plan?: string;
  khmerQ1Actual?: string;
  khmerQ2Plan?: string;
  khmerQ2Actual?: string;
  khmerQ3Plan?: string;
  khmerQ3Actual?: string;
  khmerQ4Plan?: string;
  khmerQ4Actual?: string;
  mathQ1Plan?: string;
  mathQ1Actual?: string;
  mathQ2Plan?: string;
  mathQ2Actual?: string;
  mathQ3Plan?: string;
  mathQ3Actual?: string;
  mathQ4Plan?: string;
  mathQ4Actual?: string;
  khmerYearEndActual?: string;
  mathYearEndActual?: string;
  updatedAt?: number;
}

export interface DomainGrades {
  knowledge?: string;     // ចំណេះដឹង (A, B, C, D, E)
  skills?: string;        // បំណិន-បំណេះធ្វើ
  values?: string;        // តម្លៃ-សីលធម៌
  participation?: string; // សមត្ថភាព-ការចូលរួម
}

export interface SemesterExamRecord {
  scores: ScoreMap;
  domains?: DomainGrades;
  remarks?: string;
}

export type InnerTab =
  | 'info'
  | 'scores'
  | 'semester_exam'
  | 'master_table'
  | 'attendance'
  | 'detail'
  | 'report'
  | 'school_report'
  | 'candidate'
  | 'certificate'
  | 'honor'
  | 'gradeanalysis';

export type SchoolReportType =
  | 'school_annual_classes'
  | 'school_annual_grades'
  | 'school_pri_scores'
  | 'school_stats'
  | 'school_performance'
  | 'school_honor'
  | 'school_attendance'
  | 'school_profile';

export type ReportType =
  | 'monthly'
  | 'semester'
  | 'semester_exam'
  | 'master_table'
  | 'detail'
  | 'annual'
  | 'attendance'
  | 'studentcard'
  | 'candidate'
  | 'certificate'
  | 'coregrade'
  | 'traineebook'
  | 'agreement'
  | 'pri'
  | 'qr_sheet'
  | 'examsheet'
  | 'monthly_detail_sheet'
  | 'annual_detail_sheet';


