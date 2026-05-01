'use client';
import PocketBase from 'pocketbase';

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'https://pocketbase-production-d054.up.railway.app';

let _pb: PocketBase | null = null;

export function getPB(): PocketBase {
  if (!_pb) _pb = new PocketBase(PB_URL);
  return _pb;
}
