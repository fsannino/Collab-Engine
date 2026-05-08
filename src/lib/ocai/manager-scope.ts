import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/core/auth/session';

// Roles with unrestricted access to all OCAI results across the tenant
const FULL_ACCESS_ROLES: SessionPayload['role'][] = ['ADMIN', 'CHANGE_MANAGER'];

/**
 * Returns the areaId the caller is scoped to, or null for full-access roles.
 * Use the returned value to add `areaId: scope` to Prisma where clauses.
 *
 * null  → no filter, caller sees everything
 * string → caller sees only AvaliacaoCultura linked to that area
 */
export async function getOcaiAreaScope(session: SessionPayload): Promise<string | null> {
  if (FULL_ACCESS_ROLES.includes(session.role)) return null;

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { areaId: true },
  });
  return user?.areaId ?? null;
}

/**
 * Builds a Prisma where fragment for filtering AvaliacaoCultura by scope.
 * Full-access roles return {} (no filter).
 * Scoped users return { areaId: scope } (only their area's surveys).
 */
export function buildAreaFilter(scope: string | null): { areaId?: string } {
  return scope ? { areaId: scope } : {};
}
