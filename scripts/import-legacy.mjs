// Run locally with a server-only key. Never place this key in VITE_* variables.
import { createClient } from '@supabase/supabase-js';
import { extractCases,transformCase } from './legacy-transform.mjs';
const file=process.argv[2];
const url=process.env.SUPABASE_URL || 'https://eosjflarlcwygtcsvaio.supabase.co';
const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!file||!key)throw new Error('Usage: set SUPABASE_SECRET_KEY in your terminal environment, then npm run import:legacy -- /path/to/source.html');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const records=extractCases(file);
for(let offset=0;offset<records.length;offset+=100){
  const batch=records.slice(offset,offset+100);
  const {data,error}=await client.from('cases').upsert(batch.map(transformCase),{onConflict:'ticket',ignoreDuplicates:true}).select('id,ticket');
  if(error)throw error;
  // Retrieve IDs for both inserted and already-present rows, keeping original records idempotently.
  const {data:ids,error:idError}=await client.from('cases').select('id,ticket').in('ticket',batch.map(c=>c.ticket));if(idError)throw idError;
  const lookup=new Map(ids.map(c=>[c.ticket,c.id]));
  const {error:internalError}=await client.from('case_internal').upsert(batch.map(c=>({case_id:lookup.get(c.ticket),internal_note:c.internalNote||'',legacy_source:c})),{onConflict:'case_id',ignoreDuplicates:true});
  if(internalError)throw internalError;
  if(data.length){const {error:auditError}=await client.from('case_activity').insert(data.map(c=>({case_id:c.id,actor_name:'Legacy TSCC Import',action:'Case Imported',body:'Original source record preserved.',visibility:'Internal'})));if(auditError)throw auditError;}
  console.log(`Imported ${Math.min(offset+100,records.length)} / ${records.length}`);
}
console.log('Import complete. An administrator must link staff assignments and requester accounts explicitly.');
