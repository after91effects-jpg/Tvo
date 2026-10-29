import { describe, expect, it } from 'vitest';
import { validateProductOptions, validateProductPrices } from '../adminProductForm';
import { getProductPurchaseProfile } from '../productPurchase';
import { categoryDescendants, categoryPath, categoryAncestorSlugs } from '../categoryTree';
import { db } from '../server/db';
import { upsertProduct } from '../server/admin-catalog';

const tree=[{id:1,name:'Cakes',slug:'cakes',parent_id:null},{id:2,name:'Flavour',slug:'flavour',parent_id:1},{id:3,name:'Chocolate',slug:'chocolate',parent_id:2}];
describe('Final product editor validation',()=>{
  it.each([['',100],[Infinity,100],[150,100],[-1,100]])('rejects invalid price %s', (price,mrp)=>expect(()=>validateProductPrices(price,mrp)).toThrow());
  it('preserves exact manual tiers without generating sizes or prices',()=>{
    const rows=[{label:'0.5 kg',weightKg:0.5,price:529,mrp:599},{label:'1 kg',weightKg:1,price:949,mrp:1099}];
    expect(validateProductOptions({options:rows}).map(r=>[r.label,r.price])).toEqual([['0.5 kg',529],['1 kg',949]]);
    expect(()=>validateProductOptions([{...rows[0]},{...rows[0]}])).toThrow('unique');
    expect(()=>validateProductOptions([{label:'Pack',price:Infinity,mrp:999}])).toThrow();
  });
  it('honors an explicit purchase type despite misleading imported names',()=>{
    expect(getProductPurchaseProfile({name:'Cake Gift Box',selling_unit:'pack',variations_json:JSON.stringify({purchaseKind:'pack',options:[]})}).kind).toBe('pack');
    expect(getProductPurchaseProfile({name:'New Creation',purchaseKind:'hamper',sellingUnit:'kg'}).sellingUnit.value).toBe('box');
  });
  it('supports all depths of categories and terminates malformed cycles',()=>{
    expect(categoryDescendants(tree,1)).toEqual([1,2,3]);
    expect(categoryPath(tree,tree[2])).toBe('Cakes › Flavour › Chocolate');
    expect(categoryAncestorSlugs(tree,3)).toEqual(['chocolate','flavour','cakes']);
    expect(categoryDescendants([{id:1,parent_id:2},{id:2,parent_id:1}],1)).toEqual([1,2]);
  });
  it('round-trips exact tiers, videos, SEO, slug and explicit type through real product writes',()=>{
    const rollback=new Error('PRIVATE TEST ROLLBACK');
    try{db.transaction(()=>{
      const category=(db.prepare('SELECT id FROM categories LIMIT 1').get() as any).id;
      const result=upsertProduct({name:'Editor QA Hamper',sku:'QA-EDIT-'+Date.now(),slug:'qa-editor-'+Date.now(),category_id:category,regular_price:800,sale_price:700,stock:4,published:0,selling_unit:'pack',seo_title:'Saved SEO',seo_description:'Saved summary',images_json:[{url:'/uploads/qa.webp'}],videos_json:[{url:'https://tvoflavours.com/uploads/qa.mp4'}],variations_json:{purchaseKind:'pack',options:[{label:'Small pack',weightKg:0,price:700,mrp:800},{label:'Large pack',weightKg:0,price:1200,mrp:1400}]}},{id:1,name:'QA',role:'super_admin'});
      const before=db.prepare('SELECT * FROM products WHERE id=?').get(result.id) as any;
      upsertProduct({id:result.id,name:'Renamed QA product'},{id:1,name:'QA',role:'super_admin'});
      const after=db.prepare('SELECT * FROM products WHERE id=?').get(result.id) as any;
      for(const key of ['slug','seo_title','seo_description','videos_json','variations_json','images_json','stock','published'])expect(after[key]).toEqual(before[key]);
      expect(()=>upsertProduct({id:result.id,category_id:999999},{id:1,role:'super_admin'})).toThrow('category');
      expect(()=>upsertProduct({id:result.id,sale_price:900},{id:1,role:'super_admin'})).toThrow('MRP');
      expect(getProductPurchaseProfile(after).kind).toBe('pack');
      throw rollback;
    })();}catch(error){if(error!==rollback)throw error;}
  });
});
