import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ prepare: vi.fn(), get: vi.fn() }));
vi.mock('../db', () => ({ db: { prepare: mock.prepare }, initDb: vi.fn() }));
vi.mock('../logger', () => ({ logError: vi.fn() }));
import { getCurrentUser, signToken } from '../auth';
beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'isolated-session-test-secret');
  mock.prepare.mockImplementation((sql: string) => ({ get: sql.includes('revoked_tokens') ? () => undefined : mock.get }));
});
afterEach(() => vi.unstubAllEnvs());
describe('Staff cookie validity', () => {
  it.each(['inactive', 'suspended'])('rejects an existing cookie after a staff account becomes %s', status => {
    mock.get.mockReturnValue({id: 1, role: 'super_admin', status});
    const token = signToken({sub: 1, role: 'super_admin'});
    expect(getCurrentUser(new Request('http://localhost', {headers:{cookie:`tvo_auth=${token}`}}))).toBeNull();
  });
  it('uses the current database role for an active account', () => {
    mock.get.mockReturnValue({id: 1, role: 'catalog_manager', status: 'active'});
    const token = signToken({sub: 1, role: 'super_admin'});
    expect(getCurrentUser(new Request('http://localhost', {headers:{cookie:`tvo_auth=${token}`}}))).toMatchObject({role:'catalog_manager'});
  });
});
