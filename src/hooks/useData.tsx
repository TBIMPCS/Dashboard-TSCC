import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase, checkError } from '../lib/supabase';
import { defaultConfig, type CaseRecord, type Configuration, type Profile, type CalendarNote } from '../lib/types';
import { useAuth } from './useAuth';

interface DataState { cases: CaseRecord[]; profiles: Profile[]; config: Configuration; notes: CalendarNote[]; loading: boolean; error: string; refresh: () => Promise<void> }
const DataContext=createContext<DataState | null>(null);
export async function fetchAllCases() {
  const results: CaseRecord[]=[];
  for(let offset=0;;offset+=1000){
    const {data,error}=await supabase.from('cases').select('*').order('updated_at',{ascending:false}).order('id').range(offset,offset+999);
    checkError(error); results.push(...(data as CaseRecord[]));
    if(!data || data.length<1000)break;
  }
  return results;
}
export function DataProvider({children}:{children:ReactNode}) {
  const {profile}=useAuth();
  const [cases,setCases]=useState<CaseRecord[]>([]),[profiles,setProfiles]=useState<Profile[]>([]),[config,setConfig]=useState(defaultConfig),[notes,setNotes]=useState<CalendarNote[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  const request=useRef(0);
  const refresh=useCallback(async()=>{
    const version=++request.current;setLoading(true);setError('');
    try {
      const [all,people,settings,calendar]=await Promise.all([
        fetchAllCases(),supabase.from('profiles').select('*').order('full_name'),
        supabase.from('configuration').select('value').eq('id',true).single(),
        supabase.from('calendar_notes').select('*').order('date'),
      ]);
      checkError(people.error);checkError(settings.error);checkError(calendar.error);
      if(version!==request.current)return;
      setCases(all);setProfiles(people.data as Profile[]);setConfig({...defaultConfig,...settings.data?.value as Configuration});setNotes(calendar.data as CalendarNote[]);
    }catch(e){if(version===request.current)setError(e instanceof Error?e.message:String(e));}
    finally{if(version===request.current)setLoading(false);}
  },[profile?.id]);
  useEffect(()=>{void refresh();return()=>{request.current++;};},[refresh]);
  return <DataContext.Provider value={{cases,profiles,config,notes,loading,error,refresh}}>{children}</DataContext.Provider>;
}
export function useData(){const value=useContext(DataContext);if(!value)throw new Error('Data provider missing');return value;}
