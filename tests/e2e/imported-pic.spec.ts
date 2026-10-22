import { test, expect, workspace, baseCase, staffId } from './fixtures';
import type { Role } from '../../src/lib/types';

test('Admin sees an imported-only recap and links only unlinked cases',async({page})=>{
  const state=await workspace(page,'Admin');
  state.profiles.push({...state.profiles[0],id:'target-staff',role:'TSCC User',full_name:'Target Staff'});
  state.cases=[
    {...baseCase,id:'pending-1',source_batch:'Legacy HTML',primary_pic_name:'Pending',primary_pic_id:null},
    {...baseCase,id:'pending-2',source_batch:'Legacy HTML',primary_pic_name:'Pending',primary_pic_id:null},
    {...baseCase,id:'partial-1',source_batch:'Legacy HTML',primary_pic_name:'Partial',primary_pic_id:null},
    {...baseCase,id:'partial-2',source_batch:'Legacy HTML',primary_pic_name:'Partial'},
    {...baseCase,id:'full',source_batch:'Legacy HTML',primary_pic_name:'Full'},
    {...baseCase,id:'native',primary_pic_name:'Pending',primary_pic_id:null},
    {...baseCase,id:'blank',source_batch:'Legacy HTML',primary_pic_name:'',primary_pic_id:null},
  ];
  const source=structuredClone(state.cases);
  await page.goto('/configuration');
  const totals=page.getByLabel('Imported PIC totals'),recap=page.getByRole('table',{name:'Imported PIC recap'});
  await expect(totals).toHaveText('Total imported: 6 · Linked: 2 · Unlinked: 4');
  await expect(recap.getByRole('row').nth(1)).toHaveText('Pending202');
  await expect(recap.getByRole('row').filter({hasText:'Partial'})).toHaveText('Partial211');
  await expect(page.getByLabel('Legacy PIC').getByRole('option',{name:/Full \(/})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Link Assignments',exact:true})).toBeDisabled();
  await page.getByLabel('Legacy PIC').selectOption('Partial');
  await page.getByLabel('Authenticated staff account').selectOption('target-staff');
  await page.getByRole('button',{name:'Link Assignments',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'1 imported case(s) linked to Target Staff.'})).toBeVisible();
  await expect(totals).toHaveText('Total imported: 6 · Linked: 3 · Unlinked: 3');
  await expect(page.getByLabel('Legacy PIC').getByRole('option',{name:/Partial \(/})).toBeDisabled();
  expect(state.cases.find(c=>c.id==='partial-1')?.primary_pic_id).toBe('target-staff');
  expect(state.cases.find(c=>c.id==='partial-2')?.primary_pic_id).toBe(staffId);
  expect(state.cases).toEqual(source.map(c=>c.id==='partial-1'?{...c,primary_pic_id:'target-staff'}:c));
  await page.getByLabel('Legacy PIC').selectOption('Pending');
  await page.getByRole('button',{name:'Link Assignments',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'2 imported case(s) linked'})).toBeVisible();
  expect(state.cases.find(c=>c.id==='native')?.primary_pic_id).toBeNull();
});

for(const scenario of ['fully linked','not found'] as const){
  test(`stale selection reports zero updated when PIC is ${scenario}`,async({page})=>{
    const state=await workspace(page,'Admin');
    state.profiles.push({...state.profiles[0],id:'target',role:'TSCC User',full_name:'Target Staff'});
    state.cases=[{...baseCase,source_batch:'Legacy HTML',primary_pic_name:'Legacy',primary_pic_id:null}];
    await page.goto('/configuration');
    await page.getByLabel('Legacy PIC').selectOption('Legacy');
    await page.getByLabel('Authenticated staff account').selectOption('target');
    if(scenario==='fully linked')state.cases[0].primary_pic_id=staffId;
    else state.cases=[];
    await page.getByRole('button',{name:'Link Assignments',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'No cases updated for “Legacy”'})).toBeVisible();
    await expect(page.getByRole('status').filter({hasText:'imported case(s) linked'})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Link Assignments',exact:true})).toBeDisabled();
    expect(state.casePatches).toHaveLength(1);
  });
}

test('server rejection shows an error without a success confirmation',async({page})=>{
  const state=await workspace(page,'Admin');
  state.profiles.push({...state.profiles[0],id:'target',role:'TSCC User'});
  state.cases=[{...baseCase,source_batch:'Legacy HTML',primary_pic_name:'Legacy',primary_pic_id:null}];
  state.updateError='Permission denied';
  await page.goto('/configuration');await page.getByLabel('Legacy PIC').selectOption('Legacy');await page.getByLabel('Authenticated staff account').selectOption('target');
  await page.getByRole('button',{name:'Link Assignments',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveText('Permission denied');
  expect(state.cases[0].primary_pic_id).toBeNull();
});

for(const role of ['TSCC User','Team Leader','Department Head','Requester'] as Role[]){
  test(`${role} cannot open the Admin linking feature`,async({page})=>{
    const state=await workspace(page,role);await page.goto('/configuration');
    await expect(page).toHaveURL(role==='Requester'?'/requests':role==='TSCC User'?'/dashboard':'/reports');
    await expect(page.getByLabel('Legacy PIC')).toHaveCount(0);
    await expect(page.getByRole('link',{name:'Configuration',exact:true})).toHaveCount(0);
    expect(state.casePatches).toEqual([]);
  });
}
