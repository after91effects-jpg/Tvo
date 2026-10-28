import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../db', async () => {
  const Database = (await import('better-sqlite3')).default;
  return { db: new Database(':memory:') };
});
vi.mock('../api', () => ({ logAudit: vi.fn(), slugify: (s:string) => s.toLowerCase().trim().replace(/\s+/g,'-') }));
import { db } from '../db';
import { saveCategory, deleteCategory } from '../admin-taxonomy';
const user={id:1,role:'super_admin'};
beforeEach(() => {
  db.exec('DROP TABLE IF EXISTS products; DROP TABLE IF EXISTS categories; CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT, slug TEXT UNIQUE, parent_id INTEGER, description TEXT, image TEXT, featured INTEGER, sort_order INTEGER, seo_title TEXT, seo_description TEXT); CREATE TABLE products (id INTEGER PRIMARY KEY, category_id INTEGER, deleted_at TEXT);');
  db.prepare('INSERT INTO categories(id,name,slug,parent_id) VALUES (?,?,?,?)').run(1,'Cakes','cakes',null);
  db.prepare('INSERT INTO categories(id,name,slug,parent_id) VALUES (?,?,?,?)').run(2,'Birthday','birthday',1);
});
describe('Live category writes', () => {
  it('saves editable SEO fields with a normalized slug and parent', () => {
    saveCategory({name:'Chocolate Gifts',parent_id:1,seo_title:'Chocolate cakes',seo_description:'Handcrafted gifts'},user);
    expect(db.prepare('SELECT * FROM categories WHERE slug=?').get('chocolate-gifts')).toMatchObject({name:'Chocolate Gifts',parent_id:1,seo_title:'Chocolate cakes',seo_description:'Handcrafted gifts'});
  });
  it('rejects a cycle through a descendant without modifying the original tree', () => {
    expect(() => saveCategory({id:1,name:'Cakes',parent_id:2},user)).toThrow('circular');
    expect(db.prepare('SELECT parent_id FROM categories WHERE id=1').get()).toEqual({parent_id:null});
  });
  it('rejects a missing parent', () => { expect(() => saveCategory({name:'Bad',parent_id:999},user)).toThrow('Parent category not found'); });
  it('protects categories that still have children or products', () => {
    expect(() => deleteCategory(1,user)).toThrow('subcategories');
    db.prepare('INSERT INTO products(id,category_id) VALUES(1,2)').run();
    expect(() => deleteCategory(2,user)).toThrow('products');
  });
});
