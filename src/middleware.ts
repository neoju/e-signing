export { auth as middleware } from "@/auth";

// No routes are gated — login is optional. The middleware is still registered
// so Auth.js can refresh the session cookie on any request. The matcher
// excludes static assets and the Auth.js endpoints themselves.
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|pdf.worker.min.mjs).*)"],
};
