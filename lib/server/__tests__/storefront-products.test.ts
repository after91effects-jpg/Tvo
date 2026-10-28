import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ prepare: vi.fn(), user: vi.fn(), statements: [] as { sql: string; params: unknown[] }[] }));
vi.mock('../api', () => ({
  db: { prepare: mocks.prepare },
  getCurrentUser: mocks.user,
  isAdminRole: (role: string) => ['admin', 'super_admin'].includes(role),
  ok: (data: unknown) => Response.json(data),
  err: (error: string, status = 400) => Response.json({ error }, { status }),
}));
vi.mock('../product-serializer', () => ({ PRODUCT_BASE_SELECT: 'SELECT p.* FROM products p', serializeProduct: (row: unknown) => row ?? null }));
vi.mock('../occasions', () => ({ resolveActiveOccasion: () => null, getOccasionBySlug: () => null }));
import { GET } from '../../../app/api/products/route';

beforeEach(() => {
  mocks.statements.length = 0;
  mocks.user.mockReturnValue(null);
  mocks.prepare.mockImplementation((sql: string) => ({
    get: (...params: unknown[]) => {
      mocks.statements.push({ sql, params });
      return sql.includes('COUNT') ? { c: 0 } : undefined;
    },
    all: (...params: unknown[]) => { mocks.statements.push({ sql, params }); return []; },
  }));
});

describe('Storefront product access and pagination', () => {
  it.each(['slug=hidden-cake', 'id=99', 'slug=hidden-cake&include_drafts=1'])('applies published/deleted checks to direct access: %s', async query => {
    const res = await GET(new Request(`http://localhost/api/products?${query}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
    expect(mocks.statements[0].sql).toContain('p.deleted_at IS NULL AND p.published = 1');
  });
  it('allows admin draft preview without public caching', async () => {
    mocks.user.mockReturnValue({ role: 'admin' });
    const res = await GET(new Request('http://localhost/api/products?slug=draft&include_drafts=1'));
    expect(mocks.statements[0].sql).not.toContain('p.published = 1');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it.each([['limit=bad&offset=bad', 100, 0], ['limit=-9&offset=-4', 1, 0], ['limit=1000&offset=1.8', 200, 1]])('normalizes invalid pagination %s', async (query, limit, offset) => {
    const res = await GET(new Request(`http://localhost/api/products?${query}`));
    expect(res.status).toBe(200);
    expect(mocks.statements.find(s => s.sql.includes('LIMIT ?'))?.params).toEqual([limit, offset]);
  });
  it('keeps products with inventory tracking disabled in stock results', async () => {
    await GET(new Request('http://localhost/api/products?in_stock=1'));
    expect(mocks.statements[0].sql).toContain('p.manage_stock = 0 OR p.enable_stock = 0 OR');
  });
});
