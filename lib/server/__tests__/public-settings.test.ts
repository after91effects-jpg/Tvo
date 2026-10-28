import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ prepare: vi.fn(), all: vi.fn() }));
vi.mock('../api', () => ({ db: { prepare: mock.prepare }, ok: (data: unknown) => Response.json(data), err: (error: string, status: number) => Response.json({ error }, { status }) }));
import { GET } from '../../../app/api/settings/route';
beforeEach(() => { vi.clearAllMocks(); mock.prepare.mockReturnValue({ all: mock.all }); });
describe('Public store settings', () => {
  it('queries only the explicit public keys, never the full settings table', async () => {
    mock.all.mockReturnValue([{ key: 'store_settings', value: '{"storeInfo":{"name":"Bakery"}}' }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mock.prepare).toHaveBeenCalledWith("SELECT key, value FROM settings WHERE key IN ('store_settings', 'hamper_settings')");
    expect(await res.json()).toEqual({ settings: { store_settings: '{"storeInfo":{"name":"Bakery"}}' } });
  });
  it('does not disclose database errors', async () => {
    mock.all.mockImplementation(() => { throw new Error('private database path'); });
    const res = await GET();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('private database path');
  });
});
