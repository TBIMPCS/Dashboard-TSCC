import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { supabase, checkError } from '../lib/supabase';
import { canEditCase } from '../lib/analytics';
import type { CaseRecord } from '../lib/types';
import { Card, ErrorMessage, PageHead } from '../components/UI';
const selectFields=[['requester_unit','Requester Unit','requesterUnits'],['region','Region','regions'],['channel','Channel','channels'],['product','Product','products'],['category','Category','categories'],['subcategory','Subcategory','subcategories'],['involvement','Involvement','involvement'],['priority','Priority','priorities'],['supporting_unit','Supporting Unit','supportUnits']] as const;
export default function CaseForm({quick=false}:{quick?:boolean}){
  const {id}=useParams();const {cases,config,profiles,refresh}=useData();const {profile}=useAuth();const navigate=useNavigate();const existing=cases.find(c=>c.id===id);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[quickText,setQuickText]=useState('');
  const [savedId,setSavedId]=useState(id),[collaborators,setCollaborators]=useState(existing?.collaborator_ids||[]);
  const [prefill,setPrefill]=useState<Record<string,string>>({});
  const staff=profiles.filter(p=>p.role==='TSCC User'||p.role==='Team Leader');const canAssign=profile!.role==='Admin'||profile!.role==='Team Leader';
  if(profile!.role==='Requester'||profile!.role==='Department Head'||(existing&&!canEditCase(existing,profile!)))return <ErrorMessage message="You do not have permission to edit this case."/>;
  function structure(){const lines=quickText.split('\n').map(x=>x.trim()).filter(Boolean);setPrefill({subject:lines[0]?.slice(0,200)||'',description:quickText});}
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const fd=new FormData(e.currentTarget),asDraft=(e.nativeEvent as SubmitEvent).submitter?.getAttribute('value')==='draft';
    setBusy(true);setError('');
    try{
      const data:Record<string,unknown>={};
      for(const [key,value] of fd.entries())if(typeof value==='string' && !['internal_note','attachments','action'].includes(key))data[key]=value.trim();
      if(!asDraft && (!data.subject||!data.description||!data.requester_name))throw new Error('Requester, subject, and description are required.');
      data.subject=data.subject||'Draft Case';data.requester_name=data.requester_name||'';
      data.is_draft=asDraft;data.lifecycle=asDraft?'Probing':existing?.lifecycle==='Closed'?'Closed':'In Progress';
      data.follow_up_date=data.follow_up_date?new Date(String(data.follow_up_date)).toISOString():null;
      const primary=profiles.find(p=>p.id===fd.get('primary_pic_id'))||profile!;
      if(!savedId || canAssign){
        data.primary_pic_id=primary.id;data.primary_pic_name=primary.full_name;
        data.collaborator_ids=collaborators;data.collaborator_names=collaborators.map(id=>profiles.find(p=>p.id===id)?.full_name||'');
        data.requester_id=fd.get('requester_id')||null;
      }else{delete data.primary_pic_id;delete data.requester_id;}
      if(!savedId)data.created_by=profile!.id;
      const query=savedId?supabase.from('cases').update(data).eq('id',savedId):supabase.from('cases').insert(data);
      const {data:record,error:saveError}=await query.select('*').single();checkError(saveError);
      const c=record as CaseRecord;setSavedId(c.id);
      const note=String(fd.get('internal_note')||'');
      if(note){const {error:noteError}=await supabase.from('case_internal').upsert({case_id:c.id,internal_note:note});checkError(noteError);}
      const files=fd.getAll('attachments').filter((f):f is File=>f instanceof File && f.size>0);
      for(const file of files){
        if(file.size>10485760)throw new Error('Case saved. Attachments must be smaller than 10 MB.');
        const path=c.id+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        const {error:uploadError}=await supabase.storage.from('case-attachments').upload(path,file);checkError(uploadError);
        const {error:attachmentError}=await supabase.from('attachments').insert({case_id:c.id,uploaded_by:profile!.id,name:file.name,path,size:file.size});
        if(attachmentError){await supabase.storage.from('case-attachments').remove([path]);throw new Error('Case saved. Attachment metadata could not be saved: '+attachmentError.message);}
      }
      await refresh();navigate('/cases/'+c.id);
    }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  }
  function input(name:keyof CaseRecord,label:string,type='text'){return <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} defaultValue={String(existing?.[name]||'')}/></div>;}
  return <><PageHead title={existing?'Edit Case':quick?'Quick Draft':'New Case'} description="Capture requester context, the case, and handling information."/>
  {quick?<Card title="Quick capture" className="spaced"><label htmlFor="quickText" className="small">Paste your case notes</label><textarea id="quickText" rows={5} value={quickText} onChange={e=>setQuickText(e.target.value)} placeholder="First line becomes the case subject. The complete text becomes the description."/><button className="btn secondary" onClick={structure}>Use these notes</button></Card>:null}
  <form onSubmit={save} key={JSON.stringify(prefill)}><Card><div className="form-section"><h3>Requester & Context</h3><div className="form-grid">{input('requester_name','Requester Name')}{input('contact','Contact')}{input('customer_name','Customer Name')}{input('counterpart','Counterpart')}{input('segment','Segment / Origin')}{input('reference_no','Reference Number')}
  <div className="field"><label htmlFor="requester_id">Linked Requester Account</label><select id="requester_id" name="requester_id" disabled={Boolean(savedId&&!canAssign)} defaultValue={existing?.requester_id||''}><option value="">Unlinked — staff visibility only</option>{profiles.filter(p=>p.role==='Requester').map(p=><option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>)}</select></div>
  {selectFields.slice(0,3).map(([name,label,key])=><div className="field" key={name}><label htmlFor={name}>{label}</label><select id={name} name={name} defaultValue={existing?.[name]||''}><option value="">Select {label}</option>{[...new Set([...config[key],String(existing?.[name]||'')])].filter(Boolean).map(v=><option key={v}>{v}</option>)}</select></div>)}</div></div>
  <div className="form-section"><h3>Case Information</h3><div className="form-grid">{selectFields.slice(3,6).map(([name,label,key])=><div className="field" key={name}><label htmlFor={name}>{label}</label><select id={name} name={name} defaultValue={existing?.[name]||config[key][0]}>{[...new Set([...config[key],String(existing?.[name]||'')])].filter(Boolean).map(v=><option key={v}>{v}</option>)}</select></div>)}<div className="field full"><label htmlFor="subject">Subject</label><input id="subject" name="subject" defaultValue={prefill.subject||existing?.subject||''}/></div><div className="field full"><label htmlFor="description">Description / Original Source</label><textarea id="description" name="description" rows={6} defaultValue={prefill.description||existing?.description||''}/></div>{input('additional_info','Additional Information')}</div></div>
  <div className="form-section"><h3>Handling</h3><div className="form-grid">{selectFields.slice(6).map(([name,label,key])=><div className="field" key={name}><label htmlFor={name}>{label}</label><select id={name} name={name} defaultValue={existing?.[name]||config[key][0]}>{config[key].map(v=><option key={v}>{v}</option>)}</select></div>)}<div className="field"><label htmlFor="primary_pic_id">Primary PIC</label><select id="primary_pic_id" name="primary_pic_id" disabled={!canAssign} defaultValue={existing?.primary_pic_id||profile!.id}>{[profile!,...staff.filter(p=>p.id!==profile!.id)].map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
  <div className="field full"><label>Collaborating PICs</label><div className="collaborator-options">{staff.filter(p=>p.id!==profile!.id).map(p=><label key={p.id}><input type="checkbox" checked={collaborators.includes(p.id)} disabled={Boolean(savedId&&!canAssign)} onChange={e=>setCollaborators(e.target.checked?[...collaborators,p.id]:collaborators.filter(id=>id!==p.id))}/>{p.full_name}</label>)}</div></div>
  <div className="field"><label htmlFor="follow_up_date">Follow-up Date</label><input id="follow_up_date" name="follow_up_date" type="datetime-local" defaultValue={existing?.follow_up_date?new Date(new Date(existing.follow_up_date).getTime()+7*3600000).toISOString().slice(0,16):''}/></div>
  <div className="field full"><label htmlFor="internal_note">Internal Note</label><textarea id="internal_note" name="internal_note" rows={3}/><span className="small">Visible to authorized staff only. Existing notes remain unchanged unless a new note is entered.</span></div>{input('draft_reason','Draft Reason')}<div className="field full"><label htmlFor="attachments">Attachments (up to 10 MB each)</label><input id="attachments" name="attachments" type="file" multiple/></div></div></div>
  <ErrorMessage message={error}/><div className="action-buttons"><button className="btn secondary" name="action" value="draft" disabled={busy}>{busy?'Saving…':'Save Draft'}</button><button className="btn primary" name="action" value="submit" disabled={busy}>{busy?'Saving…':'Submit Case'}</button><button type="button" className="link" onClick={()=>navigate(-1)}>Cancel</button></div></Card></form></>;
}
