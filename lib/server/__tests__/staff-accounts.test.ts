import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ prepare: vi.fn(), get: vi.fn(), run: vi.fn(), transaction: vi.fn(), auth: vi.fn(), getUser: vi.fn(), createUser: vi.fn(), deleteUser: vi.fn(), createStaff: vi.fn() }));
vi.mock('../db', () => ({ db: { prepare: mock.prepare, transaction: mock.transaction } }));
vi.mock('../firebaseAdmin', () => ({ getFirebaseAdminAuth: mock.auth }));
vi.mock('../admin-ops', () => ({ createAdminUser: mock.createStaff }));
import { createStaffAccount } from '../staff-accounts';
const actor = {id:1,role:'super_admin'};
const input={name:'Test Staff',email:'staff@example.com',password:'test-only-password',role:'catalog_manager'};
beforeEach(() => {
  vi.clearAllMocks(); mock.get.mockReturnValue(undefined); mock.run.mockReturnValue({changes:1});
  mock.prepare.mockReturnValue({get:mock.get,run:mock.run}); mock.transaction.mockImplementation(fn => fn);
  mock.auth.mockReturnValue({getUserByEmail:mock.getUser,createUser:mock.createUser,deleteUser:mock.deleteUser});
  mock.getUser.mockRejectedValue({code:'auth/user-not-found'}); mock.createUser.mockResolvedValue({uid:'new-fixture-uid'});
  mock.deleteUser.mockResolvedValue(undefined); mock.createStaff.mockReturnValue({ok:true,id:10});
});
describe('Firebase-backed staff creation', () => {
  it('creates a sign-in identity and links it to the saved staff row',async () => {
    expect(await createStaffAccount(actor,input)).toMatchObject({ok:true,id:10,existingIdentity:false});
    expect(mock.createUser).toHaveBeenCalledWith({email:input.email,password:input.password,displayName:input.name});
    expect(mock.run).toHaveBeenCalledWith('new-fixture-uid',10);
  });
  it('reuses existing sign-in without resetting its password',async () => {
    mock.getUser.mockResolvedValue({uid:'existing-fixture-uid'});
    expect(await createStaffAccount(actor,input)).toMatchObject({ok:true,existingIdentity:true});
    expect(mock.createUser).not.toHaveBeenCalled();
    expect(mock.run).toHaveBeenCalledWith('existing-fixture-uid',10);
  });
  it('removes only a newly-created identity if database save fails',async () => {
    mock.createStaff.mockReturnValue({ok:false,error:'Database failed'});
    expect(await createStaffAccount(actor,input)).toMatchObject({ok:false});
    expect(mock.deleteUser).toHaveBeenCalledWith('new-fixture-uid');
  });
  it('does not delete an existing identity when database save fails',async () => {
    mock.getUser.mockResolvedValue({uid:'existing-fixture-uid'}); mock.createStaff.mockReturnValue({ok:false});
    expect(await createStaffAccount(actor,input)).toMatchObject({ok:false});
    expect(mock.deleteUser).not.toHaveBeenCalled();
  });
  it('does not create a database-only account when Firebase is unavailable',async () => {
    mock.auth.mockReturnValue(null);
    expect(await createStaffAccount(actor,input)).toMatchObject({ok:false});
    expect(mock.createStaff).not.toHaveBeenCalled();
  });
});
