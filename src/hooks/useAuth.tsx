import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, checkError } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface AuthState { session: Session | null; profile: Profile | null; loading: boolean; error: string; recovery: boolean; refreshProfile: () => Promise<void>; finishRecovery: () => void }
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({children}: {children: ReactNode}) {
  const [session,setSession] = useState<Session | null>(null);
  const [profile,setProfile] = useState<Profile | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [recovery,setRecovery] = useState(() => new URLSearchParams(window.location.search).get('setup') === '1' || window.location.hash.includes('type=recovery') || window.location.hash.includes('type=invite'));
  const refreshProfile = useCallback(async () => {
    const {data: {user},error: authError} = await supabase.auth.getUser(); checkError(authError);
    if (!user) {setProfile(null);return;}
    const {data,error: profileError} = await supabase.from('profiles').select('*').eq('id',user.id).single();
    checkError(profileError); setProfile(data as Profile);
  },[]);
  useEffect(() => {
    let active = true;
    const {data: {subscription}} = supabase.auth.onAuthStateChange((event,next) => {
      if(!active)return;
      setSession(next);
      if(event === 'PASSWORD_RECOVERY')setRecovery(true);
    });
    supabase.auth.getSession().then(({data,error: sessionError}) => {
      if(!active)return;
      if(sessionError)setError(sessionError.message);
      setSession(data.session); setLoading(false);
    }).catch(e=>{if(active){setError(String(e));setLoading(false);}});
    return () => {active=false; subscription.unsubscribe();};
  },[]);
  useEffect(() => {
    let active=true;
    if(!session){setProfile(null);return;}
    setLoading(true);setError('');
    refreshProfile().catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[session?.user.id,refreshProfile]);
  return <AuthContext.Provider value={{session,profile,loading,error,recovery,refreshProfile,finishRecovery:()=>{setRecovery(false);window.history.replaceState({},'',window.location.pathname);}}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('Auth provider missing');return value;}
