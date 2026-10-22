import { describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { linkImportedPic, summarizeImportedPics } from '../src/lib/importedPic';
import type { CaseRecord, Profile, Role } from '../src/lib/types';

const person={id:'staff-id',full_name:'Staff',role:'TSCC User'} as Profile;
const record=(name:string,id:string|null=null,source:string|null='Legacy HTML')=>({primary_pic_name:name,primary_pic_id:id,source_batch:source}) as CaseRecord;
function server(count:number|null,error=false){
  const fetch=vi.fn(async()=>new Response(error?JSON.stringify({message:'Permission denied'}):null,{
    status:error?403:204,headers:count===null?{}:{'content-range':`*/${count}`},
  }));
  const client=createClient('https://fixture.invalid','synthetic-key',{global:{fetch},auth:{persistSession:false,autoRefreshToken:false}});
  return {client,fetch};
}

describe('imported PIC recap',()=>{
  it('counts unlinked, partial, and fully linked PICs and prioritizes pending work',()=>{
    const input=[record('Full','a'),record('Partial','b'),record('Partial'),record('Pending'),record('Pending'),record('Native',null,null)];
    const before=JSON.stringify(input);
    expect(summarizeImportedPics(input)).toEqual([
      {name:'Pending',total:2,linked:0,unlinked:2},
      {name:'Partial',total:2,linked:1,unlinked:1},
      {name:'Full',total:1,linked:1,unlinked:0},
    ]);
    expect(summarizeImportedPics(input).find(row=>row.name==='Absent')).toBeUndefined();
    expect(JSON.stringify(input)).toBe(before);
  });
  it('retains blank names for manual review and does not merge similar identities',()=>{
    expect(summarizeImportedPics([record(''),record('A'),record(' A ')]).map(r=>r.name).sort()).toEqual(['',' A ','A']);
    expect(summarizeImportedPics([])).toEqual([]);
  });
});

describe('link update confirmation',()=>{
  it.each([0,1,1201])('uses the actual exact server count %i and constrained update',async count=>{
    const {client,fetch}=server(count);
    expect(await linkImportedPic(client,'Admin','Legacy & Name',person)).toBe(count);
    const [request,init]=fetch.mock.calls[0] as unknown as [string,RequestInit];
    const url=new URL(request);
    expect(url.searchParams.get('primary_pic_name')).toBe('eq.Legacy & Name');
    expect(url.searchParams.get('primary_pic_id')).toBe('is.null');
    expect(url.searchParams.get('source_batch')).toBe('not.is.null');
    expect(init.method).toBe('PATCH');
    expect(new Headers(init.headers).get('prefer')).toContain('count=exact');
    expect(JSON.parse(init.body as string)).toEqual({primary_pic_id:person.id});
  });
  it.each<Role>(['Requester','TSCC User','Team Leader','Department Head'])('blocks %s before any request',async role=>{
    const {client,fetch}=server(1);
    await expect(linkImportedPic(client,role,'Legacy',person)).rejects.toThrow('Only Admin');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects invalid targets and empty names without sending updates',async()=>{
    const {client,fetch}=server(1);
    await expect(linkImportedPic(client,'Admin','Legacy',undefined)).rejects.toThrow('staff account');
    await expect(linkImportedPic(client,'Admin','Legacy',{...person,role:'Requester'})).rejects.toThrow('staff account');
    await expect(linkImportedPic(client,'Admin',' ',person)).rejects.toThrow('legacy PIC');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not claim success on server errors or an unconfirmed count',async()=>{
    const denied=server(null,true),unknown=server(null);
    await expect(linkImportedPic(denied.client,'Admin','Legacy',person)).rejects.toThrow('Permission denied');
    await expect(linkImportedPic(unknown.client,'Admin','Legacy',person)).rejects.toThrow('did not confirm');
  });
});
