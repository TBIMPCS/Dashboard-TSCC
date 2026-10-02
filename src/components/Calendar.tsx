import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { dateKey } from '../lib/analytics';
import { supabase, checkError } from '../lib/supabase';
import { Card, ErrorMessage } from './UI';
export default function Calendar(){
  const {cases,notes,refresh}=useData();const {profile}=useAuth();const navigate=useNavigate();
  const today=dateKey(new Date()),[selected,setSelected]=useState(today),[cursor,setCursor]=useState(()=>new Date(today+'T12:00:00+07:00'));
  const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const year=cursor.getFullYear(),month=cursor.getMonth(),days=new Date(year,month+1,0).getDate(),offset=new Date(year,month,1).getDay();
  const followups=useMemo(()=>cases.filter(c=>c.follow_up_date && c.lifecycle!=='Closed'),[cases]);
  const dayKey=(day:number)=>`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  async function save(){setBusy(true);setError('');try{const {error}=await supabase.from('calendar_notes').insert({user_id:profile!.id,date:selected,note:note.trim()});checkError(error);setNote('');await refresh();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
  return <Card title="Calendar & Follow-up" actions={<div className="calendar-controls"><button className="icon-btn" aria-label="Previous month" onClick={()=>setCursor(new Date(year,month-1,15))}><ChevronLeft size={17}/></button><span>{cursor.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</span><button className="icon-btn" aria-label="Next month" onClick={()=>setCursor(new Date(year,month+1,15))}><ChevronRight size={17}/></button></div>}>
  <div className="calendar-days">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span className="calendar-day-label" key={d}>{d}</span>)}{Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>{const key=dayKey(i+1),count=followups.filter(c=>dateKey(new Date(c.follow_up_date!))===key).length+notes.filter(n=>n.date===key).length;return <button className={'calendar-date '+(selected===key?'selected':'')+' '+(today===key?'today':'')} key={key} onClick={()=>setSelected(key)} aria-label={`${key}${count?', '+count+' events':''}`}><span>{i+1}</span>{count?<i/>:null}</button>;})}</div>
  <div className="calendar-agenda"><strong>{selected}</strong>{followups.filter(c=>dateKey(new Date(c.follow_up_date!))===selected).map(c=><button key={c.id} className="calendar-agenda-item" onClick={()=>navigate('/cases/'+c.id)}>{c.ticket} — {c.subject}</button>)}{notes.filter(n=>n.date===selected).map(n=><div className="calendar-note" key={n.id}><span>{n.note}</span><button className="link" aria-label="Delete calendar note" disabled={busy} onClick={async()=>{setError('');const {error}=await supabase.from('calendar_notes').delete().eq('id',n.id);if(error)setError(error.message);else await refresh();}}><Trash2 size={14}/></button></div>)}<form className="note-form" onSubmit={e=>{e.preventDefault();void save();}}><input aria-label="Calendar note" placeholder="Add a personal note…" value={note} onChange={e=>setNote(e.target.value)} required/><button className="btn secondary" disabled={busy||!note.trim()}>Save</button></form><ErrorMessage message={error}/></div>
  </Card>;
}
