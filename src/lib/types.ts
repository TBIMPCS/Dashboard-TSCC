export type Role = 'TSCC User' | 'Team Leader' | 'Department Head' | 'Admin' | 'Requester';
export type Lifecycle = 'Probing' | 'In Progress' | 'Waiting Support' | 'Closed';
export type Visibility = 'Internal' | 'Requester';
export interface Profile {
  id: string; email: string; full_name: string; username: string; role: Role;
  unit: string; region: string; npp: string; phone: string; language: 'en' | 'id'; avatar_path: string | null;
}
export interface CaseRecord {
  id: string; ticket: string; created_at: string; updated_at: string; created_by: string | null;
  requester_id: string | null; requester_name: string; requester_unit: string; region: string; segment: string;
  customer_name: string; counterpart: string; contact: string; channel: string; product: string;
  category: string; raw_category: string; subcategory: string; reference_no: string;
  subject: string; description: string; resolution_summary: string; complexity: string;
  involvement: string; priority: string; supporting_unit: string; additional_info: string;
  primary_pic_id: string | null; primary_pic_name: string; collaborator_ids: string[]; collaborator_names: string[];
  is_draft: boolean; draft_reason: string; lifecycle: Lifecycle;
  escalation_status: string; escalation_reason: string; closure_date: string | null; closure_reason: string;
  follow_up_date: string | null; actual_handling_hours: number | null; waiting_hours: number;
  waiting_since: string | null; source_batch: string | null; reopened: boolean;
}
export interface CaseComment { id: string; case_id: string; author_id: string | null; author_name: string; body: string; visibility: Visibility; created_at: string }
export interface CaseActivity { id: string; case_id: string; actor_name: string; action: string; previous_status: string; next_status: string; body: string; visibility: Visibility; created_at: string }
export interface Reminder { id: string; case_id: string; owner_id: string; due_at: string; note: string; completed: boolean }
export interface Attachment { id: string; case_id: string; uploaded_by: string; name: string; path: string; size: number; created_at: string }
export interface CalendarNote { id: string; user_id: string; date: string; note: string }
export interface Configuration {
  products: string[]; categories: string[]; subcategories: string[]; regions: string[]; channels: string[];
  requesterUnits: string[]; supportUnits: string[]; involvement: string[]; priorities: string[];
  tatHours: Record<string, number>; pauseWaitingSupport: boolean; nearTatThreshold: number;
}
export interface CaseFilters { search: string; status: string; product: string; region: string; category: string; pic: string; involvement: string; support: string; period: string; urgency: string }
export const emptyFilters: CaseFilters = { search: '', status: '', product: '', region: '', category: '', pic: '', involvement: '', support: '', period: 'all', urgency: '' };
export const defaultConfig: Configuration = {
  products: ['SCF','LC','DG/CG/BGUC','GB Lokal','SKBDN','SBLC','Documentary Collection','Other'],
  categories: ['Access / Administration','Document / Draft Review','Inquiry','Other','Product / Policy Guidance','Settlement','System / Technical Issue','Transaction / Processing'],
  subcategories: ['Eligibility / Requirement','Transaction Status','Document Completeness','Limit Inquiry','Process Clarification','Backend Issue','Channel Issue','Settlement','Draft Wording','Scheme / Structure','Other'],
  regions: ['W01','W02','W03','W04','W05','W06','W07','W08','W09','W10','W11','W12','W14','W15','W16','W17','W18'],
  channels: ['WhatsApp','Email','Visit','Call','Discussion'], requesterUnits: ['RM','PS','LNC','TL','CS LN/IBS','WDC','BTP','Other Internal BNI'],
  supportUnits: ['None','BTO','IT','Product Team','Business Unit','Operational Unit','WDC','Credit Admin','Other'],
  involvement: ['Business','IT','Business + IT'], priorities: ['Low','Medium','High'],
  tatHours: { Business: 8, IT: 12, 'Business + IT': 16 }, pauseWaitingSupport: false, nearTatThreshold: .8,
};
