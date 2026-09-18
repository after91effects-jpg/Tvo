import { ok, err, requireAdmin } from '../../../../lib/server/api';
import {
  getProductRecipe,
  saveProductRecipe,
  deleteProductRecipe,
} from '../../../../lib/server/recipes';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const url = new URL(req.url);
    const productId = Number(url.searchParams.get('productId') || url.searchParams.get('product_id'));

    if (!productId) {
      return err('productId query parameter is required', 400);
    }

    const recipe = getProductRecipe(productId);
    return ok(recipe);
  } catch (error: any) {
    return err(error.message || 'Failed to fetch product recipe', 500);
  }
}

export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const body = await req.json();
    const productId = Number(body.productId || body.product_id);
    const items = Array.isArray(body.items) ? body.items : [];
    const updateCostPrice = Boolean(body.updateCostPrice || body.update_cost_price);

    if (!productId) {
      return err('productId is required', 400);
    }

    const result = saveProductRecipe(user, productId, items, updateCostPrice);
    return ok(result);
  } catch (error: any) {
    return err(error.message || 'Failed to save product recipe', 400);
  }
}

export async function DELETE(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const url = new URL(req.url);
    let productId = Number(url.searchParams.get('productId') || url.searchParams.get('product_id'));

    if (!productId) {
      try {
        const body = await req.json();
        productId = Number(body.productId || body.product_id);
      } catch {
        // body not present
      }
    }

    if (!productId) {
      return err('productId is required', 400);
    }

    const result = deleteProductRecipe(user, productId);
    return ok(result);
  } catch (error: any) {
    return err(error.message || 'Failed to delete product recipe', 400);
  }
}
