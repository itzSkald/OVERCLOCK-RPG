// ─────────────────────────────────────────────────────────────────────────────
// Authentication Module
//
// Handles all authentication operations: sign up, sign in, sign out, etc.
// Login is username-based: the caller resolves handle → email before calling
// signIn (the handle→email lookup happens in AuthPlugin via the profiles table).
//
// Email confirmation is disabled by default (AUTH_CONFIG.emailConfirmationEnabled).
// To re-enable it: set emailConfirmationEnabled: true in game.config.ts AND turn
// on "Confirm email" in the Supabase dashboard under Authentication → Providers.
// ─────────────────────────────────────────────────────────────────────────────

import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getClient } from './client';

export interface AuthResult {
  user: User | null;
  error: string | null;
  /** True only when email confirmation IS enabled and the user needs to verify. */
  needsConfirmation?: boolean;
}

export interface AuthStateChange {
  event: AuthChangeEvent;
  session: Session | null;
}

/**
 * Sign up a new user.
 * - emailConfirmationEnabled=false → user can sign in immediately after.
 * - emailConfirmationEnabled=true  → needsConfirmation is returned as true.
 */
export async function signUp(
  email: string,
  password: string,
  emailConfirmationEnabled: boolean,
): Promise<AuthResult> {
  try {
    const client = getClient();
    const { data, error } = await client.auth.signUp({ email, password });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'Registration failed — no user returned.' };
    }

    // When confirmation is disabled, Supabase auto-confirms and sets confirmed_at.
    // When confirmation is required, identities array is empty until confirmed.
    const alreadyConfirmed =
      !!data.user.confirmed_at ||
      (!!data.user.identities && data.user.identities.length > 0);

    const needsConfirmation = emailConfirmationEnabled && !alreadyConfirmed;

    return { user: data.user, error: null, needsConfirmation };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { user: null, error: message };
  }
}

/**
 * Sign in with email + password.
 * Callers that use username-based login must resolve the email first
 * (see AuthPlugin.signInWithUsername).
 */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { user: null, error: message };
  }
}

/**
 * Sign out the current user and clear the local session.
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const client = getClient();
    const { error } = await client.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

/**
 * Get the current session.
 */
export async function getSession(): Promise<{ session: Session | null; error: string | null }> {
  try {
    const client = getClient();
    const { data, error } = await client.auth.getSession();

    if (error) {
      return { session: null, error: error.message };
    }

    return { session: data.session, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { session: null, error: message };
  }
}

/**
 * Get the current authenticated user (server-validated).
 */
export async function getUser(): Promise<AuthResult> {
  try {
    const client = getClient();
    const { data, error } = await client.auth.getUser();

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { user: null, error: message };
  }
}

/**
 * Send a password-reset email to the given address.
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  try {
    const client = getClient();
    const { error } = await client.auth.resetPasswordForEmail(email);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

/**
 * Update the current user's password (called after a reset link is clicked).
 */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  try {
    const client = getClient();
    const { error } = await client.auth.updateUser({ password: newPassword });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (change: AuthStateChange) => void,
): () => void {
  const client = getClient();

  const { data } = client.auth.onAuthStateChange((event, session) => {
    callback({ event, session });
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
