// ─────────────────────────────────────────────────────────────────────────────
// Auth Plugin
//
// Handles user authentication using the modular database layer.
//
// Login flow (username-based):
//   1. User enters handle + password on LoginScreen.
//   2. AuthPlugin.signInWithUsername() looks up the email for that handle
//      via a public SELECT on the profiles table (anon policy allows this).
//   3. Calls Supabase signInWithPassword(email, password).
//   4. On success, loads/creates the profile and emits auth_success.
//
// Registration flow:
//   1. User enters handle + email (recovery only) + password.
//   2. AuthPlugin.signUp() creates the Supabase auth user with the given email.
//   3. If AUTH_CONFIG.emailConfirmationEnabled === false (default), immediately
//      signs the user in and creates their profile.
//   4. If confirmation is enabled, emits auth_awaiting_confirmation and stops.
//
// Sign-out flow:
//   1. AuthPlugin.signOut() calls Supabase signOut (clears the session).
//   2. The onAuthStateChange listener fires SIGNED_OUT and emits auth_signout.
// ─────────────────────────────────────────────────────────────────────────────

import * as auth from '../lib/db/auth';
import { AUTH_CONFIG } from '../config/game.config';
import type { IPlugin, IEngine, Player } from '../engine/types';

export class AuthPlugin implements IPlugin {
  id = 'auth';
  roles = ['auth'] as const;

  private engine!: IEngine;
  private currentPlayer: Player | null = null;
  private unsubscribeAuth?: () => void;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.storage.registerTable(this.id, { table: 'profiles', userScoped: true });

    // Fire-and-forget: must not block boot
    void this.checkExistingSession();

