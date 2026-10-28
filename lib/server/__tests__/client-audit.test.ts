import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ user: vi.fn(), prepare: vi.fn(), run: vi.fn() }));
vi.mock('../api', () => ({ requireAdmin: mock.user, db: {prepare: mock.prepare}, ok: (data:unknown) => Response.json(data), err: (error:string,status:number) => Response.json({error},{status}) }));
import { POST } from '../../../app/api/admin/audit/route';
beforeEach(() => { vi.clearAllMocks(); mock.user.mockReturnValue({id:7,name:'Real Staff',role:'catalog_manager'}); mock.prepare.mockReturnValue({run:mock.run}); });
describe('Client audit ingestion', () => {
  it('derives actor identity from the session and labels client-supplied events', async () => {
    const res=await POST(new Request('http://localhost/api/admin/audit',{method:'POST',body:JSON.stringify({action:'PRODUCT_UPDATE',actorName:'Forged Actor',role:'super_admin',targetId:'12',details:'Observed update'})}));
    expect(res.status).toBe(200);
    expect(mock.run).toHaveBeenCalledWith(7,'Real Staff','catalog_manager','CLIENT_PRODUCT_UPDATE','Admin','12','Observed update',null);
  });
  it('rejects anonymous events',async () => {
    mock.user.mockReturnValue(null);
    expect((await POST(new Request('http://localhost/api/admin/audit',{method:'POST'}))).status).toBe(403);
    expect(mock.run).not.toHaveBeenCalled();
  });
});
