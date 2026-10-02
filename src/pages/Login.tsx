import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase, checkError, configurationError } from '../lib/supabase';
import { ErrorMessage } from '../components/UI';
import { useAuth } from '../hooks/useAuth';
export default function Login(){
  const {session,recovery,finishRecovery}=useAuth();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[visible,setVisible]=useState(false);
  const [forgot,setForgot]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const setup=Boolean(session && recovery);
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      if(configurationError)throw new Error(configurationError);
      if(setup){
        if(password!==confirm)throw new Error('Passwords do not match.');
        if(password.length<12)throw new Error('Use at least 12 characters.');
        const {error}=await supabase.auth.updateUser({password});checkError(error);finishRecovery();
      }else if(forgot){
        const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/account?setup=1'});checkError(error);
        setMessage('If an account exists for this email, a password reset link will arrive shortly.');
      }else{
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});checkError(error);
      }
    }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  }
  return <main className="login"><div className="login-shell"><div className="login-visual"><div className="tcams-wordmark"><div className="mark">TC</div><div><h1>T-CAMS</h1><p>TSCC Case Management System</p></div></div><div className="login-tagline">Capture • Collaborate • Follow-up • Advise</div><div className="network" aria-hidden="true">{['n1','n2','n3','n4','n5'].map(x=><span key={x} className={'node '+x}/>)}{['l1','l2','l3','l4'].map(x=><span key={x} className={'line '+x}/>)}</div><div className="login-visual-footer"><ShieldCheck size={18}/> Connected case handling. Clear operational insight.</div></div>
  <form className="login-panel" onSubmit={submit}><h2>{setup?'Set your password':forgot?'Reset your password':'Welcome back'}</h2><p>{setup?'Choose a password to secure your T-CAMS account.':forgot?'Enter the email associated with your account.':'Sign in to your TSCC workspace.'}</p>
  {!setup?<div className="login-field"><label htmlFor="loginEmail">Email address</label><input id="loginEmail" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></div>:null}
  {!forgot || setup?<div className="login-field"><label htmlFor="loginPassword">{setup?'New password':'Password'}</label><div className="pw-wrap"><input id="loginPassword" type={visible?'text':'password'} autoComplete={setup?'new-password':'current-password'} minLength={setup?12:undefined} value={password} onChange={e=>setPassword(e.target.value)} required/><button className="pw-toggle" type="button" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>:null}
  {setup?<div className="login-field"><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></div>:null}
  <ErrorMessage message={error||configurationError||''}/>{message?<div className="success-msg" role="status">{message}</div>:null}
  <button className="btn primary" disabled={busy||Boolean(configurationError)}>{busy?'Please wait…':setup?'Save password':forgot?'Send reset link':'Sign in'}</button>
  {!setup?<button type="button" className="link login-forgot" onClick={()=>{setForgot(!forgot);setError('');setMessage('');}}>{forgot?'Back to sign in':'Forgot password?'}</button>:null}
  <div className="login-footer">Access is managed by your T-CAMS administrator.<br/>Secure authentication powered by Supabase.</div></form></div></main>;
}
