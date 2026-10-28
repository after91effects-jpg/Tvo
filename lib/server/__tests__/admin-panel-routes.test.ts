import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ admin: vi.fn(), prepare: vi.fn(), run: vi.fn(), all: vi.fn(), customers: vi.fn(), orders: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), transaction: vi.fn(), get: vi.fn() }));
vi.mock('../api', () => ({ requireAdmin: mock.admin, db: { prepare: mock.prepare, transaction: mock.transaction }, ok: (data: unknown) => Response.json(data), err: (error: string, status = 400) => Response.json({ error }, { status }), logAudit: vi.fn(), jsonParseSafe: (s: string) => JSON.parse(s || '[]'), slugify: (s: string) => s }));
vi.mock('../admin-ops', () => ({ listCustomers: mock.customers, listOrders: mock.orders, createAdminUser: mock.createUser, updateAdminUser: mock.updateUser }));
vi.mock('../staff-accounts', () => ({ createStaffAccount: mock.createUser }));
vi.mock('../catalog-sources', () => ({ getCatalogSourceConfig: vi.fn() }));
vi.mock('../authorization', () => ({ hasPerm: () => true }));
vi.mock('../hampers', () => ({ getHamperSettings: vi.fn(), saveHamperSettings: vi.fn() }));
vi.mock('../logger', () => ({ logError: vi.fn() }));
vi.mock('../backup', () => ({ createDatabaseBackup: vi.fn(), listDatabaseBackups: vi.fn(), verifyDatabaseBackup: vi.fn() }));
import { GET, POST } from '../../../app/api/admin/route';
beforeEach(() => { vi.clearAllMocks(); mock.admin.mockReturnValue({ id: 1, role: 'super_admin' }); mock.all.mockReturnValue([]); mock.run.mockReturnValue({ lastInsertRowid: 42 }); mock.prepare.mockReturnValue({ all: mock.all, run: mock.run }); mock.customers.mockReturnValue({ customers: [] }); mock.orders.mockReturnValue({ orders: [] }); mock.createUser.mockReturnValue({ ok: true }); mock.updateUser.mockReturnValue({ ok: true }); });

describe('Admin panel request contracts', () => {
  it('passes the requested customer export limit to the listing', async () => {
    expect((await GET(new Request('http://localhost/api/admin?type=customers_page&limit=500&page=2'))).status).toBe(200);
    expect(mock.customers).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ limit: 500, page: 2 }));
  });
  it('combines order status and text search in the same query', async () => {
    await GET(new Request('http://localhost/api/admin?type=orders&status=Delivered&search=Alice'));
    expect(mock.prepare.mock.calls[0][0]).toContain('status=? AND (');
    expect(mock.all).toHaveBeenCalledWith('Delivered', '%Alice%', '%Alice%', '%Alice%', '%Alice%');
  });
  it('rejects requests without an admin session', async () => {
    mock.admin.mockReturnValue(null);
    expect((await GET(new Request('http://localhost/api/admin?type=customers'))).status).toBe(403);
    expect(mock.prepare).not.toHaveBeenCalled();
  });
  it('dispatches staff create requests with a body type', async () => {
    const res = await POST(new Request('http://localhost/api/admin?type=admin_users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'admin_users', action: 'create', name: 'Test' }) }));
    expect(await res.json()).toEqual({ ok: true });
    expect(mock.createUser).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'create', name: 'Test' }));
  });
  it('prevents ordinary admins from changing staff roles', async () => {
    mock.admin.mockReturnValue({ id: 2, role: 'admin' });
    const res = await POST(new Request('http://localhost/api/admin', { method: 'POST', body: JSON.stringify({ type: 'admin_users', action: 'update', id: 5, role: 'admin' }) }));
    expect(res.status).toBe(403);
    expect(mock.updateUser).not.toHaveBeenCalled();
  });
});


describe('Admin media persistence', () => {
  it('returns the persisted media ID for later edit/delete operations', async () => {
    const res = await POST(new Request('http://localhost/api/admin', { method: 'POST', body: JSON.stringify({ type: 'media', action: 'add', file_name: 'test.webp', url: '/test.webp' }) }));
    expect(await res.json()).toEqual({ ok: true, id: 42 });
  });
});


describe('Admin access enforcement', () => {
  it('rejects a catalog manager trying to change order status before touching the database', async () => {
    mock.admin.mockReturnValue({ id: 2, role: 'catalog_manager' });
    const res = await POST(new Request('http://localhost/api/admin', { method: 'POST', body: JSON.stringify({ type: 'orders', action: 'status', id: 1, status: 'Delivered' }) }));
    expect(res.status).toBe(403);
    expect(mock.prepare).not.toHaveBeenCalled();
  });
  it('rejects unauthorized review reads instead of returning an empty success', async () => {
    mock.admin.mockReturnValue({ id: 2, role: 'catalog_manager' });
    expect((await GET(new Request('http://localhost/api/admin?type=reviews'))).status).toBe(403);
    expect(mock.prepare).not.toHaveBeenCalled();
  });
  it('reports unavailable campaign sending without pretending to schedule', async () => {
    const res = await POST(new Request('http://localhost/api/admin', { method: 'POST', body: JSON.stringify({ type: 'tickets', action: 'save_broadcast' }) }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: expect.stringContaining('No messages were sent or scheduled') });
  });
});


describe('Image setting updates', () => {
  it('merges optimization fields while preserving the stored business configuration', async () => {
    mock.get.mockReturnValue({ value: JSON.stringify({ storeInfo: { name: 'Existing bakery' }, deliveryCities: ['Deoria'], thresholds: { freeDeliveryAbove: 999 }, imageOptimization: { existingFlag: true } }) });
    mock.prepare.mockReturnValue({ get: mock.get, run: mock.run });
    mock.transaction.mockImplementation(callback => callback);
    const res = await POST(new Request('http://localhost/api/admin', { method: 'POST', body: JSON.stringify({ type: 'image_optimization', action: 'save', settings: { quality: 80, maxWidthPx: 1200, maxHeightPx: 900 } }) }));
    expect(res.status).toBe(200);
    const saved = JSON.parse(mock.run.mock.lastCall?.[0]);
    expect(saved.storeInfo).toEqual({ name: 'Existing bakery' });
    expect(saved.deliveryCities).toEqual(['Deoria']);
    expect(saved.thresholds).toEqual({ freeDeliveryAbove: 999 });
    expect(saved.imageOptimization).toEqual({ existingFlag: true, quality: 80, maxWidthPx: 1200, maxHeightPx: 900, generateWebp: true });
  });
  it('rejects invalid optimization dimensions without changing settings', async () => {
    const res = await POST(new Request('http://localhost/api/admin', { method: 'POST', body: JSON.stringify({ type: 'image_optimization', action: 'save', settings: { quality: 101, maxWidthPx: -1, maxHeightPx: 900 } }) }));
    expect(res.status).toBe(400);
    expect(mock.prepare).not.toHaveBeenCalled();
  });
});
