import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(['/intro(.*)', '/sign-in(.*)', '/sign-up(.*)', '/api(.*)', '/trpc(.*)']);

export default clerkMiddleware(async (auth, request) => {
  // If user is hitting the root route and is NOT logged in, redirect to /intro
  if (request.nextUrl.pathname === '/') {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/intro', request.url));
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
