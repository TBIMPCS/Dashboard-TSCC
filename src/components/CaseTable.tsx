import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import type { CaseRecord } from '../lib/types';
import { formatDate, urgency } from '../lib/analytics';
import { Badge, Empty } from './UI';
export default function CaseTable({cases,onOpen}:{cases:CaseRecord[];onOpen:(c:CaseRecord)=>void}){
  const {config}=useData();const [page,setPage]=useState(0);const pages=Math.ceil(cases.length/25),current=Math.min(page,Math.max(0,pages-1));
  if(!cases.length)return <Empty/>;
  return <><div className="table-wrap"><table className="case-table"><thead><tr><th>Ticket / Case Topic</th><th>Requester</th><th>Product / Category</th><th>Region</th><th>Primary PIC</th><th>Status</th><th>Urgency</th><th>Last Update</th></tr></thead><tbody>{cases.slice(current*25,(current+1)*25).map(c=><tr key={c.id}><td><Link className="link ticket-link" to={'/cases/'+c.id} onClick={e=>{e.preventDefault();onOpen(c);}}>{c.ticket}</Link><div className="subject-cell">{c.subject}</div>{c.is_draft?<span className="badge gray">Draft</span>:null}</td><td>{c.requester_name||'—'}<div className="small">{c.requester_unit}</div></td><td><strong>{c.product}</strong><div className="small">{c.category}</div></td><td>{c.region||'—'}</td><td>{c.primary_pic_name||'Unassigned'}</td><td><Badge text={c.lifecycle}/></td><td><Badge text={urgency(c,config)}/></td><td className="date-cell">{formatDate(c.updated_at)}</td></tr>)}</tbody></table></div><div className="pagination"><span>{cases.length.toLocaleString()} cases • Page {current+1} of {pages}</span><div><button className="btn secondary" disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button><button className="btn secondary" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>Next</button></div></div></>;
}
