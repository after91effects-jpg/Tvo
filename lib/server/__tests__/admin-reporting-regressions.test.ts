import { describe, expect, it, afterEach, vi } from 'vitest';
import { productSales, validateReportDates } from '../reporting';
import { persistentMediaRoot } from '../product-media-storage';
import { importProductsFromWooCommerce } from '../../csvHelpers';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Admin report attribution', () => {
  it('attributes revenue only to the purchased products and counts each order once', () => {
    const products=[{id:1,name:'Cake',category:'Cakes'},{id:2,name:'Cookies',category:'Snacks'},{id:3,name:'Unsold',category:'Cakes'}];
    const sales=productSales([
      {id:1,status:'Delivered',items:JSON.stringify([{productId:'1',qty:2,unitPrice:100,totalPrice:200},{productId:'2',qty:1,unitPrice:50,totalPrice:50},{productId:'1',qty:1,totalPrice:75}])},
      {id:2,status:'Cancelled',items:[{productId:'1',qty:1,totalPrice:999}]},
      {id:3,status:'Accepted',items:'broken json'},
    ],products);
    expect(sales).toEqual([{id:1,name:'Cake',category:'Cakes',orderCount:1,revenue:275},{id:2,name:'Cookies',category:'Snacks',orderCount:1,revenue:50}]);
  });
  it('rejects impossible and reversed date ranges', () => {
    expect(()=>validateReportDates('2026-02-31','')).toThrow();
    expect(()=>validateReportDates('2026-10-30','2026-10-01')).toThrow();
    expect(()=>validateReportDates('2026-10-01','2026-10-30')).not.toThrow();
  });
});
describe('Admin import response contract', () => {
  it('returns the summary produced by the actual flat import API response', async () => {
    const summary={created:1,updated:0,skipped:0,failed:0,errors:[]};
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(summary)));
    expect(await importProductsFromWooCommerce([{SKU:'TEST-1'}],'skip')).toEqual(summary);
  });
});
describe('Persistent upload placement', () => {
  it('keeps files outside both current and versioned Hostinger deployment folders', () => {
    vi.stubEnv('MEDIA_STORAGE_DIR','');
    expect(persistentMediaRoot('/home/account/domains/site/hbuilds/current/nodejs')).toBe('/home/account/domains/site/storage/product-media');
    expect(persistentMediaRoot('/home/account/domains/site/hbuilds/versions/build123/nodejs')).toBe('/home/account/domains/site/storage/product-media');
  });
});
