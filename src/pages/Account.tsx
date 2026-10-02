import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, checkError } from '../lib/supabase';
import { Card, ErrorMessage, PageHead } from '../components/UI';
export default function Account(){
  const {profile,refreshProfile}=useAuth();const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function change(){setBusy(true);setError('');setMessage('');try{if(password.length<12)throw new Error('Use at least 12 characters for your new password.');if(password!==confirm)throw new Error('New password and confirmation do not match.');const {error:authError}=await supabase.auth.signInWithPassword({email:profile!.email,password:current});checkError(authError);const {error}=await supabase.auth.updateUser({password});checkError(error);setCurrent('');setPassword('');setConfirm('');setMessage('Password updated.');}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
  return <>
    <PageHead title="Account Settings" description="Password, security, and language preferences."/>
    <Card title="Password & Security" className="account-card">
      <ErrorMessage message={error}/>
      {message?<div className="success-msg" role="status">{message}</div>:null}
      <form onSubmit={e=>{e.preventDefault();void change();}}>
        <label className="field">Current Password<input type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} required/></label>
        <label className="field">New Password<input type="password" autoComplete="new-password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        <p className="small">Use at least 12 characters.</p>
        <label className="field">Confirm New Password<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>
        <button className="btn primary" disabled={busy}>{busy?'Updating…':'Update Password'}</button>
      </form>
      <div className="divider"/><h3>Language</h3>
      <div className="lang-options">
        {[{label:'English',value:'en'},{label:'Bahasa Indonesia',value:'id'}].map(l=><label key={l.value}>
          <input type="radio" name="language" value={l.value} checked={profile!.language===l.value} disabled={busy} onChange={async()=>{
            setError('');
            const {error}=await supabase.from('profiles').update({language:l.value}).eq('id',profile!.id);
            if(error)setError(error.message);
            else{await refreshProfile();document.documentElement.lang=l.value;}
          }}/>{l.label}
        </label>)}
      </div>
    </Card>
  </>;
}

