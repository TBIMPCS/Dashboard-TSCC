import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, CalendarDays, ClipboardList, FilePlus2, FileText, Gauge, LogOut, Menu, RefreshCw, Search, Settings, ShieldCheck, Users, X, UserRound, Sparkles } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useData, DataProvider } from './hooks/useData';
import { supabase, configurationError } from './lib/supabase';
import type { Role } from './lib/types';
import { ErrorMessage, Loading } from './components/UI';
import Login from './pages/Login';
const Dashboard=lazy(()=>import('./pages/Dashboard')),Cases=lazy(()=>import('./pages/Cases')),CaseDetail=lazy(()=>import('./pages/CaseDetail')),CaseForm=lazy(()=>import('./pages/CaseForm')),Reports=lazy(()=>import('./pages/Reports')),Workload=lazy(()=>import('./pages/Workload')),Profile=lazy(()=>import('./pages/Profile')),Account=lazy(()=>import('./pages/Account')),Configuration=lazy(()=>import('./pages/Configuration'));
const all:Role[]=['TSCC User','Team Leader','Department Head','Admin','Requester'];
const staff:Role[]=['TSCC User','Team Leader','Admin'];
const managers:Role[]=['Team Leader','Department Head','Admin'];
const navItems=[
  {to:'/reports',label:'Reports & Insights',icon:BarChart3,roles:['TSCC User',...managers]},
  {to:'/dashboard',label:'Dashboard',icon:Gauge,roles:staff},
  {to:'/my-cases',label:'My Cases',icon:ClipboardList,roles:staff},
  {to:'/quick-draft',label:'Quick Draft',icon:FilePlus2,roles:staff},
  {to:'/drafts',label:'Draft Cases',icon:FileText,roles:staff},
  {to:'/cases',label:'Case Monitoring',icon:Search,roles:managers},
  {to:'/workload',label:'Team Workload & Activity',icon:Users,roles:managers},
  {to:'/insights',label:'AI Insights',icon:Sparkles,roles:managers},
  {to:'/requests',label:'My Requests',icon:ClipboardList,roles:['Requester']},
  {to:'/configuration',label:'Configuration',icon:Settings,roles:['Admin']},
];
const translations:Record<string,string>={'Reports & Insights':'Laporan & Insight','Dashboard':'Dashboard','My Cases':'Case Saya','Quick Draft':'Draft Cepat','Draft Cases':'Draft Case','Case Monitoring':'Monitoring Case','Team Workload & Activity':'Beban Kerja & Aktivitas Tim','AI Insights':'Insight AI','My Requests':'Permintaan Saya','Configuration':'Konfigurasi','Profile':'Profil','Account Settings':'Pengaturan Akun','New Case':'Case Baru','Sign out':'Keluar'};
export function landing(role:Role){return role==='Admin'?'/configuration':role==='Requester'?'/requests':role==='Department Head'||role==='Team Leader'?'/reports':'/dashboard';}
function Allowed({roles,children}:{roles:Role[];children:React.ReactNode}){const {profile}=useAuth();return roles.includes(profile!.role)?children:<Navigate to={landing(profile!.role)} replace/>;}
function Layout(){
  const {profile}=useAuth(),{cases,loading,error,refresh}=useData();const location=useLocation(),navigate=useNavigate();const [mobile,setMobile]=useState(false),[authError,setAuthError]=useState('');
  const t=(value:string)=>profile!.language==='id'?translations[value]||value:value;
  const current=navItems.find(i=>i.to===location.pathname)?.label || (location.pathname.startsWith('/cases/')?'Ticket Detail':location.pathname==='/profile'?'Profile':location.pathname==='/account'?'Account Settings':'New Case');
  useEffect(()=>{setMobile(false);document.documentElement.lang=profile!.language;},[location.pathname,profile!.language]);
  async function logout(){setAuthError('');const {error}=await supabase.auth.signOut();if(error)setAuthError(error.message);}
  return <div className="app"><a className="skip-link" href="#mainContent">Skip to main content</a>{mobile?<button className="sidebar-scrim" aria-label="Close menu" onClick={()=>setMobile(false)}/>:null}<aside className={'sidebar '+(mobile?'open':'')}><div className="brand"><div className="logo">TC</div><div><strong>T-CAMS</strong><span>TSCC Case Management System</span></div><button className="icon-btn mobile-only" aria-label="Close navigation" onClick={()=>setMobile(false)}><X size={19}/></button></div><NavLink className="profile-entry" to="/profile"><div className="avatar">{profile!.full_name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><strong>{profile!.full_name}</strong><small>{profile!.role}</small></div></NavLink><nav className="menu" aria-label="Main navigation"><div className="menu-label">WORKSPACE</div>{navItems.filter(item=>item.roles.includes(profile!.role)).map(item=><NavLink key={item.to} to={item.to} className={({isActive})=>'menu-item '+(isActive?'active':'')}><item.icon size={17}/><span>{t(item.label)}</span>{item.to==='/drafts'?<span className="nav-count">{cases.filter(c=>c.is_draft).length}</span>:null}</NavLink>)}<div className="menu-label">ACCOUNT</div><NavLink to="/profile" className={({isActive})=>'menu-item '+(isActive?'active':'')}><UserRound size={17}/>{t('Profile')}</NavLink><NavLink to="/account" className={({isActive})=>'menu-item '+(isActive?'active':'')}><ShieldCheck size={17}/>{t('Account Settings')}</NavLink><button className="menu-item" onClick={()=>void logout()}><LogOut size={17}/>{t('Sign out')}</button></nav><div className="sidebar-footer"><span className="connected-dot"/>Connected to Supabase</div></aside>
  <main className="main"><header className="topbar"><button className="icon-btn mobile-only" onClick={()=>setMobile(true)} aria-label="Open navigation"><Menu size={20}/></button><div><h1>{t(current)}</h1><span>TSCC / {profile!.role}</span></div><div className="topbar-actions"><span className="today-date"><CalendarDays size={15}/>{new Date().toLocaleDateString('en-GB',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',year:'numeric'})}</span><button className="icon-btn" onClick={()=>void refresh()} disabled={loading} aria-label="Refresh workspace"><RefreshCw size={17} className={loading?'spin':''}/></button>{staff.includes(profile!.role)?<button className="btn primary" onClick={()=>navigate('/new-case')}><FilePlus2 size={16}/>{t('New Case')}</button>:null}</div></header><div className="content" id="mainContent"><ErrorMessage message={authError}/>{error?<div className="data-error"><ErrorMessage message={error}/><button className="btn secondary" onClick={()=>void refresh()}>Retry Loading Data</button></div>:null}
  {loading&&!cases.length?<Loading/>:<Suspense fallback={<Loading/>}><Routes>
    <Route path="/" element={<Navigate to={landing(profile!.role)} replace/>}/>
    <Route path="/dashboard" element={<Allowed roles={staff}><Dashboard/></Allowed>}/>
    <Route path="/my-cases" element={<Allowed roles={staff}><Cases mode="mine"/></Allowed>}/>
    <Route path="/drafts" element={<Allowed roles={staff}><Cases mode="drafts"/></Allowed>}/>
    <Route path="/quick-draft" element={<Allowed roles={staff}><CaseForm quick/></Allowed>}/>
    <Route path="/new-case" element={<Allowed roles={staff}><CaseForm/></Allowed>}/>
    <Route path="/cases" element={<Allowed roles={['TSCC User',...managers]}><Cases/></Allowed>}/>
    <Route path="/cases/:id/edit" element={<Allowed roles={staff}><CaseForm/></Allowed>}/>
    <Route path="/cases/:id" element={<Allowed roles={all}><CaseDetail key={location.pathname}/></Allowed>}/>
    <Route path="/reports" element={<Allowed roles={['TSCC User',...managers]}><Reports/></Allowed>}/>
    <Route path="/insights" element={<Allowed roles={managers}><Reports signalsOnly/></Allowed>}/>
    <Route path="/workload" element={<Allowed roles={managers}><Workload/></Allowed>}/>
    <Route path="/requests" element={<Allowed roles={['Requester']}><Cases mode="requests"/></Allowed>}/>
    <Route path="/configuration" element={<Allowed roles={['Admin']}><Configuration/></Allowed>}/>
    <Route path="/profile" element={<Profile/>}/><Route path="/account" element={<Account/>}/>
    <Route path="*" element={<Navigate to={landing(profile!.role)} replace/>}/>
  </Routes></Suspense>}</div></main></div>;
}
export default function App(){const {session,profile,loading,error,recovery,refreshProfile}=useAuth();if(configurationError)return <Login/>;if(loading)return <Loading text="Checking your secure session…"/>;if(!session||recovery)return <Login/>;if(error||!profile)return <main className="fatal"><h2>Unable to load your account</h2><ErrorMessage message={error||'No account profile found. Contact your administrator.'}/><button className="btn primary" onClick={()=>void refreshProfile()}>Retry</button><button className="btn secondary" onClick={()=>void supabase.auth.signOut()}>Sign out</button></main>;return <DataProvider><Layout/></DataProvider>;}
