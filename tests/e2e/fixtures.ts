import { test as base, expect, type Page } from '@playwright/test';
export { expect };
export const test=base.extend<{networkGuard:void}>({
  networkGuard:[async({context},use)=>{
    await context.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:5173'?route.continue():route.abort());
    await use();
  },{auto:true}],
});
import { defaultConfig, type CaseRecord, type Profile, type Role } from '../../src/lib/types';
export const staffId='00000000-0000-4000-8000-000000000001',caseId='00000000-0000-4000-8000-000000000010';
export const baseCase:CaseRecord={id:caseId,ticket:'TSCC-2026-000001',created_at:'2026-10-01T02:00:00Z',updated_at:'2026-10-01T03:00:00Z',created_by:staffId,requester_id:staffId,requester_name:'Test Requester',requester_unit:'RM',region:'W01',segment:'Business',customer_name:'Fixture Customer',counterpart:'',contact:'requester@example.invalid',channel:'Email',product:'SCF',category:'Inquiry',raw_category:'Inquiry',subcategory:'Transaction Status',reference_no:'',subject:'Fixture SCF inquiry',description:'A synthetic case used only for automated verification.',resolution_summary:'',complexity:'',involvement:'Business',priority:'Medium',supporting_unit:'None',additional_info:'',primary_pic_id:staffId,primary_pic_name:'Test Staff',collaborator_ids:[],collaborator_names:[],is_draft:false,draft_reason:'',lifecycle:'In Progress',escalation_status:'Not Escalated',escalation_reason:'',closure_date:null,closure_reason:'',follow_up_date:null,actual_handling_hours:null,waiting_hours:0,waiting_since:null,source_batch:null,reopened:false};
export async function workspace(page:Page,role:Role){
  const user={id:staffId,aud:'authenticated',role:'authenticated',email:'test@example.invalid',email_confirmed_at:'2026-10-01',created_at:'2026-10-01',app_metadata:{provider:'email',providers:['email']},user_metadata:{}};
  const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:staffId,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fixture-signature';
  const profile:Profile={id:staffId,email:user.email,full_name:role==='Requester'?'Test Requester':'Test Staff',username:'test',role,unit:'TSCC',region:'W01',npp:'TEST-001',phone:'',language:'en',avatar_path:null};
  const state={casePatches:[] as {query:string;body:Record<string,unknown>}[],updateError:'',cases:[{...baseCase}],profiles:[profile],comments:[] as Record<string,unknown>[],activity:[] as Record<string,unknown>[],notes:[] as Record<string,unknown>[],reminders:[] as Record<string,unknown>[],internal:null as Record<string,unknown>|null};
  await page.addInitScript(({token,user})=>localStorage.setItem('sb-tscc-e2e-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{token,user});
  await page.route('https://tscc-e2e.supabase.invalid/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    const object=request.headers().accept?.includes('vnd.pgrst.object');const body=request.method()==='GET'?null:request.postDataJSON();
    let result:unknown=[];
    if(path.endsWith('/auth/v1/user'))result=user;
    else if(path.endsWith('/rest/v1/profiles')){if(request.method()==='PATCH')Object.assign(profile,body);result=object?profile:state.profiles;}
    else if(path.endsWith('/rest/v1/configuration'))result=object?{value:defaultConfig}:[{value:defaultConfig}];
    else if(path.endsWith('/rest/v1/cases')){
      if(request.method()==='POST'){const c={...baseCase,...body,id:crypto.randomUUID(),ticket:'TSCC-2026-000002'};state.cases.unshift(c);result=c;}
      else if(request.method()==='PATCH'){
        state.casePatches.push({query:url.search,body});
        if(state.updateError){await route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:state.updateError})});return;}
        const updated=state.cases.filter(c=>(!url.searchParams.has('id')||url.searchParams.get('id')==='eq.'+c.id)&&(!url.searchParams.has('primary_pic_name')||url.searchParams.get('primary_pic_name')==='eq.'+c.primary_pic_name)&&(!url.searchParams.has('primary_pic_id')||c.primary_pic_id===null)&&(!url.searchParams.has('source_batch')||c.source_batch!==null));
        updated.forEach(c=>Object.assign(c,body));
        if(request.headers().prefer?.includes('count=exact')){await route.fulfill({status:204,headers:{'content-range':`*/${updated.length}`,'access-control-allow-origin':'*','access-control-expose-headers':'content-range'}});return;}
        result=object?updated[0]:updated;
      }
      else result=object?state.cases.find(c=>c.id===url.searchParams.get('id')?.replace('eq.','')):state.cases;
    }
    else if(path.endsWith('/rest/v1/case_comments')){if(body){state.comments.push({...body,id:crypto.randomUUID(),created_at:new Date().toISOString()});}result=state.comments;}
    else if(path.endsWith('/rest/v1/case_activity'))result=state.activity;
    else if(path.endsWith('/rest/v1/calendar_notes')){if(body)state.notes.push({...body,id:crypto.randomUUID()});result=state.notes;}
    else if(path.endsWith('/rest/v1/reminders')){if(body)state.reminders.push({...body,id:crypto.randomUUID()});result=state.reminders;}
    else if(path.endsWith('/rest/v1/case_internal')){if(body)state.internal=body;result=object?state.internal:state.internal?[state.internal]:[];}
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result),headers:{'access-control-allow-origin':'*'}});
  });
  return state;
}
