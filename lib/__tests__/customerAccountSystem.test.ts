import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { db } from '../server/db';
import { signToken, verifyToken, getCurrentUser } from '../server/auth';
import { GET as getWishlist, POST as postWishlist } from '../../app/api/wishlist/route';
import { GET as getOrders, POST as postOrders } from '../../app/api/orders/route';
import { GET as getAddresses, POST as postAddresses, PUT as putAddresses, DELETE as deleteAddresses } from '../../app/api/customer/addresses/route';

describe('STEP 8: Customer Account, Wishlist & Order Tracking System', () => {
  const TEST_EMAIL = 'step8_customer_test@example.com';
  const TEST_NAME = 'Step8 Customer';
  let testCustomerId: number;
  let testCustomerCookie: string;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-12345678901234567890';
  });

  beforeEach(() => {
    // Insert a test customer
    const info = db.prepare(
      "INSERT INTO customers (name, email, phone, group_name, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
    ).run(TEST_NAME, TEST_EMAIL, '9876543210', 'Test');
    testCustomerId = Number(info.lastInsertRowid);

    // Generate authenticated JWT token for this customer
    const token = signToken({ sub: testCustomerId, role: 'customer', email: TEST_EMAIL, name: TEST_NAME });
    testCustomerCookie = `tvo_auth=${token}`;
  });

  afterEach(() => {
    // Clean up test data to keep database baseline pristine
    if (testCustomerId) {
      db.prepare('DELETE FROM wishlists WHERE customer_id=?').run(testCustomerId);
      db.prepare('DELETE FROM addresses WHERE customer_id=?').run(testCustomerId);
      db.prepare('DELETE FROM orders WHERE customer_id=? OR customer_email=?').run(testCustomerId, TEST_EMAIL);
      db.prepare('DELETE FROM customers WHERE id=?').run(testCustomerId);
    }
  });

  describe('A. Customer Session Resolution & Token Signing', () => {
    it('signs and verifies customer JWT session tokens correctly', () => {
      const token = signToken({ sub: testCustomerId, role: 'customer', email: TEST_EMAIL, name: TEST_NAME });
      const payload = verifyToken(token);
      expect(payload).toBeDefined();
      expect(payload?.sub).toBe(testCustomerId);
      expect(payload?.role).toBe('customer');
      expect(payload?.email).toBe(TEST_EMAIL);
    });

    it('resolves customer profile via getCurrentUser without querying users table', () => {
      const req = new Request('http://localhost/api/test', {
        headers: { cookie: testCustomerCookie },
      });
      const resolved = getCurrentUser(req);
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe(testCustomerId);
      expect(resolved?.role).toBe('customer');
      expect(resolved?.email).toBe(TEST_EMAIL);
    });
  });

  describe('B. Wishlist API & Server Synchronization', () => {
    it('returns empty wishlist for newly created customer', async () => {
      const req = new Request('http://localhost/api/wishlist', {
        headers: { cookie: testCustomerCookie },
      });
      const res = await getWishlist(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.wishlist)).toBe(true);
      expect(data.wishlist.length).toBe(0);
    });

    it('adds and removes a product from customer wishlist in SQLite', async () => {
      // Find a valid product ID
      const prod = db.prepare('SELECT id FROM products LIMIT 1').get() as any;
      expect(prod).toBeDefined();

      // 1. Add
      const addReq = new Request('http://localhost/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: testCustomerCookie },
        body: JSON.stringify({ action: 'add', product_id: String(prod.id) }),
      });
      const addRes = await postWishlist(addReq);
      expect(addRes.status).toBe(200);
      const addData = await addRes.json();
      expect(addData.wishlisted).toBe(true);

      // Verify DB row
      const inDb = db.prepare('SELECT * FROM wishlists WHERE customer_id=? AND product_id=?').get(testCustomerId, String(prod.id));
      expect(inDb).toBeDefined();

      // 2. Remove
      const remReq = new Request('http://localhost/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: testCustomerCookie },
        body: JSON.stringify({ action: 'remove', product_id: String(prod.id) }),
      });
      const remRes = await postWishlist(remReq);
      expect(remRes.status).toBe(200);
      const remData = await remRes.json();
      expect(remData.wishlisted).toBe(false);

      const afterRem = db.prepare('SELECT * FROM wishlists WHERE customer_id=? AND product_id=?').get(testCustomerId, String(prod.id));
      expect(afterRem).toBeUndefined();
    });

    it('syncs multiple local product IDs in bulk', async () => {
      const prods = db.prepare('SELECT id FROM products LIMIT 3').all() as any[];
      const pids = prods.map((p) => String(p.id));

      const syncReq = new Request('http://localhost/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: testCustomerCookie },
        body: JSON.stringify({ action: 'sync', product_ids: pids }),
      });
      const syncRes = await postWishlist(syncReq);
      expect(syncRes.status).toBe(200);
      const syncData = await syncRes.json();
      expect(syncData.ok).toBe(true);
      expect(syncData.wishlist.length).toBeGreaterThanOrEqual(pids.length);
    });
  });

  describe('C. Customer Address Book API', () => {
    it('creates, reads, updates, and deletes saved delivery addresses', async () => {
      // 1. Create Address
      const postReq = new Request('http://localhost/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: testCustomerCookie },
        body: JSON.stringify({
          label: 'home',
          fullName: 'Amit Kumar',
          phone: '9876543210',
          line1: 'Flat 402, Signature Tower',
          line2: 'Sector 54, Golf Course Road',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122002',
          isDefault: true,
        }),
      });
      const postRes = await postAddresses(postReq);
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.ok).toBe(true);
      const createdId = postData.id;

      // 2. Fetch Addresses
      const getReq = new Request('http://localhost/api/customer/addresses', {
        headers: { cookie: testCustomerCookie },
      });
      const getRes = await getAddresses(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(Array.isArray(getData.addresses)).toBe(true);
      expect(getData.addresses.length).toBe(1);
      expect(getData.addresses[0].pincode).toBe('122002');
      expect(getData.addresses[0].isDefault).toBe(true);

      // 3. Update Address
      const putReq = new Request('http://localhost/api/customer/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', cookie: testCustomerCookie },
        body: JSON.stringify({
          id: createdId,
          label: 'work',
          line1: 'Cyber City, Building 10',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122002',
          isDefault: false,
        }),
      });
      const putRes = await putAddresses(putReq);
      expect(putRes.status).toBe(200);

      // 4. Delete Address
      const delReq = new Request(`http://localhost/api/customer/addresses?id=${createdId}`, {
        method: 'DELETE',
        headers: { cookie: testCustomerCookie },
      });
      const delRes = await deleteAddresses(delReq);
      expect(delRes.status).toBe(200);

      // Verify deletion
      const afterDel = await getAddresses(new Request('http://localhost/api/customer/addresses', { headers: { cookie: testCustomerCookie } }));
      const afterDelData = await afterDel.json();
      expect(afterDelData.addresses.length).toBe(0);
    });

    it('enforces customer address isolation across different customers', async () => {
      // Create address for customer 1
      db.prepare('INSERT INTO addresses (customer_id, label, line1, city, state, pincode) VALUES (?,?,?,?,?,?)')
        .run(testCustomerId, 'home', '123 Private Road', 'Gurugram', 'Haryana', '122001');

      // Create separate customer 2
      const otherInfo = db.prepare('INSERT INTO customers (name, email) VALUES (?,?)').run('Other', 'other_test@example.com');
      const otherCustId = Number(otherInfo.lastInsertRowid);
      const otherToken = signToken({ sub: otherCustId, role: 'customer', email: 'other_test@example.com', name: 'Other' });

      try {
        const req = new Request('http://localhost/api/customer/addresses', {
          headers: { cookie: `tvo_auth=${otherToken}` },
        });
        const res = await getAddresses(req);
        const data = await res.json();
        // Customer 2 must not see Customer 1's addresses
        expect(data.addresses.length).toBe(0);
      } finally {
        db.prepare('DELETE FROM customers WHERE id=?').run(otherCustId);
      }
    });
  });

  describe('D. Order History & Tracking Integration', () => {
    it('retrieves order history for authenticated customer', async () => {
      // Insert mock order belonging to test customer
      db.prepare(`
        INSERT INTO orders (order_number, customer_id, customer_email, customer_name, customer_phone, subtotal, total, status, items, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run('TVO-TEST-000099', testCustomerId, TEST_EMAIL, TEST_NAME, '9876543210', 999, 999, 'Order Placed', '[]');

      const req = new Request('http://localhost/api/orders', {
        headers: { cookie: testCustomerCookie },
      });
      const res = await getOrders(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.orders)).toBe(true);
      expect(data.orders.some((o: any) => o.order_number === 'TVO-TEST-000099')).toBe(true);
    });

    it('masks PII when an unauthenticated guest tracks an order', async () => {
      const trackReq = new Request('http://localhost/api/orders?order=TVO-2026-000001');
      const trackRes = await getOrders(trackReq);
      expect(trackRes.status).toBe(200);
      const data = await trackRes.json();
      expect(data.customer_phone).toContain('******');
      expect(data.customer_email).toContain('***@');
    });
  });
});
