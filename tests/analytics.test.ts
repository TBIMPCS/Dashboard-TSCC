import { describe, expect, it } from 'vitest';
import { canEditCase, csvCell, filterCases, handlingHours, median, urgency } from '../src/lib/analytics';
import { defaultConfig, emptyFilters, type CaseRecord, type Profile } from '../src/lib/types';
const c={id:'case-a',created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-01T01:00:00Z',lifecycle:'In Progress',involvement:'Business',priority:'Medium',primary_pic_id:'staff-a',collaborator_ids:['staff-b'],created_by:'staff-a',waiting_hours:2,waiting_since:null,closure_date:null,actual_handling_hours:null,ticket:'TSCC-2026-1',requester_name:'Requester A',subject:'SCF inquiry',description:'Review document',product:'SCF',region:'W01',category:'Inquiry',primary_pic_name:'Staff A',collaborator_names:[],supporting_unit:'None',follow_up_date:null} as CaseRecord;
describe('Access and reporting calculations',()=>{
  it('allows assigned and collaborating staff but blocks unrelated staff and department heads from editing',()=>{
    expect(canEditCase(c,{id:'staff-a',role:'TSCC User'} as Profile)).toBe(true);
    expect(canEditCase(c,{id:'staff-b',role:'TSCC User'} as Profile)).toBe(true);
    expect(canEditCase(c,{id:'staff-c',role:'TSCC User'} as Profile)).toBe(false);
    expect(canEditCase(c,{id:'staff-a',role:'Department Head'} as Profile)).toBe(false);
  });
  it('applies the same combined filters to charts and drilldown data',()=>{
    const b={...c,id:'case-b',region:'W02'};
    expect(filterCases([c,b],{...emptyFilters,search:' SCF ',region:'W01'},defaultConfig,new Date('2026-10-02'))).toEqual([c]);
    expect(filterCases([c],{...emptyFilters,product:'LC'},defaultConfig)).toEqual([]);
  });
  it('pauses elapsed time only when the configuration enables it',()=>{
    const now=new Date('2026-10-01T06:00:00Z').getTime();
    expect(handlingHours(c,defaultConfig,now)).toBe(6);
    expect(handlingHours(c,{...defaultConfig,pauseWaitingSupport:true},now)).toBe(4);
  });
  it('uses actual closed-case handling time and does not mark closed cases overdue',()=>{
    const closed={...c,lifecycle:'Closed' as const,actual_handling_hours:1.5};
    expect(handlingHours(closed,defaultConfig)).toBe(1.5);expect(urgency(closed,defaultConfig)).toBe('Closed');
  });
  it('flags overdue follow-up independently of elapsed TAT',()=>{expect(urgency({...c,follow_up_date:'2026-10-01T00:30:00Z'},defaultConfig,new Date('2026-10-01T01:00:00Z').getTime())).toBe('Needs Attention');});
  it('calculates medians without mutating the input',()=>{const input=[8,1,3,2];expect(median(input)).toBe(2.5);expect(input).toEqual([8,1,3,2]);expect(median([])).toBe(0);});
  it('escapes CSV content and neutralizes spreadsheet formulas',()=>{expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');expect(csvCell('a"b')).toBe('"a""b"');});
});
