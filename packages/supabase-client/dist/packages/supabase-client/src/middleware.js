"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMiddlewareClient = createMiddlewareClient;
const ssr_1 = require("@supabase/ssr");
const server_1 = require("next/server");
async function createMiddlewareClient(request) {
    const response = server_1.NextResponse.next({
        request: {
            headers: request.headers,
        },
    });
    const supabase = (0, ssr_1.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    request.cookies.set(name, value);
                    response.cookies.set(name, value, Object.assign(Object.assign({}, options), { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }));
                });
            },
        },
    });
    return { supabase, response };
}
//# sourceMappingURL=middleware.js.map