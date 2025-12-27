export type ProfileCode = 'DI' | 'DC' | 'IS' | 'SC' | 'CD' | 'SI' | 'DS' | 'IC' | 'CI' | 'SD' | 'CS' | 'ID' | 'D' | 'I' | 'S' | 'C';

export interface Insight {
  title: string;
  description: string;
  category: 'strength' | 'weakness' | 'communication' | 'value';
}

export interface DiscReport {
  profileCode: ProfileCode;
  natuurlijkeStijl: { D: number; I: number; S: number; C: number };
  responsStijl: { D: number; I: number; S: number; C: number };
  assessmentDate: string;
  insights: Insight[];
  candidateName?: string;
}
