import type { UserRole } from '@prisma/client';
import type { SessionPayload } from './session';

const ROLE_LEVEL: Record<UserRole, number> = {
  ADMIN:           100,
  CHANGE_MANAGER:   80,
  PROJECT_MANAGER:  60,
  SPONSOR:          50,
  TEAM_LEAD:        40,
  EMPLOYEE:         20,
  READ_ONLY:        10,
};

/** True if the session role is in the allowed list. */
export function hasRole(session: SessionPayload, allowed: UserRole[]): boolean {
  return allowed.includes(session.role);
}

/** True if the session role meets or exceeds the minimum level. */
export function hasMinimumRole(session: SessionPayload, minimum: UserRole): boolean {
  return ROLE_LEVEL[session.role] >= ROLE_LEVEL[minimum];
}

/**
 * Call at the top of a server action or page to enforce role.
 * Returns the session on success; throws on auth or permission failure.
 */
export function requireRole(
  session: SessionPayload | null,
  allowed: UserRole[],
): SessionPayload {
  if (!session) throw new Error('Não autenticado');
  if (!hasRole(session, allowed)) throw new Error('Sem permissão');
  return session;
}

/**
 * Same as requireRole but uses minimum-level check instead of an explicit list.
 * Useful for "at least CHANGE_MANAGER" guards.
 */
export function requireMinimumRole(
  session: SessionPayload | null,
  minimum: UserRole,
): SessionPayload {
  if (!session) throw new Error('Não autenticado');
  if (!hasMinimumRole(session, minimum)) throw new Error('Sem permissão');
  return session;
}

/** Convenience: roles that can manage change (write to GM modules). */
export const GM_WRITER_ROLES: UserRole[] = [
  'ADMIN',
  'CHANGE_MANAGER',
  'PROJECT_MANAGER',
];

/** Convenience: roles that can only read. */
export const GM_READER_ROLES: UserRole[] = [
  ...GM_WRITER_ROLES,
  'SPONSOR',
  'TEAM_LEAD',
  'EMPLOYEE',
  'READ_ONLY',
];
