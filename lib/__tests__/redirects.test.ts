import { SEO_301_REDIRECT_MAPPINGS } from '../masterCatalogHierarchy';
import { SEO_301_REDIRECT_MAPPINGS as DirectImport } from '../server/redirects';

describe('redirects', () => {
  it('should have all redirect rules in server/redirects.ts', () => {
    expect(DirectImport).toBeInstanceOf(Array);
    expect(DirectImport.length).toBeGreaterThan(30);
  });

  it('should match count in masterCatalogHierarchy re-export', () => {
    expect(SEO_301_REDIRECT_MAPPINGS).toHaveLength(DirectImport.length);
  });

  it('every rule should have required fields', () => {
    for (const rule of DirectImport) {
      expect(rule).toHaveProperty('oldUrl');
      expect(rule).toHaveProperty('newUrl');
      expect(rule).toHaveProperty('statusCode');
      expect(rule).toHaveProperty('reason');
      expect(rule.statusCode).toBe(301);
    }
  });

  it('every rule should have non-empty oldUrl and newUrl', () => {
    for (const rule of DirectImport) {
      expect(rule.oldUrl.length).toBeGreaterThan(0);
      expect(rule.newUrl.length).toBeGreaterThan(0);
    }
  });

  it('oldUrl should start with /', () => {
    for (const rule of DirectImport) {
      expect(rule.oldUrl.startsWith('/')).toBe(true);
    }
  });

  it('should preserve all rules when imported from masterCatalogHierarchy', () => {
    for (const rule of SEO_301_REDIRECT_MAPPINGS) {
      expect(DirectImport).toContainEqual(rule);
    }
  });
});
