"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBrowserClient = void 0;
const tslib_1 = require("tslib");
tslib_1.__exportStar(require("./types"), exports);
var client_1 = require("./client");
Object.defineProperty(exports, "createBrowserClient", { enumerable: true, get: function () { return client_1.createBrowserClient; } });
tslib_1.__exportStar(require("./auth-context"), exports);
// Server and middleware exports removed to prevent client bundling issues
// Import directly from source files in server components:
// - import {createServerClient, createServiceClient} from '@interview-platform/supabase-client/src/server'
// - import {createMiddlewareClient} from '@interview-platform/supabase-client/src/middleware'
// - import {requireAuth, requireInterviewee, requireInterviewer, requireAdmin, type AuthUser} from '@interview-platform/supabase-client/src/auth'
//# sourceMappingURL=index.js.map