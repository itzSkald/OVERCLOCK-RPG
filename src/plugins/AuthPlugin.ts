// ─────────────────────────────────────────────────────────────────────────────
// Auth Plugin
//
// Handles user authentication using the modular database layer.
//
// Login flow (email-based):
//   1. User enters email + password on LoginScreen.
//   2. AuthPlugin.signIn() calls Supabase signInWithPassword(email, password).
//   3. On success, loads/creates the profile and emits auth_success.
//
// Registration flow:
//   1. User enters handle + email + password.
//   2. AuthPlugin.signUp() creates the Supabase auth user with the given email.
//   3. If AUTH_CONFIG.emailConfirmationEnabled === false (default), immediately
//      signs the user in and creates their profile row with the chosen handle.
//   4. If confirmation is enabled, emits auth_awaiting_confirmation and stops.
//
// Sign-out flow:
//   1. AuthPlugin.signOut() calls Supabase signOut (clears the session).
//   2. Emits auth_signout immediately.
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

    // Registration succeeded — do NOT auto-login. Return needsConfirmation: false
    // so the UI can redirect to the login screen.
    return { error: null, needsConfirmation: false };
  }

  /**
   * Sign in with email + password.
   */
  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await auth.signIn(email, password);
    if (error) return { error };
    return { error: null };
  }

  /**
   * Sign out the current user.
   * Clears local state immediately and calls Supabase signOut.
   * Emits auth_signout regardless of success/failure to reliably disconnect.
   */
  async signOut(): Promise<void> {
    this.currentPlayer = null;
    const { error } = await auth.signOut();
    if (error) {
      console.error('[AuthPlugin] signOut error:', error);
    }
    // Emit signout immediately — don't wait for onAuthStateChange event
    this.engine.emit('auth_signout', {});
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

  cleanup(): void {
    this.unsubscribeAuth?.();
  }
}
