import { ok, err, requireAdmin } from '../../../../lib/server/api';
import {
  listIngredients,
  saveIngredient,
  deleteIngredient,
  adjustIngredientStock,
  getIngredientById,
} from '../../../../lib/server/recipes';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const url = new URL(req.url);
    const idParam = url.searchParams.get('id');

    if (idParam) {
      const ing = getIngredientById(Number(idParam));
      if (!ing) return err('Ingredient not found', 404);
      return ok({ ingredient: ing });
    }

    const ingredients = listIngredients();
    return ok({ ingredients });
  } catch (error: any) {
    return err(error.message || 'Failed to fetch ingredients', 500);
  }
}

export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const body = await req.json();
    const action = body.action || 'save';

    if (action === 'adjust_stock') {
      const id = Number(body.id);
      const delta = Number(body.delta);
      if (!id || isNaN(delta)) {
        return err('Invalid adjustment parameters: id and delta are required', 400);
      }
      const result = adjustIngredientStock(user, id, delta, body.note);
      return ok(result);
    }

    // Default: save ingredient
    const result = saveIngredient(user, body);
    return ok(result);
  } catch (error: any) {
    return err(error.message || 'Failed to save ingredient', 400);
  }
}

export async function DELETE(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const url = new URL(req.url);
    let id = Number(url.searchParams.get('id'));

    if (!id) {
      try {
        const body = await req.json();
        id = Number(body.id);
      } catch {
        // body not present
      }
    }

    if (!id) return err('Ingredient id is required', 400);

    const result = deleteIngredient(user, id);
    return ok(result);
  } catch (error: any) {
    return err(error.message || 'Failed to delete ingredient', 400);
  }
}
