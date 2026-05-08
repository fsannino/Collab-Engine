import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getSession } from '@/core/auth/session';

// POST /api/bridge/refresh — busts 'bridge-all' cache tag for all projects
export async function POST() {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'CHANGE_MANAGER' && session.role !== 'PROJECT_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  revalidateTag('bridge-all', 'default');
  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() });
}
