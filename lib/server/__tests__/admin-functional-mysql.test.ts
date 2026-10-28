import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Mutations are permitted only on the private socket-only rehearsal instance.
describe.skipIf(!process.env.MYSQL_TEST_SOCKET)('Admin functional MySQL rehearsal', () => {
  let db: any; let postAdmin: any; let getAdmin: any; let products: any; let catalog: any; let ingredients: any; let recipes: any; let csv: any; let media: any; let reports: any; let exports: any; let signToken: any;
  let cookie: string; let categoryId: number; let productId: number; let ingredientId: number; let orderId: number;
  const prefix = `AUDIT-${Date.now()}`;
  const baseline: Array<{name:string;max:number}> = [];
  const request = (url: string, body?: any, method = 'POST', session = cookie) => new Request(`http://localhost${url}`, { method, headers: { cookie: session, 'Content-Type':'application/json' }, ...(body === undefined ? {} : { body:JSON.stringify(body) }) });
  async function call(handler: any, url: string, body?: any, expected = 200, method = 'POST', session = cookie) {
    const response = await handler(request(url,body,method,session)); const data = await response.json();
    expect(response.status, `${url} ${body?.type || ''}/${body?.action || ''}: ${data.error || ''}`).toBe(expected);
    return data;
  }
  const admin = (body: any, expected = 200) => call(postAdmin,'/api/admin',body,expected);
  beforeAll(async () => {
    if (!process.env.MYSQL_TEST_SOCKET?.startsWith('/private/tmp/tvo-mysql-migration/') || process.env.MYSQL_USER !== 'root') throw new Error('Private test instance required');
    process.env.DATABASE_DRIVER='mysql'; process.env.MYSQL_SOCKET=process.env.MYSQL_TEST_SOCKET;
    process.env.JWT_SECRET='private-admin-functional-test';
    process.env.MEDIA_STORAGE_DIR='/private/tmp/tvo-mysql-migration/admin-media-test';
    ({db}=await import('../db')); ({signToken}=await import('../auth'));
    const identity=db.prepare('SELECT email FROM users WHERE id=1').get();
    cookie=`tvo_auth=${signToken({sub:1,email:identity.email,role:'super_admin'})}`;
    ({POST:postAdmin,GET:getAdmin}=await import('../../../app/api/admin/route'));
    products=await import('../../../app/api/admin/products/route'); catalog=await import('../../../app/api/admin/catalog/route');
    ingredients=await import('../../../app/api/admin/ingredients/route'); recipes=await import('../../../app/api/admin/recipes/route');
    csv=await import('../../../app/api/admin/csv/import/route'); media=await import('../../../app/api/admin/media/route');
    reports=await import('../../../app/api/analytics/route'); exports=await import('../../../app/api/admin/export/route');
    const tables=db.prepare("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()").all();
    for(const {name} of tables) {
      if(db.prepare('SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?').get(name,'id')) baseline.push({name,max:Number(db.prepare(`SELECT COALESCE(MAX(id),0) AS n FROM \`${name}\``).get().n)});
    }
  });
  afterAll(() => {
    try { for(const {name,max} of baseline) db.prepare(`DELETE FROM \`${name}\` WHERE id>?`).run(max); }
    finally { db?.close(); delete process.env.DATABASE_DRIVER; delete process.env.MEDIA_STORAGE_DIR; }
  });
  it('creates and edits categories and rejects circular parent relationships', async () => {
    await call(catalog.POST,'/api/admin/catalog',{type:'categories',name:prefix,slug:prefix.toLowerCase()});
    categoryId=db.prepare('SELECT id FROM categories WHERE name=?').get(prefix).id;
    await call(catalog.POST,'/api/admin/catalog',{type:'categories',id:categoryId,name:prefix,parent_id:categoryId},400);
    await call(catalog.POST,'/api/admin/catalog',{type:'categories',id:categoryId,name:prefix,description:'updated'});
    expect(db.prepare('SELECT description FROM categories WHERE id=?').get(categoryId).description).toBe('updated');
  });
  it('creates products and preserves media, stock and publication on partial updates', async () => {
    const result=await call(products.POST,'/api/admin/products',{action:'create',sku:prefix,name:prefix,regular_price:500,sale_price:400,stock:7,published:1,category_id:categoryId,images_json:[{url:'/uploads/audit-original.webp'}]});
    productId=result.id; expect(productId).toBeGreaterThan(0);
    await call(products.POST,'/api/admin/products',{action:'update',id:productId,description:'changed'});
    const product=db.prepare('SELECT stock,published,status,images_json FROM products WHERE id=?').get(productId);
    expect(product.stock).toBe(7); expect(product.published).toBe(1); expect(product.status).toBe('publish'); expect(product.images_json).toContain('audit-original.webp');
    await call(catalog.POST,'/api/admin/catalog',{type:'categories',action:'delete',id:categoryId},400);
    await call(products.POST,'/api/admin/products',{action:'update',id:productId,stock:-2},400);
  });
  it('executes quick edit, inventory adjustment, duplicate, trash and restore', async () => {
    await call(products.POST,'/api/admin/products',{action:'quick_edit',id:productId,name:prefix+' edit',regular_price:550});
    await call(products.POST,'/api/admin/products',{action:'adjust_stock',productId,delta:3,reason:'private test'});
    expect(db.prepare('SELECT stock FROM products WHERE id=?').get(productId).stock).toBe(10);
    const duplicate=await call(products.POST,'/api/admin/products',{action:'duplicate',id:productId}); expect(duplicate.id).toBeGreaterThan(productId);
    await call(products.POST,'/api/admin/products',{action:'status',id:duplicate.id,status:'trash'});
    await call(products.POST,'/api/admin/products',{action:'status',id:duplicate.id,status:'draft'});
  });
  it('imports CSV prices, categories and row media and detects duplicates beyond the first page', async () => {
    const row={SKU:prefix+'CSV',Name:prefix+' CSV','Regular price':'600','Sale price':'450',Categories:prefix,Images:'/uploads/row-one.webp',Stock:'3',Published:'0'};
    const summary=await call(csv.POST,'/api/admin/csv/import',{rows:[row],duplicateStrategy:'skip'}); expect(summary.created).toBe(1);
    const saved=db.prepare('SELECT * FROM products WHERE sku=?').get(prefix+'CSV');
    expect(saved.regular_price).toBe(600); expect(saved.sale_price).toBe(450); expect(saved.category_id).toBe(categoryId); expect(saved.images_json).toContain('row-one.webp'); expect(saved.published).toBe(0);
    const partial=await call(csv.POST,'/api/admin/csv/import',{rows:[{SKU:row.SKU,Name:row.Name}],duplicateStrategy:'update'});expect(partial.updated).toBe(1);
    const preserved=db.prepare('SELECT regular_price,sale_price,stock,published,images_json FROM products WHERE id=?').get(saved.id);
    expect(preserved).toMatchObject({regular_price:600,sale_price:450,stock:3,published:0});expect(preserved.images_json).toContain('row-one.webp');
    const old=db.prepare('SELECT sku,name FROM products WHERE sku IS NOT NULL ORDER BY id LIMIT 1 OFFSET 25').get();
    const skipped=await call(csv.POST,'/api/admin/csv/import',{rows:[{SKU:old.sku,Name:old.name}],duplicateStrategy:'skip'});expect(skipped.skipped).toBe(1);
    const copied=await call(csv.POST,'/api/admin/csv/import',{rows:[row],duplicateStrategy:'create_new'});expect(copied.created, JSON.stringify(copied.errors)).toBe(1);
  });
  it('rejects invalid coupon values and duplicate codes without reporting success', async () => {
    await admin({type:'coupons',action:'save_full',code:prefix,discount_type:'percent',discount_value:150,active:1},400);
    const valid=await admin({type:'coupons',action:'save_full',code:prefix,discount_type:'flat',discount_value:50,active:1}); expect(valid.ok).toBe(true);
    await admin({type:'coupons',action:'save_full',code:prefix,discount_type:'flat',discount_value:50,active:1},400);
    await admin({type:'coupons',action:'delete',id:valid.id});
  });
  it('saves CRM notes and segmentation using the actual UI payload', async () => {
    const customer=await admin({type:'customers',action:'create',name:prefix,email:prefix+'@example.test'});
    await admin({type:'customers',action:'update',id:customer.id,fields:{notes:'allergy note',group_name:'VIP'}});
    expect(db.prepare('SELECT notes,group_name FROM customers WHERE id=?').get(customer.id)).toEqual({notes:'allergy note',group_name:'VIP'});
  });
  it('saves ingredient stock and recipes atomically and rejects destructive invalid lines', async () => {
    const ingredient=await call(ingredients.POST,'/api/admin/ingredients',{name:prefix,stock:10,unit:'kg',cost_per_unit:100}); ingredientId=ingredient.id;
    await call(ingredients.POST,'/api/admin/ingredients',{action:'adjust_stock',id:ingredientId,delta:2});
    expect(db.prepare('SELECT stock FROM ingredients WHERE id=?').get(ingredientId).stock).toBe(12);
    await call(recipes.POST,'/api/admin/recipes',{productId,items:[{ingredient_id:ingredientId,quantity:250,unit:'g'}],updateCostPrice:true});
    expect(db.prepare('SELECT cost_price FROM products WHERE id=?').get(productId).cost_price).toBe(25);
    await call(recipes.POST,'/api/admin/recipes',{productId,items:[{ingredient_id:ingredientId,quantity:-1,unit:'g'}]},400);
    await call(recipes.POST,'/api/admin/recipes',{productId},400);
    expect(db.prepare('SELECT COUNT(*) AS n FROM recipes WHERE product_id=?').get(productId).n).toBe(1);
    await call(ingredients.POST,'/api/admin/ingredients',{name:prefix,stock:'bad'},400);
  });
  it('saves delivery zones, slots, drivers and capacity overrides', async () => {
    await admin({type:'delivery_zones',action:'save',name:prefix,city:'Test city',fee:40,active:1});
    await admin({type:'delivery_slots',action:'save',name:prefix,start_time:'10:00',end_time:'12:00',capacity:20,active:1});
    const slot=db.prepare('SELECT id FROM delivery_slots WHERE name=?').get(prefix);
    await admin({type:'slot_capacity',action:'save',slot_id:slot.id,date:'2099-01-01',capacity:15,closed:0});
    await admin({type:'slot_capacity',action:'save',slot_id:slot.id,date:'2099-01-01',capacity:12,closed:0});
    expect(db.prepare('SELECT capacity FROM slot_capacity WHERE slot_id=? AND date=?').get(slot.id,'2099-01-01').capacity).toBe(12);
    await admin({type:'drivers',action:'save',name:prefix,phone:'9999999999',active:1,status:'available'});
  });
  it('updates order and delivery status only on a test order', async () => {
    const r=db.prepare('INSERT INTO orders (order_number,customer_name,status,payment_status,total,items) VALUES (?,?,?,?,?,?)').run(prefix,prefix,'Order Placed','Pending',400,'[]');orderId=Number(r.lastInsertRowid);
    await admin({type:'orders',action:'status',id:orderId,status:'Accepted'});
    expect(db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status).toBe('Accepted');
    const driver=db.prepare('SELECT id FROM drivers WHERE name=?').get(prefix);
    await admin({type:'orders',action:'assign_driver',id:orderId,driver_id:driver.id});
    await admin({type:'orders',action:'delivery_status',id:orderId,delivery_status:'out_for_delivery'});
    await admin({type:'orders',action:'delivery_status',id:orderId,delivery_status:'delivered'});
    expect(db.prepare('SELECT status FROM orders WHERE id=?').get(orderId).status).toBe('Delivered');
  });
  it('cancels once across both APIs without inventing a refund or double-restocking', async () => {
    db.prepare('UPDATE products SET stock=8 WHERE id=?').run(productId);
    const slot=db.prepare('SELECT id FROM delivery_slots WHERE name=?').get(prefix);
    db.prepare('UPDATE slot_capacity SET books=2 WHERE slot_id=? AND date=?').run(slot.id,'2099-01-01');
    const number=prefix+'-CANCEL';
    const row=db.prepare('INSERT INTO orders (order_number,customer_name,status,payment_status,total,items,delivery_slot_id,delivery_date) VALUES (?,?,?,?,?,?,?,?)').run(number,prefix,'Order Placed','Paid',400,JSON.stringify([{productId:String(productId),qty:2}]),slot.id,'2099-01-01');
    const id=Number(row.lastInsertRowid);
    const api=await import('../../../app/api/orders/route');
    await call(api.PUT,'/api/orders',{action:'status',orderNumber:number,status:'Cancelled'},200,'PUT');
    await admin({type:'orders',action:'cancel',id});
    await admin({type:'orders',action:'status',id,status:'Cancelled'});
    expect(db.prepare('SELECT stock FROM products WHERE id=?').get(productId).stock).toBe(10);
    expect(db.prepare('SELECT payment_status FROM orders WHERE id=?').get(id).payment_status).toBe('Paid');
    expect(db.prepare('SELECT books FROM slot_capacity WHERE slot_id=? AND date=?').get(slot.id,'2099-01-01').books).toBe(1);
    expect(db.prepare("SELECT COUNT(*) AS n FROM order_status_history WHERE order_id=? AND status='Cancelled'").get(id).n).toBe(1);
  });
  it('saves banners, festival years and product mappings', async () => {
    await admin({type:'banners',action:'save',title:prefix,active:1});
    const occasion=await admin({type:'occasions',action:'save',name:prefix,slug:prefix.toLowerCase(),status:'draft',occasion_type:'festival',recurrence_type:'fixed',start_date:'2099-01-01'});
    const occasionId=occasion.id || db.prepare('SELECT id FROM occasions WHERE slug=?').get(prefix.toLowerCase()).id;
    await admin({type:'occasion_years',action:'save',occasion_id:occasionId,year:2099,start_date:'2099-01-01'});
    await admin({type:'product_occasions',action:'map',product_id:productId,occasion_id:occasionId,priority:2});
    await admin({type:'product_occasions',action:'priority',product_id:productId,occasion_id:occasionId,priority:3});
    
    await admin({type:'occasions',action:'archive',id:occasionId});
    await admin({type:'occasions',action:'restore',id:occasionId});
    expect(db.prepare('SELECT COUNT(*) AS n FROM product_occasions WHERE occasion_id=? AND product_id=?').get(occasionId,productId).n).toBe(1);
    await admin({type:'product_occasions',action:'unmap',product_id:productId,occasion_id:occasionId});
  });
  it('stores uploads outside the deployment, streams byte ranges and protects attached media', async () => {
    const buffer=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
    const upload=await call(media.POST,'/api/admin/media',{fileName:'test.png',dataUrl:'data:image/png;base64,'+buffer.toString('base64')});
    const file=path.basename(upload.url);expect(fs.existsSync(path.join(process.env.MEDIA_STORAGE_DIR!,'product-images',file))).toBe(true);
    const {serveProductMedia}=await import('../product-media-storage');
    const response=serveProductMedia(new Request('http://localhost'+upload.url,{headers:{range:'bytes=0-7'}}),file,'image');
    expect(response.status).toBe(206);expect(Buffer.from(await response.arrayBuffer())).toEqual(buffer.subarray(0,8));
    await call(products.POST,'/api/admin/products',{action:'update',id:productId,images_json:[{url:upload.url}]});
    await call(media.DELETE,'/api/admin/media',{url:upload.url,kind:'image'},409,'DELETE');
    await call(products.POST,'/api/admin/products',{action:'update',id:productId,images_json:[]});
    await call(media.DELETE,'/api/admin/media',{url:upload.url,kind:'image'},200,'DELETE');
    expect(fs.existsSync(path.join(process.env.MEDIA_STORAGE_DIR!,'product-images',file))).toBe(false);
  });
  it('groups UTC evening orders into the following India business date', async () => {
    const number=prefix+'-IST';
    db.prepare('INSERT INTO orders (order_number,customer_name,status,payment_status,total,items,created_at) VALUES (?,?,?,?,?,?,?)').run(number,prefix,'Order Placed','Paid',321,JSON.stringify([{productId:String(productId),qty:1,totalPrice:321}]),'2099-01-01 20:00:00');
    const result=await call(reports.GET,'/api/analytics?scope=reports&startDate=2099-01-02&endDate=2099-01-02',undefined,200,'GET');
    expect(JSON.stringify(result)).toContain('321');
    const exported=await call(exports.GET,'/api/admin/export?type=orders&startDate=2099-01-02&endDate=2099-01-02',undefined,200,'GET');
    expect(exported.orders.some((o:any)=>o.order_number===number)).toBe(true);
    const previous=await call(exports.GET,'/api/admin/export?type=orders&startDate=2099-01-01&endDate=2099-01-01',undefined,200,'GET');
    expect(previous.orders.some((o:any)=>o.order_number===number)).toBe(false);
  });
  it('checks reports, full exports and staff permissions', async () => {
    const all=await call(exports.GET,'/api/admin/export?type=products',undefined,200,'GET');expect(all.products.length).toBeGreaterThan(20);
    await call(exports.GET,'/api/admin/export?type=orders&startDate=2099-02-31',undefined,400,'GET');
    await call(reports.GET,'/api/analytics?scope=reports&startDate=2099-02-31',undefined,400,'GET');
    await call(reports.GET,'/api/analytics?scope=reports',undefined,200,'GET');
    const dashboard=await call(reports.GET,'/api/analytics?scope=dashboard',undefined,200,'GET');
    expect(Array.isArray(dashboard.topProducts)).toBe(true);
    const identity=prefix+'@media.test';const r=db.prepare('INSERT INTO users (name,email,password_hash,role,status) VALUES (?,?,?,?,?)').run(prefix,identity,'unused','festival_manager','active');
    const session=`tvo_auth=${signToken({sub:Number(r.lastInsertRowid),email:identity,role:'festival_manager'})}`;
    await call(reports.GET,'/api/analytics?scope=reports',undefined,403,'GET',session);
    await call(exports.GET,'/api/admin/export?type=products',undefined,403,'GET',session);
    await call(postAdmin,'/api/admin',{type:'orders',action:'status',id:orderId,status:'Delivered'},403,'POST',session);
    await admin({type:'tickets',action:'save_broadcast'},409);
  });
});
