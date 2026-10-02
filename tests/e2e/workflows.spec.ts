import { test, expect, type Page } from '@playwright/test';
import { defaultConfig, type CaseRecord, type Profile, type Role } from '../../src/lib/types';
const staffId='00000000-0000-4000-8000-000000000001',caseId='00000000-0000-4000-8000-000000000010';
const baseCase:CaseRecord={id:caseId,ticket:'TSCC-2026-000001',created_at:'2026-10-01T02:00:00Z',updated_at:'2026-10-01T03:00:00Z',created_by:staffId,requester_id:staffId,requester_name:'Test Requester',requester_unit:'RM',region:'W01',segment:'Business',customer_name:'Fixture Customer',counterpart:'',contact:'requester@example.invalid',channel:'Email',product:'SCF',category:'Inquiry',raw_category:'Inquiry',subcategory:'Transaction Status',reference_no:'',subject:'Fixture SCF inquiry',description:'A synthetic case used only for automated verification.',resolution_summary:'',complexity:'',involvement:'Business',priority:'Medium',supporting_unit:'None',additional_info:'',primary_pic_id:staffId,primary_pic_name:'Test Staff',collaborator_ids:[],collaborator_names:[],is_draft:false,draft_reason:'',lifecycle:'In Progress',escalation_status:'Not Escalated',escalation_reason:'',closure_date:null,closure_reason:'',follow_up_date:null,actual_handling_hours:null,waiting_hours:0,waiting_since:null,source_batch:null,reopened:false};
async function workspace(page:Page,role:Role){
  const user={id:staffId,aud:'authenticated',role:'authenticated',email:'test@example.invalid',email_confirmed_at:'2026-10-01',created_at:'2026-10-01',app_metadata:{provider:'email',providers:['email']},user_metadata:{}};
  const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:staffId,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fixture-signature';
  const profile:Profile={id:staffId,email:user.email,full_name:role==='Requester'?'Test Requester':'Test Staff',username:'test',role,unit:'TSCC',region:'W01',npp:'TEST-001',phone:'',language:'en',avatar_path:null};
  const state={cases:[{...baseCase}],profiles:[profile],comments:[] as Record<string,unknown>[],activity:[] as Record<string,unknown>[],notes:[] as Record<string,unknown>[],reminders:[] as Record<string,unknown>[],internal:null as Record<string,unknown>|null};
  await page.addInitScript(({token,user})=>localStorage.setItem('sb-eosjflarlcwygtcsvaio-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{token,user});
  await page.route('https://eosjflarlcwygtcsvaio.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    const object=request.headers().accept?.includes('vnd.pgrst.object');const body=request.method()==='GET'?null:request.postDataJSON();
    let result:unknown=[];
    if(path.endsWith('/auth/v1/user'))result=user;
    else if(path.endsWith('/rest/v1/profiles')){if(request.method()==='PATCH')Object.assign(profile,body);result=object?profile:[profile];}
    else if(path.endsWith('/rest/v1/configuration'))result=object?{value:defaultConfig}:[{value:defaultConfig}];
    else if(path.endsWith('/rest/v1/cases')){
      if(request.method()==='POST'){const c={...baseCase,...body,id:crypto.randomUUID(),ticket:'TSCC-2026-000002'};state.cases.unshift(c);result=c;}
      else if(request.method()==='PATCH'){const id=url.searchParams.get('id')?.replace('eq.','');const c=state.cases.find(c=>c.id===id)!;Object.assign(c,body);result=c;}
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
test('login rejects an invalid password without exposing the application',async({page})=>{
  await page.route('**/auth/v1/token?grant_type=password',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'invalid_grant',error_description:'Invalid login credentials'})}));
  await page.goto('/');await page.getByLabel('Email address').fill('test@example.invalid');await page.getByLabel('Password',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Invalid login credentials');await expect(page.getByRole('navigation',{name:'Main navigation'})).toHaveCount(0);
});
test('staff creates a draft, submits it, posts a comment, and closes the case',async({page})=>{
  const state=await workspace(page,'TSCC User');await page.goto('/new-case');
  await page.getByLabel('Requester Name',{exact:true}).fill('New Fixture Requester');await page.getByLabel('Subject',{exact:true}).fill('New fixture case');await page.getByLabel('Description / Original Source',{exact:true}).fill('Please review the fixture documentation.');
  await page.getByRole('button',{name:'Save Draft',exact:true}).click();await expect(page.getByRole('heading',{name:'TSCC-2026-000002',exact:true})).toBeVisible();expect(state.cases[0].is_draft).toBe(true);
  await page.getByRole('button',{name:'Edit Case',exact:true}).click();await page.getByRole('button',{name:'Submit Case',exact:true}).click();await expect(page.getByRole('heading',{name:'TSCC-2026-000002',exact:true})).toBeVisible();expect(state.cases[0].is_draft).toBe(false);
  await page.getByLabel('Add a comment').fill('Requester-visible fixture update');await page.getByLabel('Comment visibility').selectOption('Requester');await page.getByRole('button',{name:'Post Comment'}).click();await expect(page.getByText('Requester-visible fixture update',{exact:true})).toBeVisible();
  await page.getByLabel('Lifecycle',{exact:true}).selectOption('Closed');await page.getByLabel('Resolution Summary',{exact:true}).fill('Fixture issue resolved.');await page.getByLabel('Closure / Reopen Reason',{exact:true}).fill('Requester confirmed completion.');await page.getByRole('button',{name:'Update Case'}).click();await expect(page.getByRole('status')).toContainText('Case updated.');expect(state.cases[0].lifecycle).toBe('Closed');
});
test('department head drills into filtered reports and has read-only case access',async({page})=>{
  await workspace(page,'Department Head');await page.goto('/reports');await expect(page.getByRole('heading',{name:'Reports & Insights',exact:true}).last()).toBeVisible();await page.getByRole('button',{name:/Total Cases/}).click();await expect(page.getByRole('heading',{name:'Total Cases',exact:true})).toBeVisible();await page.getByRole('link',{name:'TSCC-2026-000001',exact:true}).click();await expect(page.getByRole('heading',{name:'TSCC-2026-000001',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Edit Case'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Update Case'})).toHaveCount(0);
});
test('requester sees own tickets and no internal notes or comments UI',async({page})=>{
  await workspace(page,'Requester');const internalRequests:string[]=[];page.on('request',r=>{if(r.url().includes('/case_internal'))internalRequests.push(r.url());});await page.goto('/requests');await page.getByRole('link',{name:'TSCC-2026-000001',exact:true}).click();await expect(page.getByRole('heading',{name:'Internal Notes'})).toHaveCount(0);await expect(page.getByLabel('Comment visibility')).toHaveCount(0);await expect(page.getByRole('button',{name:'Edit Case'})).toHaveCount(0);expect(internalRequests).toEqual([]);
});
test('mobile navigation and personal calendar notes work',async({page})=>{
  const state=await workspace(page,'TSCC User');await page.setViewportSize({width:390,height:844});await page.goto('/dashboard');await page.getByLabel('Calendar note').fill('Follow up on fixture case');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText('Follow up on fixture case',{exact:true})).toBeVisible();expect(state.notes).toHaveLength(1);await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('link',{name:'My Cases',exact:true}).click();await expect(page.getByRole('heading',{name:'My Cases',exact:true}).last()).toBeVisible();
});
