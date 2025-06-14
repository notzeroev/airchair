/**
 * Modern Supabase Server-Side Authentication Helpers
 * Using @supabase/ssr with Next.js App Router
 * 
 * This file provides essential authentication utilities for server-side operations
 * with Supabase, following modern best practices.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { User, Session } from '@supabase/supabase-js';

// ========================================
// Server Client Creation
// ========================================

/**
 * Creates a Supabase client for Server Components and Route Handlers
 * Uses the latest @supabase/ssr package with proper cookie handling
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
});

// ========================================
// User Authentication Helpers
// ========================================

/**
 * Gets the current authenticated user (cached for performance)
 * Returns null if not authenticated
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createClient();
    
    // Use modern getUser() method instead of deprecated user()
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('Error fetching user:', error.message);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Unexpected error fetching user:', error);
    return null;
  }
});

/**
 * Gets the current session (cached for performance)
 * Returns null if no active session
 */
export const getCurrentSession = cache(async (): Promise<Session | null> => {
  try {
    const supabase = await createClient();
    
    // Use modern getSession() method instead of deprecated session()
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Error fetching session:', error.message);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Unexpected error fetching session:', error);
    return null;
  }
});

/**
 * Gets both user and session data in a single call
 * Useful when you need both pieces of information
 */
export const getAuthData = cache(async (): Promise<{
  user: User | null;
  session: Session | null;
}> => {
  try {
    const supabase = await createClient();
    
    // Get both user and session efficiently
    const [userResult, sessionResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ]);
    
    return {
      user: userResult.error ? null : userResult.data.user,
      session: sessionResult.error ? null : sessionResult.data.session,
    };
  } catch (error) {
    console.error('Unexpected error fetching auth data:', error);
    return { user: null, session: null };
  }
});

// ========================================
// Route Protection Helpers
// ========================================

/**
 * Requires authentication - redirects to login if not authenticated
 * Use in Server Components that require authentication
 */
export async function requireAuth(redirectTo = '/auth/login'): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect(redirectTo);
  }
  
  return user;
}

/**
 * Redirects authenticated users away from auth pages
 * Use in login/signup pages to prevent authenticated users from accessing them
 */
export async function redirectIfAuthenticated(redirectTo = '/dashboard') {
  const user = await getCurrentUser();
  
  if (user) {
    redirect(redirectTo);
  }
}

// ========================================
// API Route Helpers
// ========================================

/**
 * Creates Supabase client for API Routes with proper error handling
 * Use this in Route Handlers (app/api/*)
 */
export async function createApiClient(request: Request) {
  // Extract cookies from the request
  const cookieHeader = request.headers.get('cookie') ?? '';
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (!cookieHeader) return [];
          
          return cookieHeader
            .split(';')
            .map(cookie => {
              const [name, value] = cookie.trim().split('=');
              return { name: name ?? '', value: value ?? '' };
            })
            .filter(cookie => cookie.name && cookie.value);
        },
        setAll(_cookiesToSet) {
          // In API routes, you'd typically set cookies in the response
          // This is handled by the response object
        },
      },
    }
  );
}

/**
 * Gets authenticated user from API request
 * Use in API Route Handlers
 */
export async function getApiUser(request: Request): Promise<User | null> {
  try {
    const supabase = await createApiClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('API auth error:', error.message);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Unexpected API auth error:', error);
    return null;
  }
}

// ========================================
// Server Actions Helpers
// ========================================

/**
 * Validates authentication in Server Actions
 * Returns authenticated user or throws error
 */
export async function validateServerAction(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required for this action');
  }
  
  return user;
}

// ========================================
// Database Helpers with RLS
// ========================================

/**
 * Creates authenticated Supabase client for database operations
 * Ensures Row Level Security (RLS) policies work correctly
 */
export async function createAuthenticatedClient() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required for database operations');
  }
  
  return { supabase, user };
}
