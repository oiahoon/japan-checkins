// Next.js never provides or emulates trusted Sites identity or storage.
export const env = new Proxy({}, {get(){throw new Error('Sites bindings are unavailable in Next.js; use GitHub mode');}});
