import { useState } from 'react';
import { useData } from '../hooks/useData';
import { supabase, checkError } from '../lib/supabase';
import { type Profile, type Role } from '../lib/types';
import { Card, ErrorMessage, PageHead } from '../components/UI';
import { useAuth } from '../hooks/useAuth';
import { linkImportedPic, summarizeImportedPics } from '../lib/importedPic';
import { groupCases } from '../lib/analytics';
const roles:Role[]=['Requester','TSCC User','Team Leader','Department Head','Admin'];
export default function Configuration(){
  const {config,cases,profiles,refresh,loading,error:dataError}=useData();const {profile}=useAuth();const [settings,setSettings]=useState(config),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[search,setSearch]=useState('');
  const [edited,setEdited]=useState<Profile|null>(null),[legacyPic,setLegacyPic]=useState(''),[target,setTarget]=useState('');
  const picRows=summarizeImportedPics(cases);
  const picTotals=picRows.reduce((sum,row)=>({total:sum.total+row.total,linked:sum.linked+row.linked,unlinked:sum.unlinked+row.unlinked}),{total:0,linked:0,unlinked:0});
  const selectedPic=picRows.find(row=>row.name===legacyPic);
  async function linkAssignments(){
    if(busy||loading||dataError)return;
    setBusy(true);setError('');setMessage('');
    try{
      const count=await linkImportedPic(supabase,profile?.role,legacyPic,profiles.find(p=>p.id===target));
      setMessage(count>0?`${count} imported case(s) linked to ${profiles.find(p=>p.id===target)!.full_name}.`:`No cases updated for “${legacyPic}”. No matching unlinked imported cases were updated; refresh and check the recap.`);
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:String(e));}
    finally{setBusy(false);}
  }
  async function run(action:()=>Promise<void>,success:string){setBusy(true);setError('');setMessage('');try{await action();await refresh();setMessage(success);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
  return <><PageHead title="Configuration" description="TAT rules, master data, and account access."/><ErrorMessage message={error}/>{message?<div className="success-msg" role="status">{message}</div>:null}
  <div className="grid2"><Card title="TAT Configuration"><form onSubmit={e=>{e.preventDefault();void run(async()=>{if(Object.values(settings.tatHours).some(v=>!Number.isFinite(v)||v<=0))throw new Error('TAT targets must be positive.');const {error}=await supabase.from('configuration').update({value:settings}).eq('id',true);checkError(error);},'Configuration saved.');}}>{settings.involvement.map(key=><label className="config-row" key={key}><span>{key} (hours)</span><input type="number" min={1} required value={settings.tatHours[key]} onChange={e=>setSettings({...settings,tatHours:{...settings.tatHours,[key]:Number(e.target.value)}})}/></label>)}<label className="config-row"><span>Pause TAT in Waiting Support</span><select value={String(settings.pauseWaitingSupport)} onChange={e=>setSettings({...settings,pauseWaitingSupport:e.target.value==='true'})}><option value="false">No</option><option value="true">Yes</option></select></label><button className="btn primary" disabled={busy}>Save TAT Rules</button></form></Card><Card title="Master Data">{(['products','categories','subcategories','regions','channels','requesterUnits','supportUnits'] as const).map(key=><details key={key}><summary>{key} — {settings[key].length} values</summary><label className="field"><span className="small">One value per line</span><textarea rows={5} value={settings[key].join('\n')} onChange={e=>setSettings({...settings,[key]:e.target.value.split('\n')})}/></label></details>)}<button className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{const clean={...settings};for(const key of ['products','categories','subcategories','regions','channels','requesterUnits','supportUnits'] as const)clean[key]=[...new Set(clean[key].map(s=>s.trim()).filter(Boolean))];const {error}=await supabase.from('configuration').update({value:clean}).eq('id',true);checkError(error);setSettings(clean);},'Master data saved.')}>Save Master Data</button></Card></div>
  <Card title="Account Access" className="spaced" subtitle="Invite users through Supabase Authentication, then assign their organizational role here."><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Unit</th><th>Region</th><th></th></tr></thead><tbody>{profiles.map(p=><tr key={p.id}><td>{p.full_name}</td><td>{p.email}</td><td>{p.role}</td><td>{p.unit}</td><td>{p.region}</td><td><button className="link" onClick={()=>setEdited({...p})}>Edit Access</button></td></tr>)}</tbody></table></div>{edited?<form className="form-grid spaced-text" onSubmit={e=>{e.preventDefault();void run(async()=>{const {error}=await supabase.from('profiles').update({role:edited.role,unit:edited.unit,region:edited.region,npp:edited.npp,full_name:edited.full_name}).eq('id',edited.id);checkError(error);setEdited(null);},'Account access updated.');}}><label className="field">Full Name<input value={edited.full_name} onChange={e=>setEdited({...edited,full_name:e.target.value})}/></label><label className="field">Role<select value={edited.role} onChange={e=>setEdited({...edited,role:e.target.value as Role})}>{roles.map(r=><option key={r}>{r}</option>)}</select></label>{(['unit','region','npp'] as const).map(key=><label className="field" key={key}>{key}<input value={edited[key]} onChange={e=>setEdited({...edited,[key]:e.target.value})}/></label>)}<div className="action-buttons full"><button className="btn primary" disabled={busy}>Save Access</button><button type="button" className="link" onClick={()=>setEdited(null)}>Cancel</button></div></form>:null}</Card>
  {profile?.role==='Admin'?<Card title="Link Imported PIC Assignments" className="spaced" subtitle="Imported cases only (source batch present). Linked means a primary PIC account ID is assigned; legacy names are preserved.">
    {loading||dataError?<p role="status">{loading?'Refreshing PIC recap…':'PIC recap may be out of date. Retry loading data before linking.'}</p>:<>
      <p role="status" aria-label="Imported PIC totals">Total imported: {picTotals.total} · Linked: {picTotals.linked} · Unlinked: {picTotals.unlinked}</p>
      <div className="table-wrap"><table aria-label="Imported PIC recap"><thead><tr><th>Legacy PIC</th><th>Total</th><th>Linked</th><th>Unlinked</th></tr></thead><tbody>{picRows.map(row=><tr key={row.name}><td>{row.name.trim()?row.name:'Missing PIC name (manual review required)'}</td><td>{row.total}</td><td>{row.linked}</td><td>{row.unlinked}</td></tr>)}</tbody></table></div>
      {!picRows.length?<p>No imported cases found.</p>:null}
    </>}
    <form className="filters" onSubmit={e=>{e.preventDefault();void linkAssignments();}}>
      <select aria-label="Legacy PIC" value={legacyPic} disabled={busy||loading||!!dataError} onChange={e=>setLegacyPic(e.target.value)} required><option value="">Select legacy PIC</option>{picRows.filter(row=>row.name.trim()).map(row=><option key={row.name} value={row.name} disabled={!row.unlinked}>{row.name} ({row.unlinked} unlinked / {row.total} total){!row.unlinked?' — fully linked':''}</option>)}</select>
      <select aria-label="Authenticated staff account" value={target} disabled={busy||loading||!!dataError} onChange={e=>setTarget(e.target.value)} required><option value="">Select staff account</option>{profiles.filter(p=>p.role==='TSCC User'||p.role==='Team Leader').map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select>
      <button className="btn secondary" disabled={busy||loading||!!dataError||!selectedPic?.unlinked||!target}>Link Assignments</button>
    </form>
    <p className="small">PICs with unlinked cases appear first. Missing PIC names require individual case review. Collaborators and requester links are managed on each case.</p>
  </Card>:null}
  <Card title="Requester Master" className="spaced" subtitle="Source identities are shown for reference. Ticket access requires an explicit account link." actions={<input aria-label="Search requester names" placeholder="Search requester name…" value={search} onChange={e=>setSearch(e.target.value)}/>}><div className="table-wrap"><table><thead><tr><th>Requester Name</th><th>Unit</th><th>Region</th><th>Tickets</th><th>Linked Account</th></tr></thead><tbody>{groupCases(cases,'requester_name').filter(([name])=>name.toLowerCase().includes(search.toLowerCase())).slice(0,100).map(([name,list])=><tr key={name}><td>{name}</td><td>{[...new Set(list.map(c=>c.requester_unit))].join(', ')}</td><td>{[...new Set(list.map(c=>c.region))].join(', ')}</td><td>{list.length}</td><td>{list.some(c=>c.requester_id)?'Linked on individual tickets':'Unlinked'}</td></tr>)}</tbody></table></div><p className="small">Showing up to 100 matching identities.</p></Card></>;
}

