import type { Context, MiddlewareFn } from 'grammy';
import { allowedIds } from '../config.js';

export function whitelist<C extends Context>(): MiddlewareFn<C> {
  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId || !allowedIds.has(userId)) {
      // Silently ignore — no response to unknown users
      return;
    }
    return next();
  };
}
