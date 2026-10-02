import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('Photo storage unavailable');return env.BUCKET;}
export const privateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
