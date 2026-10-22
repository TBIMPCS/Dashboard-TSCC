import { test, expect, workspace } from './fixtures';
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

