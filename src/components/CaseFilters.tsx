import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useData } from '../hooks/useData';
import { emptyFilters, type CaseFilters as Filters } from '../lib/types';
export default function CaseFilters({value,onChange,report=false}:{value:Filters;onChange:(filters:Filters)=>void;report?:boolean}){
  const {config,cases}=useData();const [more,setMore]=useState(false);
  function select(key:keyof Filters,label:string,options:string[]){return <label className="filter-label"><span className="sr-only">{label}</span><select aria-label={label} value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})}><option value="">All {label}</option>{[...new Set(options)].filter(Boolean).map(x=><option key={x}>{x}</option>)}</select></label>;}
  return <div className="filter-panel"><div className="filters">
    <label className="searchbox"><Search size={16}/><input aria-label="Search cases" placeholder="Search ticket, requester, subject…" value={value.search} onChange={e=>onChange({...value,search:e.target.value})}/></label>
    {report?<select aria-label="Reporting period" value={value.period} onChange={e=>onChange({...value,period:e.target.value})}><option value="all">All Period</option><option value="3m">Last 3 Months</option><option value="quarter">This Quarter</option><option value="month">This Month</option></select>:null}
    {select('status','Statuses',['Probing','In Progress','Waiting Support','Closed'])}{select('product','Products',[...config.products,...cases.map(c=>c.product)])}{select('region','Regions',[...config.regions,...cases.map(c=>c.region)])}
    <button className="btn secondary" onClick={()=>setMore(!more)} aria-expanded={more}><SlidersHorizontal size={15}/>More Filters</button><button className="link" onClick={()=>onChange({...emptyFilters})}>Clear All</button>
  </div>{more?<div className="filters more-filters">{select('category','Categories',[...config.categories,...cases.map(c=>c.category)])}{select('pic','PICs',cases.map(c=>c.primary_pic_name))}{select('involvement','Involvement',config.involvement)}{select('support','Supporting Units',config.supportUnits)}{select('urgency','Urgency',['Needs Attention','Near TAT','On Track','Closed'])}</div>:null}</div>;
}
