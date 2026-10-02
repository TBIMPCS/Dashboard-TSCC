import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { dateKey, formatDate, groupCases, monthlyGroups, urgency } from '../lib/analytics';
import { Badge, Card, Empty, PageHead } from '../components/UI';
import { Chart } from '../components/Charts';
import Calendar from '../components/Calendar';
export default function Dashboard(){
  const {profile}=useAuth(),{cases,config}=useData();const navigate=useNavigate();
  const own=profile!.role==='TSCC User'?cases.filter(c=>c.primary_pic_id===profile!.id||c.collaborator_ids.includes(profile!.id)||c.created_by===profile!.id):cases;
  const live=own.filter(c=>!c.is_draft),open=live.filter(c=>c.lifecycle!=='Closed'),attention=open.filter(c=>urgency(c,config)==='Needs Attention'),months=monthlyGroups(live),products=groupCases(live,'product');
  return <><PageHead title={'Good day, '+profile!.full_name.split(' ')[0]} description="Your case handling, follow-up, and workload workspace."><button className="btn orange" onClick={()=>navigate('/new-case')}><Plus size={16}/>New Case</button></PageHead>
  <div className="kpis">{[{label:'My Active Cases',value:open.length,route:'/my-cases'},{label:'Needs Attention',value:attention.length,route:'/my-cases?urgency=Needs%20Attention'},{label:'Waiting Support',value:open.filter(c=>c.lifecycle==='Waiting Support').length,route:'/my-cases?status=Waiting%20Support'},{label:'Draft Cases',value:own.filter(c=>c.is_draft).length,route:'/drafts'},{label:'Closed Today',value:live.filter(c=>c.closure_date&&dateKey(new Date(c.closure_date))===dateKey(new Date())).length,route:'/my-cases?status=Closed'}].map(k=><button className="kpi" key={k.label} onClick={()=>navigate(k.route)}><span>{k.label}</span><strong>{k.value}</strong><small>View Cases <ArrowUpRight size={12}/></small></button>)}</div>
  <div className="grid2"><Card title="Cases Requiring Attention" subtitle="High priority, overdue follow-up, and elapsed TAT" actions={<button className="link" onClick={()=>navigate('/my-cases')}>View All</button>}><div className="attention-list">{attention.length?attention.slice(0,5).map(c=><button className="attention-item" key={c.id} onClick={()=>navigate('/cases/'+c.id)}><div><strong>{c.ticket}</strong><p>{c.subject}</p><span className="small">{c.product} • {c.primary_pic_name}</span></div><Badge text={urgency(c,config)}/></button>):<Empty text="No cases currently require attention."/>}</div></Card><Calendar/></div>
  <div className="grid2"><Card title="Monthly Case Volume"><Chart labels={months.map(([m])=>m)} values={months.map(([,list])=>list.length)} kind="line"/></Card><Card title="Cases by Product"><Chart labels={products.map(([p])=>p)} values={products.map(([,list])=>list.length)} kind="doughnut"/></Card></div>
  <Card title="Recent Case Activity"><div className="attention-list">{live.length?live.slice(0,8).map(c=><button className="attention-item" key={c.id} onClick={()=>navigate('/cases/'+c.id)}><div><strong>{c.ticket}</strong><p>{c.subject}</p><span className="small">Updated {formatDate(c.updated_at)}</span></div><Badge text={c.lifecycle}/></button>):<Empty text="No cases assigned yet. Create a case to begin."/>}</div></Card></>;
}