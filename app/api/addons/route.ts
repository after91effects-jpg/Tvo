import { ok } from '../../../lib/server/api';
import { getAddons } from '../../../lib/server/addons-data';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const addons = getAddons();
    return ok({ addons });
  } catch (e: any) {
    return ok({ addons: [] });
  }
}
