import type { SupabaseClient } from '@supabase/supabase-js';
import type { CaseRecord, Profile, Role } from './types';

export function summarizeImportedPics(cases: CaseRecord[]) {
  const groups = new Map<string, { name: string; total: number; linked: number; unlinked: number }>();
  for (const record of cases) {
    if (record.source_batch === null) continue;
    // Keep exact source names: normalization here could merge distinct identities.
    const row = groups.get(record.primary_pic_name) ?? { name: record.primary_pic_name, total: 0, linked: 0, unlinked: 0 };
    row.total++;
    if (record.primary_pic_id === null) row.unlinked++;
    else row.linked++;
    groups.set(row.name, row);
  }
  return [...groups.values()].sort((a, b) => b.unlinked - a.unlinked || a.name.localeCompare(b.name));
}

export async function linkImportedPic(client: SupabaseClient, role: Role | undefined, name: string, person: Profile | undefined) {
  if (role !== 'Admin') throw new Error('Only Admin can link imported PIC assignments.');
  if (!name.trim()) throw new Error('Choose a legacy PIC name.');
  if (!person || !['TSCC User', 'Team Leader'].includes(person.role)) throw new Error('Choose a staff account.');
  // Exact count covers large batches without relying on a capped returned-row list.
  // Preserve source names, existing account links, and non-imported cases.
  const { count, error } = await client.from('cases')
    .update({ primary_pic_id: person.id }, { count: 'exact' })
    .eq('primary_pic_name', name)
    .not('source_batch', 'is', null)
    .is('primary_pic_id', null);
  if (error) throw new Error(error.message);
  if (count === null) throw new Error('The server did not confirm the updated count. Refresh the workspace before retrying.');
  return count;
}
