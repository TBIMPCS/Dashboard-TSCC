import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { emptyFilters } from '../lib/types';
import { filterCases, exportCases } from '../lib/analytics';
import CaseFilters from '../components/CaseFilters';
import CaseTable from '../components/CaseTable';
import { Card, PageHead } from '../components/UI';
export default function Cases({mode='all'}:{mode?:'all'|'drafts'|'mine'|'requests'}){
  const {cases,config}=useData();const {profile}=useAuth();const [filters,setFilters]=useState({...emptyFilters});const navigate=useNavigate();
  const source=useMemo(()=>cases.filter(c=>mode==='drafts'?c.is_draft:mode==='mine'?c.primary_pic_id===profile!.id || c.collaborator_ids.includes(profile!.id):mode==='requests'?c.requester_id===profile!.id:!c.is_draft),[cases,mode,profile]);
  const filtered=useMemo(()=>filterCases(source,filters,config),[source,filters,config]);
  const title=mode==='drafts'?'Draft Cases':mode==='mine'?'My Cases':mode==='requests'?'My Requests':'Case Monitoring';
  return <><PageHead title={title} description={mode==='drafts'?'Continue incomplete case capture.':'Search, filter, and explore the cases in your access scope.'}><button className="btn secondary" onClick={()=>exportCases(filtered)}><Download size={16}/>Export Cases</button>{profile!.role!=='Requester' && profile!.role!=='Department Head'?<button className="btn orange" onClick={()=>navigate('/new-case')}><Plus size={16}/>New Case</button>:null}</PageHead>
    {mode==='requests'?<div className="kpis">{['Probing','In Progress','Waiting Support','Closed'].map(s=><button key={s} className="kpi" onClick={()=>setFilters({...filters,status:s})}><span>{s}</span><strong>{source.filter(c=>c.lifecycle===s).length}</strong></button>)}</div>:null}
    <CaseFilters value={filters} onChange={setFilters}/><Card><CaseTable cases={filtered} onOpen={c=>navigate('/cases/'+c.id)}/></Card>
    {mode==='requests'?<Card title="Track a Ticket" className="spaced"><p className="small">Ticket lookup is limited to requests linked to your authenticated account.</p><form className="track-row" onSubmit={e=>{e.preventDefault();setFilters({...emptyFilters,search:new FormData(e.currentTarget).get('ticket')?.toString().trim()||''});}}><input name="ticket" aria-label="Ticket number" placeholder="e.g. TSCC-ACT-2026-004536" required/><button className="btn orange">Track</button></form></Card>:null}
  </>;
}