    // Subscribe to Supabase auth state changes
    this.unsubscribeAuth = auth.onAuthStateChange(({ event, session }) => {
      (async () => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Skip if this is just a token refresh for the same user
          if (this.currentPlayer?.id === session.user.id) return;
          await this.handleAuthSuccess(session.user.id, session.user.email ?? '');
        } else if (event === 'SIGNED_OUT') {
          this.currentPlayer = null;
          this.engine.emit('auth_signout', {});
        }
        // TOKEN_REFRESHED: ignore — same user, no state reload needed
      })();
    });
  }

  // ── Session bootstrap ───────────────────────────────────────────────────────

  private async checkExistingSession(): Promise<void> {
    try {
      const { session, error } = await auth.getSession();
      if (error) {
        console.error('[AuthPlugin] Session check failed:', error);
        this.engine.emit('auth_failed', { error: 'Session check failed' });
        return;
      }
      if (session?.user) {
        await this.handleAuthSuccess(session.user.id, session.user.email ?? '');
      }
    } catch (err) {
      console.error('[AuthPlugin] Session check exception:', err);
      this.engine.emit('auth_failed', { error: 'Session check failed' });
    }
  }

  private async handleAuthSuccess(userId: string, email: string): Promise<void> {
    try {
      const profile = await this.ensureProfile(userId, email);
      this.currentPlayer = profile;
      this.engine.emit('auth_success', profile);
    } catch (err) {
      console.error('[AuthPlugin] Auth success handler failed:', err);
      this.engine.emit('auth_failed', { error: 'Profile load failed' });
    }
  }

  private async ensureProfile(userId: string, email: string): Promise<Player> {
    const { data: existing } = await this.engine.storage.load<{
      id: string;
      handle: string;
      avatar_index: number;
    }>('profiles', { id: userId }, 'id, handle, avatar_index');

    if (existing) {
      return {
        id: existing.id,
        handle: existing.handle,
        avatarIndex: existing.avatar_index,
      };
    }

    // Fallback handle from email if no profile exists yet
    const handle =
      email
        .split('@')[0]
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .slice(0, 12) || 'HACKER';

    const { data: created } = await this.engine.storage.insert<{
      id: string;
      handle: string;
      avatar_index: number;
    }>('profiles', { id: userId, handle, avatar_index: 0 }, 'id, handle, avatar_index');

    return {
      id: created?.id ?? userId,
      handle: created?.handle ?? handle,
      avatarIndex: created?.avatar_index ?? 0,
    };
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Register a new user.
   * - handle: the in-game username (unique, used for login)
   * - email:  stored for password-reset recovery only
   * - password: Supabase auth password
   */
  async signUp(
    email: string,
    password: string,
    handle: string,
  ): Promise<{ error: string | null; needsConfirmation?: boolean }> {
    const sanitisedHandle = handle.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 12);

    // Register with Supabase auth using email (required by Supabase)
    const { user, error, needsConfirmation } = await auth.signUp(
      email,
      password,
      AUTH_CONFIG.emailConfirmationEnabled,
    );
    if (error) return { error };
    if (!user) return { error: 'Registration failed.' };

    // Create profile with the chosen handle and recovery email
    await this.engine.storage.save(
      'profiles',
      { id: user.id, handle: sanitisedHandle, email, avatar_index: 0 },
      'id',
    );

    if (needsConfirmation) {
      this.engine.emit('auth_awaiting_confirmation', { email });
      return { error: null, needsConfirmation: true };
    }

    // Confirmation not required — sign in immediately
    const { error: signInError } = await auth.signIn(email, password);
    if (signInError) return { error: signInError };

    return { error: null };
  }

  /**
   * Sign in using a username (handle) + password.
   * Resolves the handle to an email via the public profiles table, then
   * calls Supabase signInWithPassword.
   */
  async signInWithUsername(
    handle: string,
    password: string,
  ): Promise<{ error: string | null }> {
    const sanitisedHandle = handle.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 12);

    // Look up the auth.users email for this handle via the profiles join
    // The anon RLS policy on profiles allows SELECT for the login lookup.
    const email = await this.resolveEmailForHandle(sanitisedHandle);
    if (!email) {
      return { error: 'USERNAME_NOT_FOUND' };
    }

    const { error } = await auth.signIn(email, password);
    if (error) return { error };
    return { error: null };
  }

  /**
   * Sign in directly with email + password (used by ResetScreen and internally).
   */
  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await auth.signIn(email, password);
    if (error) return { error };
    return { error: null };
  }

  /**
   * Sign out the current user.
   * Supabase will fire the SIGNED_OUT event which then emits auth_signout.
   */
  async signOut(): Promise<void> {
    this.currentPlayer = null;
    const { error } = await auth.signOut();
    if (error) {
      // Even if the remote sign-out failed, clear local state
      console.error('[AuthPlugin] signOut error (forcing local clear):', error);
      this.engine.emit('auth_signout', {});
    }
    // Success case: SIGNED_OUT event from onAuthStateChange handles the emit
  }

  /**
   * Trigger a password-reset email to the given address.
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    const { error } = await auth.resetPassword(email);
    if (error) return { error };
    return { error: null };
  }

  getPlayer(): Player | null {
    return this.currentPlayer;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Query the profiles table to find which email belongs to a given handle.
   * This uses the Supabase client directly with the anon key, so it works
   * before the user is authenticated (the "Anyone can read handles" RLS policy
   * allows this SELECT).
   */
  private async resolveEmailForHandle(handle: string): Promise<string | null> {
    try {
      // We need to join profiles → auth.users to get the email.
      // Supabase does not expose auth.users to the client directly, so we
      // use the profiles id → auth.users id relationship via an RPC or a
      // secondary lookup using the session after sign-in.
      //
      // Strategy: store the email in profiles so it can be retrieved here.
      // This requires an `email` column on profiles. As a fallback during
      // migration, we attempt the lookup and return null if column missing.
      const { data, error } = await (this.engine.storage as any)
        .getClient()
        .from('profiles')
        .select('email')
        .eq('handle', handle)
        .maybeSingle();

      if (error || !data?.email) return null;
      return data.email as string;
    } catch {
      return null;
    }
  }

  cleanup(): void {
    this.unsubscribeAuth?.();
  }
}
