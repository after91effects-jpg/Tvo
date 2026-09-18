import { ok, err, db, getCurrentUser, isAdminRole } from '../../../lib/server/api';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = getCurrentUser(req);
  const scope = url.searchParams.get('scope') || 'dashboard';
  if (!user || !isAdminRole(user.role)) return err('Admin access required', 403);

  try {
    if (scope === 'products') {
      return ok({
        total: (db.prepare('SELECT COUNT(*) c FROM products WHERE deleted_at IS NULL').get() as any).c,
        published: (db.prepare('SELECT COUNT(*) c FROM products WHERE published=1 AND deleted_at IS NULL').get() as any).c,
        outOfStock: (db.prepare("SELECT COUNT(*) c FROM products WHERE stock_status='out_of_stock' AND deleted_at IS NULL").get() as any).c,
        lowStock: (db.prepare("SELECT COUNT(*) c FROM products WHERE stock_status='low_stock' AND deleted_at IS NULL").get() as any).c,
        totalValue: (db.prepare('SELECT COALESCE(SUM(sale_price*stock),0) v FROM products WHERE deleted_at IS NULL').get() as any).v,
      });
    }
    if (scope === 'orders') {
      const totalOrders = (db.prepare('SELECT COUNT(*) c FROM orders').get() as any).c;
      const revenue = (db.prepare("SELECT COALESCE(SUM(total),0) v FROM orders WHERE payment_status IN ('Paid','Pending')").get() as any).v;
      const pending = (db.prepare("SELECT COUNT(*) c FROM orders WHERE status IN ('Order Placed','Payment Confirmed')").get() as any).c;
      const inProduction = (db.prepare("SELECT COUNT(*) c FROM orders WHERE status IN ('Accepted','In Preparation','Baking','Decorating','Quality Check')").get() as any).c;
      const ready = (db.prepare("SELECT COUNT(*) c FROM orders WHERE status IN ('Packed','Ready for Dispatch')").get() as any).c;
      const delivered = (db.prepare("SELECT COUNT(*) c FROM orders WHERE status='Delivered'").get() as any).c;
      const todaySales = (db.prepare("SELECT COALESCE(SUM(total),0) v FROM orders WHERE date(created_at)=date('now')").get() as any).v;
      const todayOrders = (db.prepare("SELECT COUNT(*) c FROM orders WHERE date(created_at)=date('now')").get() as any).c;
      const todayDeliveries = (db.prepare("SELECT COUNT(*) c FROM orders WHERE delivery_date=date('now')").get() as any).c;
      const avgOrder = totalOrders ? Math.round(revenue / totalOrders) : 0;
      return ok({ totalOrders, revenue, pending, inProduction, ready, delivered, todaySales, todayOrders, todayDeliveries, avgOrder });
    }
    if (scope === 'customers') {
      return ok({
        total: (db.prepare('SELECT COUNT(*) c FROM customers').get() as any).c,
        newToday: (db.prepare("SELECT COUNT(*) c FROM customers WHERE date(created_at)=date('now')").get() as any).c,
        totalSpend: (db.prepare('SELECT COALESCE(SUM(total_spend),0) v FROM customers').get() as any).v,
      });
    }
    if (scope === 'custom_orders') {
      return ok({
        total: (db.prepare('SELECT COUNT(*) c FROM custom_requests').get() as any).c,
        pending: (db.prepare("SELECT COUNT(*) c FROM custom_requests WHERE status='Pending Approval'").get() as any).c,
      });
    }
    if (scope === 'inventory_alerts') {
      return ok({
        lowStock: (db.prepare("SELECT COUNT(*) c FROM products WHERE stock_status='low_stock'").get() as any).c,
        outOfStock: (db.prepare("SELECT COUNT(*) c FROM products WHERE stock_status='out_of_stock'").get() as any).c,
        lowStockProducts: db.prepare("SELECT id, name, stock FROM products WHERE stock_status='low_stock' ORDER BY stock LIMIT 20").all(),
        outOfStockProducts: db.prepare("SELECT id, name, stock FROM products WHERE stock_status='out_of_stock' LIMIT 20").all(),
      });
    }
    if (scope === 'reports') {
      const startDate = url.searchParams.get('startDate') || '';
      const endDate = url.searchParams.get('endDate') || '';
      
      let whereClause = "WHERE 1=1";
      const params: any[] = [];
      if (startDate) {
        whereClause += " AND date(created_at) >= date(?)";
        params.push(startDate);
      }
      if (endDate) {
        whereClause += " AND date(created_at) <= date(?)";
        params.push(endDate);
      }

      // Summary totals
      const summary = db.prepare(`
        SELECT 
          COUNT(*) as totalOrders,
          COALESCE(SUM(total), 0) as grossRevenue,
          COALESCE(SUM(discount), 0) as totalDiscounts,
          COALESCE(SUM(delivery_fee), 0) as totalDeliveryFees
        FROM orders ${whereClause} AND status != 'Cancelled'
      `).get(...params) as any;

      const netRevenue = (summary?.grossRevenue || 0);
      const avgOrderValue = summary?.totalOrders ? Math.round(netRevenue / summary.totalOrders) : 0;

      // Sales daily timeline
      const dailySales = db.prepare(`
        SELECT 
          date(created_at) as date,
          COUNT(*) as ordersCount,
          COALESCE(SUM(total), 0) as revenue,
          COALESCE(SUM(discount), 0) as discounts,
          COALESCE(SUM(total), 0) as netRevenue
        FROM orders ${whereClause} AND status != 'Cancelled'
        GROUP BY date(created_at)
        ORDER BY date ASC
        LIMIT 90
      `).all(...params);

      // Order status distribution
      const statusDistribution = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM orders ${whereClause}
        GROUP BY status
      `).all(...params);

      // Payment method distribution
      const paymentMethods = db.prepare(`
        SELECT payment_method as method, COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
        FROM orders ${whereClause} AND payment_method IS NOT NULL AND payment_method != ''
        GROUP BY payment_method
      `).all(...params);

      // Top products
      const topProducts = db.prepare(`
        SELECT p.id, p.name, p.category_id, COALESCE(c.name, 'Specialty') as category, COUNT(o.id) as orderCount, COALESCE(SUM(o.total), 0) as revenue
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN orders o ON o.status != 'Cancelled' ${startDate ? "AND date(o.created_at) >= date(?)" : ""} ${endDate ? "AND date(o.created_at) <= date(?)" : ""}
        WHERE p.deleted_at IS NULL
        GROUP BY p.id, p.name, p.category_id, c.name
        ORDER BY orderCount DESC, revenue DESC
        LIMIT 10
      `).all(...(startDate && endDate ? [startDate, endDate] : startDate ? [startDate] : endDate ? [endDate] : []));

      return ok({
        summary: {
          totalOrders: summary?.totalOrders || 0,
          grossRevenue: summary?.grossRevenue || 0,
          totalDiscounts: summary?.totalDiscounts || 0,
          totalDeliveryFees: summary?.totalDeliveryFees || 0,
          netRevenue,
          avgOrderValue,
        },
        dailySales,
        statusDistribution,
        paymentMethods,
        topProducts,
      });
    }
    if (scope === 'dashboard') {
      const orders = db.prepare('SELECT COUNT(*) c, COALESCE(SUM(total),0) v FROM orders').get() as any;
      const todayOrders = (db.prepare("SELECT COUNT(*) c FROM orders WHERE date(created_at)=date('now')").get() as any).c;
      const todaySales = (db.prepare("SELECT COALESCE(SUM(total),0) v FROM orders WHERE date(created_at)=date('now')").get() as any).v;
      const pendingOrders = (db.prepare("SELECT COUNT(*) c FROM orders WHERE status IN ('Order Placed','Payment Confirmed')").get() as any).c;
      const inProduction = (db.prepare("SELECT COUNT(*) c FROM orders WHERE status IN ('Accepted','In Preparation','Baking','Decorating','Quality Check')").get() as any).c;
      const ready = (db.prepare("SELECT COUNT(*) c FROM orders WHERE status IN ('Packed','Ready for Dispatch')").get() as any).c;
      const todayDeliveries = (db.prepare("SELECT COUNT(*) c FROM orders WHERE delivery_date=date('now')").get() as any).c;
      const customPending = (db.prepare("SELECT COUNT(*) c FROM custom_requests WHERE status='Pending Approval'").get() as any).c;
      const lowStock = (db.prepare("SELECT COUNT(*) c FROM products WHERE stock_status='low_stock'").get() as any).c;
      const outOfStock = (db.prepare("SELECT COUNT(*) c FROM products WHERE stock_status='out_of_stock'").get() as any).c;
      const newCustomers = (db.prepare("SELECT COUNT(*) c FROM customers WHERE date(created_at)=date('now')").get() as any).c;
      const pendingPayments = (db.prepare("SELECT COUNT(*) c FROM orders WHERE payment_status='Pending'").get() as any).c;
      const refundRequests = (db.prepare("SELECT COUNT(*) c FROM refunds WHERE status='pending'").get() as any).c;
      const productsTotal = (db.prepare('SELECT COUNT(*) c FROM products WHERE deleted_at IS NULL').get() as any).c;
      // top products
      const topProducts = (db.prepare("SELECT json_group_array(name) n FROM (SELECT name FROM products WHERE deleted_at IS NULL AND published=1 ORDER BY bestseller DESC LIMIT 5)").get() as any).n;
      return ok({
        totalOrders: orders.c, totalRevenue: orders.v, todayOrders, todaySales, pendingOrders, inProduction,
        readyProduct: ready, todayDeliveries, customPending, lowStock, outOfStock, newCustomers, pendingPayments,
        refundRequests, productsTotal,
        topProducts: topProducts ? JSON.parse(topProducts) : [],
      });
    }
    return err('Unknown scope');
  } catch (e: any) {
    return err(e.message, 500);
  }
}