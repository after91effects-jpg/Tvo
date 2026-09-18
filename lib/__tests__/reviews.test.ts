import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { db } from '../server/db';
import { signToken } from '../server/auth';
import { GET as getReviews, POST as postReviews } from '../../app/api/reviews/route';
import { GET as getAdmin, POST as postAdmin } from '../../app/api/admin/route';

describe('Step 10: Reviews, Ratings & Customer Feedback System', () => {
  const TEST_EMAIL = 'step10_reviewer@example.com';
  const TEST_NAME = 'Step10 Reviewer';
  let testCustomerId: number;
  let testCustomerCookie: string;
  let adminCookie: string;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-vitest-32-chars-min';

    // Get existing admin user (id: 1)
    const adminUser = db.prepare('SELECT id, email, role FROM users LIMIT 1').get() as any;
    if (adminUser) {
      const adminToken = signToken({ sub: adminUser.id, role: adminUser.role, email: adminUser.email });
      adminCookie = `tvo_auth=${adminToken}`;
    }
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
    // Clean up test reviews and test customer to keep database baseline pristine
    if (testCustomerId) {
      db.prepare('DELETE FROM product_reviews WHERE customer_id=?').run(testCustomerId);
      db.prepare('DELETE FROM orders WHERE customer_id=? OR customer_email=?').run(testCustomerId, TEST_EMAIL);
      db.prepare('DELETE FROM customers WHERE id=?').run(testCustomerId);
    }
    // Clean up any test reviews created without customer_id
    db.prepare("DELETE FROM product_reviews WHERE customer_name LIKE 'Step10%'").run();
  });

  describe('A. Database Schema & Indexing', () => {
    it('has product_reviews table with all required columns', () => {
      const columns = db.prepare('PRAGMA table_info(product_reviews)').all() as any[];
      const colNames = columns.map((c) => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('product_id');
      expect(colNames).toContain('customer_id');
      expect(colNames).toContain('customer_name');
      expect(colNames).toContain('rating');
      expect(colNames).toContain('comment');
      expect(colNames).toContain('photo');
      expect(colNames).toContain('verified');
      expect(colNames).toContain('status');
      expect(colNames).toContain('created_at');
    });

    it('has high-performance composite index on (product_id, status)', () => {
      const indexes = db.prepare('PRAGMA index_list(product_reviews)').all() as any[];
      const idxNames = indexes.map((i) => i.name);
      expect(idxNames).toContain('idx_product_reviews_pid_status');
      expect(idxNames).toContain('idx_product_reviews_cust_id');
    });
  });

  describe('B. Review Submission & Server Validation (POST /api/reviews)', () => {
    it('rejects submission with missing product_id', async () => {
      const req = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, comment: 'Delicious cake!' }),
      });
      const res = await postReviews(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Valid product and rating');
    });

    it('rejects submission for non-existent product', async () => {
      const req = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: 999999, rating: 5, comment: 'Delicious cake!' }),
      });
      const res = await postReviews(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('Product not found');
    });

    it('rejects submission with invalid rating (out of range or non-integer)', async () => {
      const req1 = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: 1, rating: 6, comment: 'Super!' }),
      });
      const res1 = await postReviews(req1);
      expect(res1.status).toBe(400);

      const req2 = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: 1, rating: 0, comment: 'Bad!' }),
      });
      const res2 = await postReviews(req2);
      expect(res2.status).toBe(400);
    });

    it('rejects submission with too short comment', async () => {
      const req = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: 1, rating: 5, comment: 'ok' }),
      });
      const res = await postReviews(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('at least 5 characters');
    });

    it('sanitizes HTML from comments', async () => {
      const req = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: 1,
          customer_name: 'Step10 XSS Test',
          rating: 5,
          comment: '<script>alert("hack")</script>The Belgian chocolate was magnificent and fresh!',
        }),
      });
      const res = await postReviews(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      const saved = db.prepare(
        "SELECT * FROM product_reviews WHERE customer_name='Step10 XSS Test' ORDER BY id DESC LIMIT 1"
      ).get() as any;
      expect(saved).toBeDefined();
      expect(saved.comment).toBe('The Belgian chocolate was magnificent and fresh!');
      expect(saved.status).toBe('pending');
    });

    it('flags verified purchase when customer has a delivered order for this product', async () => {
      // Create a delivered order for this customer with product_id 1
      const orderItems = JSON.stringify([{ productId: 1, quantity: 1, price: 650 }]);
      db.prepare(`
        INSERT INTO orders (order_number, customer_id, customer_name, customer_email, customer_phone, status, total, payment_status, items, created_at, updated_at)
        VALUES ('ORD-TEST-10-VERIFIED', ?, ?, ?, '9876543210', 'Delivered', 650, 'Paid', ?, datetime('now'), datetime('now'))
      `).run(testCustomerId, TEST_NAME, TEST_EMAIL, orderItems);

      const req = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: testCustomerCookie,
        },
        body: JSON.stringify({
          product_id: 1,
          rating: 5,
          comment: 'Ordered for birthday celebration, delivered fresh and on time!',
        }),
      });
      const res = await postReviews(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      const saved = db.prepare(
        'SELECT * FROM product_reviews WHERE customer_id=? ORDER BY id DESC LIMIT 1'
      ).get(testCustomerId) as any;
      expect(saved).toBeDefined();
      expect(saved.verified).toBe(1);
    });

    it('prevents duplicate reviews from the same authenticated customer on the same product', async () => {
      // First review
      const req1 = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: testCustomerCookie },
        body: JSON.stringify({ product_id: 1, rating: 5, comment: 'First celebration review!' }),
      });
      const res1 = await postReviews(req1);
      expect(res1.status).toBe(200);

      // Duplicate attempt
      const req2 = new Request('http://localhost/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: testCustomerCookie },
        body: JSON.stringify({ product_id: 1, rating: 4, comment: 'Second celebration review!' }),
      });
      const res2 = await postReviews(req2);
      expect(res2.status).toBe(400);
      const data2 = await res2.json();
      expect(data2.error).toContain('already submitted a review');
    });
  });

  describe('C. Public vs Customer Reviews Retrieval (GET /api/reviews)', () => {
    it('returns only approved reviews for public storefront, hiding pending reviews', async () => {
      // Insert one approved review and one pending review
      const insApp = db.prepare(`
        INSERT INTO product_reviews (product_id, customer_id, customer_name, rating, comment, verified, status, created_at)
        VALUES (1, ?, 'Step10 Approved Reviewer', 5, 'Amazing taste and texture!', 1, 'approved', datetime('now'))
      `).run(testCustomerId);

      const insPend = db.prepare(`
        INSERT INTO product_reviews (product_id, customer_name, rating, comment, verified, status, created_at)
        VALUES (1, 'Step10 Pending Reviewer', 4, 'Testing pending state visibility.', 0, 'pending', datetime('now'))
      `).run();

      const req = new Request('http://localhost/api/reviews?product_id=1');
      const res = await getReviews(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(Array.isArray(data.reviews)).toBe(true);
      const reviewIds = data.reviews.map((r: any) => r.id);
      expect(reviewIds).toContain(Number(insApp.lastInsertRowid));
      expect(reviewIds).not.toContain(Number(insPend.lastInsertRowid));

      // Check statistics computation
      expect(data.stats).toBeDefined();
      expect(data.stats.total).toBe(1);
      expect(data.stats.average).toBe(5);
      expect(data.stats.distribution[5]).toBe(1);
      expect(data.stats.distribution[4]).toBe(0);

      // Clean up the manual reviews
      db.prepare('DELETE FROM product_reviews WHERE id IN (?, ?)').run(
        insApp.lastInsertRowid,
        insPend.lastInsertRowid
      );
    });

    it('returns customer-specific reviews with moderation statuses when my_reviews=1', async () => {
      // Insert customer pending review
      const ins = db.prepare(`
        INSERT INTO product_reviews (product_id, customer_id, customer_name, rating, comment, verified, status, created_at)
        VALUES (1, ?, ?, 5, 'Testing customer portal retrieval.', 1, 'pending', datetime('now'))
      `).run(testCustomerId, TEST_NAME);

      const req = new Request('http://localhost/api/reviews?my_reviews=1', {
        headers: { cookie: testCustomerCookie },
      });
      const res = await getReviews(req);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(Array.isArray(data.reviews)).toBe(true);
      expect(data.reviews.length).toBe(1);
      expect(data.reviews[0].id).toBe(Number(ins.lastInsertRowid));
      expect(data.reviews[0].status).toBe('pending');
      expect(data.reviews[0].product_name).toBeDefined();
      expect(data.reviews[0].product_slug).toBeDefined();
    });
  });

  describe('D. Admin Review Moderation & Audit Logging', () => {
    it('allows admin to list reviews with status filtering', async () => {
      // Create pending and approved reviews
      const ins1 = db.prepare(`
        INSERT INTO product_reviews (product_id, customer_id, customer_name, rating, comment, status, created_at)
        VALUES (1, ?, 'Step10 Mod Test', 5, 'Admin moderation test comment.', 'pending', datetime('now'))
      `).run(testCustomerId);

      const req = new Request('http://localhost/api/admin?type=reviews&status=pending', {
        headers: { cookie: adminCookie },
      });
      const res = await getAdmin(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.reviews)).toBe(true);
      const found = data.reviews.find((r: any) => r.id === Number(ins1.lastInsertRowid));
      expect(found).toBeDefined();
      expect(found.product_name).toBeDefined();
      expect(found.status).toBe('pending');
    });

    it('allows admin to approve a pending review and records an audit log', async () => {
      const ins = db.prepare(`
        INSERT INTO product_reviews (product_id, customer_id, customer_name, rating, comment, status, created_at)
        VALUES (1, ?, 'Step10 Approve Test', 5, 'Admin approval test comment.', 'pending', datetime('now'))
      `).run(testCustomerId);
      const revId = Number(ins.lastInsertRowid);

      const req = new Request('http://localhost/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({ type: 'reviews', action: 'moderate', id: revId, status: 'approved' }),
      });
      const res = await postAdmin(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      const updated = db.prepare('SELECT status FROM product_reviews WHERE id=?').get(revId) as any;
      expect(updated.status).toBe('approved');

      // Verify audit log entry was created
      const audit = db.prepare(
        "SELECT * FROM audit_logs WHERE target_id=? AND action LIKE '%REVIEW_APPROVED%' ORDER BY id DESC LIMIT 1"
      ).get(String(revId)) as any;
      expect(audit).toBeDefined();
      expect(audit.action).toBe('REVIEW_APPROVED');
    });

    it('allows admin to reject a review and delete it', async () => {
      const ins = db.prepare(`
        INSERT INTO product_reviews (product_id, customer_id, customer_name, rating, comment, status, created_at)
        VALUES (1, ?, 'Step10 Reject Test', 1, 'Admin reject test comment.', 'pending', datetime('now'))
      `).run(testCustomerId);
      const revId = Number(ins.lastInsertRowid);

      // Reject
      const rejReq = new Request('http://localhost/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({ type: 'reviews', action: 'moderate', id: revId, status: 'rejected' }),
      });
      const rejRes = await postAdmin(rejReq);
      expect(rejRes.status).toBe(200);

      const rejected = db.prepare('SELECT status FROM product_reviews WHERE id=?').get(revId) as any;
      expect(rejected.status).toBe('rejected');

      // Delete
      const delReq = new Request('http://localhost/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({ type: 'reviews', action: 'delete', id: revId }),
      });
      const delRes = await postAdmin(delReq);
      expect(delRes.status).toBe(200);

      const deleted = db.prepare('SELECT id FROM product_reviews WHERE id=?').get(revId);
      expect(deleted).toBeUndefined();
    });
  });

  describe('E. Database Safety Baseline', () => {
    it('maintains strict database baseline with zero unintended mutation', () => {
      const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get() as any;
      const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get() as any;
      const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as any;
      const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get() as any;
      const revCount = db.prepare('SELECT COUNT(*) as c FROM product_reviews').get() as any;

      expect(prodCount.c).toBe(149);
      expect(orderCount.c).toBe(2);
      expect(userCount.c).toBe(1);
      expect(catCount.c).toBe(65);
      expect(revCount.c).toBe(0);
    });
  });
});
