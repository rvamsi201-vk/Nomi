import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const isApi = pathname.startsWith("/api/");
  const session = request.cookies.get("nomi_user_id")?.value;
  const hasSignedSession = Boolean(
    session && /^[^.]+\.[a-f0-9]{64}$/i.test(session),
  );

  if (isApi || isPublic) return NextResponse.next();

  if (!hasSignedSession) {
    const forwardedHost =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    const origin = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : request.nextUrl.origin;
    const url = new URL("/login", origin);
    url.searchParams.set("next", pathname);
    const response = NextResponse.redirect(url);
    if (session) response.cookies.delete("nomi_user_id");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
