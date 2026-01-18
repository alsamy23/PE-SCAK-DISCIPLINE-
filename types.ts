
export enum InfractionType {
  HAIR_CUT = 'Hair Cut',
  UNIFORM = 'Uniform',
  LATE_COMER = 'Late Comer',
  ID_CARD = 'ID Card',
  OTHER = 'Other',
}

export interface DisciplineRecord {
  id: string;
  studentName: string;
  grade: string;
  date: string;
  infractionType: InfractionType;
  notes: string;
  enteredBy: string;
  isNew?: boolean;
}

export interface Student {
  id: string;
  name: string;
  class: string;
  section: string;
  enrollmentNo?: string;
}

export interface Restriction {
  id: string;
  studentName: string;
  studentClass: string;
  studentSection: string;
  startDate: string;
  endDate: string;
  reason: string;
  assignedBy: string;
}

export interface FitnessMetrics {
  height: number;
  weight: number;
  bmi: number;
  speed50m: number;
  endurance600m: number;
  strength: number;
  flexibility: number;
  curlsUp: number;
  gameSkill1: number;
  gameSkill2: number;
  discipline: number;
  total: number;
  grade: string;
  remark: string;
}

export interface FitnessRecord {
  rollNo: number;
  name: string;
  class: string;
  section: string;
  baseline: FitnessMetrics;
  final?: FitnessMetrics;
}

export type DutyDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
export type DutyType = 'Snack' | 'Lunch' | 'Dispersal';

export interface DutyAssignment {
  id: string;
  day: DutyDay;
  type: DutyType;
  location: string;
  teacherName: string;
  phoneNumber?: string;
}
