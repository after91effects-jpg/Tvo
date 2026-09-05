import { NextResponse } from 'next/server';
import { ok, err } from '../../lib/server/api';

export const runtime = 'nodejs';

export async function GET() {
  return ok({ message: 'TVO Flavours API', version: '1.0.0' });
}
