import type { CaseRecord, CaseFilters, Configuration, Profile } from './types';
export const formatDate = (value: string | null) => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const dateKey = (date: Date) => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Jakarta', year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const median = (values: number[]) => { const v = values.filter(Number.isFinite).sort((a,b) => a-b); const i = Math.floor(v.length/2); return v.length ? v.length%2 ? v[i] : (v[i-1]+v[i])/2 : 0; };
export function handlingHours(c: CaseRecord, config: Configuration, now = Date.now()) {
  if (c.lifecycle === 'Closed' && c.actual_handling_hours != null) return c.actual_handling_hours;
  const end = c.closure_date ? new Date(c.closure_date).getTime() : now;
  const paused = config.pauseWaitingSupport ? c.waiting_hours + (c.waiting_since ? Math.max(0, (end-new Date(c.waiting_since).getTime())/3600000) : 0) : 0;
  return Math.max(0, (end-new Date(c.created_at).getTime())/3600000 - paused);
}
export function urgency(c: CaseRecord, config: Configuration, now = Date.now()) {
  if(c.lifecycle === 'Closed') return 'Closed';
  const hours = handlingHours(c,config,now), target = config.tatHours[c.involvement] || 8;
  if (c.priority === 'High' || hours >= target || (c.follow_up_date && new Date(c.follow_up_date).getTime() <= now)) return 'Needs Attention';
  return hours >= target*config.nearTatThreshold ? 'Near TAT' : 'On Track';
}
export function canEditCase(c: CaseRecord, p: Profile) {
  return p.role === 'Team Leader' || p.role === 'Admin' || (p.role === 'TSCC User' && (c.primary_pic_id === p.id || c.collaborator_ids.includes(p.id) || c.created_by === p.id));
}
export function filterCases(cases: CaseRecord[], f: CaseFilters, config: Configuration, now = new Date()) {
  let start: Date | null = null;
  if(f.period === 'month') start = new Date(now.getFullYear(),now.getMonth(),1);
  if(f.period === 'quarter') start = new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1);
  if(f.period === '3m') { start = new Date(now); start.setMonth(start.getMonth()-3); }
  const search = f.search.trim().toLowerCase();
  return cases.filter(c => (!search || [c.ticket,c.subject,c.requester_name,c.primary_pic_name,c.customer_name,c.description].join(' ').toLowerCase().includes(search)) && (!f.status || c.lifecycle===f.status) && (!f.product || c.product===f.product) && (!f.region || c.region===f.region) && (!f.category || c.category===f.category) && (!f.pic || c.primary_pic_name===f.pic || c.collaborator_names.includes(f.pic)) && (!f.involvement || c.involvement===f.involvement) && (!f.support || c.supporting_unit===f.support) && (!f.urgency || urgency(c,config,now.getTime())===f.urgency) && (!start || new Date(c.created_at)>=start));
}
export function groupCases(cases: CaseRecord[], key: keyof CaseRecord) {
  const map = new Map<string, CaseRecord[]>();
  for(const c of cases) { const value = String(c[key] || 'Not Available'); map.set(value,[...(map.get(value)||[]),c]); }
  return [...map.entries()].sort((a,b)=>b[1].length-a[1].length);
}
export function monthlyGroups(cases: CaseRecord[]) {
  const map = new Map<string, CaseRecord[]>();
  for (const c of cases) { const key = dateKey(new Date(c.created_at)).slice(0,7); map.set(key,[...(map.get(key)||[]),c]); }
  return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}
export function csvCell(value: unknown) { const s = String(value ?? ''); return '"'+(/^[=+@\-\t\r]/.test(s) ? "'" : '')+s.replaceAll('"','""')+'"'; }
export function exportCSV(name: string, headers: string[], rows: unknown[][]) {
  const csv = '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const link = document.createElement('a'); link.href=url; link.download=name+'.csv'; link.click(); URL.revokeObjectURL(url);
}
export function exportCases(cases: CaseRecord[]) { exportCSV('tcams_filtered_cases',['Ticket','Subject','Requester','Primary PIC','Product','Category','Region','Status','Priority','Created','Updated'], cases.map(c=>[c.ticket,c.subject,c.requester_name,c.primary_pic_name,c.product,c.category,c.region,c.lifecycle,c.priority,c.created_at,c.updated_at])); }
