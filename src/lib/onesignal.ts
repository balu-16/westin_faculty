/**
 * OneSignal Web Push — modular façade for faculty_admin_portal.
 *
 * Site: https://westin-faculty.vercel.app (shared faculty+admin deployment).
 * Student portal is out-of-scope; never call these helpers from student code.
 *
 * iOS/Safari: out of scope for this rollout. Supported: Chrome/Edge/Firefox on desktop.
 * No iOS-only faculty/admin cohort — Safari/PWA push is deferred.
 *
 * External IDs: faculty_<users.id> / admin_<users.id> via getOneSignalExternalId().
 * This helper is the single source of truth — inline construction elsewhere is forbidden.
 * Backend imports an identical helper from westin-api/src/modules/notifications/notifications.service.ts
 * and a unit assertion must keep them in sync.
 *
 * Permission model:
 * - OneSignal.init() in index.html does NOT auto-prompt (prompts: [], notifyButton: false, autoResubscribe: false).
 * - Permission is requested ONLY after login, via a USER GESTURE (toggle / button click).
 *   Calling Notification.requestPermission() without a gesture is blocked ("Permission blocked" error).
 *   We therefore never call requestPermission on page load or from a deferred async after OTP verify
 *   that has lost the transient activation. Instead the Settings toggle and the post-login banner
 *   both trigger optIn() from a direct click handler.
 */

export type OneSignalRole = 'faculty' | 'admin';

/** Single shared helper — call this everywhere an external_id is needed. */
export function getOneSignalExternalId(user: { id: string; role: OneSignalRole }): string {
  return `${user.role}_${user.id}`;
}

type OneSignalApi = {
  init: (opts: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  User: {
    addTags?: (tags: Record<string, string>) => Promise<void> | void;
    addTag?: (key: string, value: string) => Promise<void> | void;
    onesignalId?: string;
    externalId?: string;
    PushSubscription: {
      id?: string | null;
      token?: string | null;
      optedIn: boolean;
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
      addEventListener?: (event: string, cb: (e: unknown) => void) => void;
      removeEventListener?: (event: string, cb: (e: unknown) => void) => void;
    };
  };
  Notifications: {
    requestPermission: () => Promise<boolean | void>;
    permission: boolean;
    permissionNative?: string; // 'granted' | 'denied' | 'default'
    isPushSupported: () => boolean;
    addEventListener?: (event: string, cb: (...args: unknown[]) => void) => void;
    removeEventListener?: (event: string, cb: (...args: unknown[]) => void) => void;
  };
  Slidedown: {
    promptPush: (opts?: unknown) => Promise<void>;
  };
  Debug?: { setLogLevel: (level: string) => void };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalApi) => void | Promise<void>>;
    OneSignal?: OneSignalApi;
  }
}

const LAST_EXTERNAL_ID_KEY = 'westin:onesignal:lastExternalId';

function readLastExternalId(): string | null {
  try {
    return window.localStorage.getItem(LAST_EXTERNAL_ID_KEY);
  } catch {
    return null;
  }
}

function writeLastExternalId(id: string | null): void {
  try {
    if (id === null) window.localStorage.removeItem(LAST_EXTERNAL_ID_KEY);
    else window.localStorage.setItem(LAST_EXTERNAL_ID_KEY, id);
  } catch {}
}

/** Resolve the live OneSignal instance, waiting for Deferred queue if needed. */
function getOneSignalSync(): OneSignalApi | null {
  try {
    const w = window as unknown as Window;
    if (w.OneSignal && typeof (w.OneSignal as OneSignalApi).login === 'function') return w.OneSignal as OneSignalApi;
  } catch {}
  return null;
}

function withOneSignal<T>(fn: (os: OneSignalApi) => Promise<T> | T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const sync = getOneSignalSync();
    if (sync) {
      Promise.resolve(fn(sync)).then(resolve).catch(reject);
      return;
    }
    const w = window as unknown as Window;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async (os: OneSignalApi) => {
      try {
        resolve(await fn(os));
      } catch (e) {
        reject(e);
      }
    });
    // Do not hang login on OneSignal if SDK never loads (offline / blocked).
    // Callers should have their own timeout or swallow errors.
    window.setTimeout(() => {
      // no-op: we do not reject here to avoid breaking auth; callers swallow
    }, 5000);
  });
}

// ---------- Public helpers (modular, easy to change/remove) ----------

export type PushState = {
  isSupported: boolean;
  permission: boolean; // Notifications.permission === true
  permissionNative: 'granted' | 'denied' | 'default';
  optedIn: boolean; // PushSubscription.optedIn
  subscriptionId: string | null;
};

/** Snapshot of current push state — safe to call before init. */
export async function getOneSignalState(): Promise<PushState> {
  const fallback: PushState = {
    isSupported: false,
    permission: false,
    permissionNative: (typeof Notification !== 'undefined' ? (Notification.permission as PushState['permissionNative']) : 'default') || 'default',
    optedIn: false,
    subscriptionId: null,
  };
  try {
    return await withOneSignal((os) => {
      const isSupported = (() => {
        try {
          return os.Notifications.isPushSupported();
        } catch {
          return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
        }
      })();
      let permission = false;
      let permissionNative: PushState['permissionNative'] = 'default';
      try {
        permission = !!os.Notifications.permission;
        const raw = (os.Notifications.permissionNative as string) || (typeof Notification !== 'undefined' ? Notification.permission : 'default');
        if (raw === 'granted' || raw === 'denied' || raw === 'default') permissionNative = raw as PushState['permissionNative'];
      } catch {
        permissionNative = (typeof Notification !== 'undefined' ? (Notification.permission as string) : 'default') as PushState['permissionNative'];
        permission = permissionNative === 'granted';
      }
      let optedIn = false;
      let subscriptionId: string | null = null;
      try {
        optedIn = !!os.User.PushSubscription.optedIn;
        subscriptionId = (os.User.PushSubscription.id as string | null) ?? null;
      } catch {}
      return { isSupported, permission, permissionNative, optedIn, subscriptionId };
    });
  } catch {
    return fallback;
  }
}

/**
 * Subscribe this browser for push.
 * MUST be called from a user gesture (button click) — otherwise the browser
 * will block the native permission prompt ("Permission blocked").
 * Returns true if subscribed, false if blocked/denied/unsupported.
 */
export async function subscribeOneSignal(): Promise<boolean> {
  try {
    const state = await getOneSignalState();
    if (!state.isSupported) return false;
    if (state.permissionNative === 'denied') return false; // cannot prompt again until user resets in browser

    // OneSignal v16: optIn() will trigger the native permission prompt if needed.
    // It must be called with transient activation (from click). Our caller (Toggle/button)
    // is a click handler, so this preserves the gesture as long as we don't await
    // unrelated work between click and this call. Keep this path synchronous where possible.
    await withOneSignal(async (os) => {
      // Prefer optIn — it handles both permission request + subscription.
      if (os.User?.PushSubscription?.optIn) {
        await os.User.PushSubscription.optIn();
      } else if (os.Notifications?.requestPermission) {
        await os.Notifications.requestPermission();
      } else if (os.Slidedown?.promptPush) {
        await os.Slidedown.promptPush({ force: true } as unknown);
      }
    });

    const after = await getOneSignalState();
    return after.optedIn && after.permission;
  } catch (err) {
    // Permission blocked or dismissed — not fatal. Caller shows toast.
    console.debug('[OneSignal] subscribe blocked/failed', err);
    return false;
  }
}

/** Unsubscribe this browser (optOut). Always succeeds locally. */
export async function unsubscribeOneSignal(): Promise<void> {
  try {
    await withOneSignal(async (os) => {
      if (os.User?.PushSubscription?.optOut) {
        await os.User.PushSubscription.optOut();
      }
    });
  } catch (err) {
    console.debug('[OneSignal] unsubscribe failed', err);
  }
}

/**
 * Identify the current user on this browser.
 * Implements the shared-browser requirement: every login where the externalId
 * changes calls logout() before login(newExternalId), not only on explicit sign-out.
 * This keeps the OneSignal Audience subscriber count at 1, not 2, across sequential
 * logins on one device.
 *
 * Does NOT request permission — caller (Settings toggle / banner) does that via subscribeOneSignal()
 * from a user gesture.
 */
export async function identifyOneSignalUser(user: { id: string; role: OneSignalRole }): Promise<void> {
  const nextId = getOneSignalExternalId(user);
  const lastId = readLastExternalId();

  try {
    await withOneSignal(async (os) => {
      if (lastId && lastId !== nextId) {
        try {
          await os.logout();
        } catch {}
      }
      await os.login(nextId);
      const tagPayload: Record<string, string> = { role: user.role };
      if (user.role === 'faculty') tagPayload.faculty_id = user.id;
      else tagPayload.admin_id = user.id;
      try {
        if (os.User?.addTags) await os.User.addTags(tagPayload);
        else if (os.User?.addTag) {
          for (const [k, v] of Object.entries(tagPayload)) await os.User.addTag(k, v);
        }
      } catch {}
      writeLastExternalId(nextId);
    });
  } catch (err) {
    console.debug('[OneSignal] identify failed', err);
  }
}

/** Legacy helper kept for backwards compat — now just identifies (no auto-prompt). */
export async function identifyAndPrompt(user: { id: string; role: OneSignalRole }): Promise<void> {
  await identifyOneSignalUser(user);
  // Intentionally NOT calling requestPermission here — that loses the user gesture
  // and causes "Permission blocked". The post-login banner / Settings toggle will
  // call subscribeOneSignal() from a direct click.
}

/** Request native permission — only call from a click handler. */
export async function requestOneSignalPermission(): Promise<boolean> {
  return subscribeOneSignal();
}

/** Unlink this device from the current identity. Call before clearing session on logout. */
export async function logoutOneSignalUser(): Promise<void> {
  try {
    await withOneSignal(async (os) => {
      try {
        await os.logout();
      } catch {}
      // Also opt-out the push subscription so this browser stops receiving
      // pushes for the previous user until next login opts back in.
      // We do NOT clear browser permission — user can re-optIn without re-prompt.
      try {
        if (os.User?.PushSubscription?.optedIn) {
          // Do not force optOut on logout — keep subscription but unlinked from external_id.
          // The spec says logout() unlinks device from identity; optOut is handled via Settings toggle.
        }
      } catch {}
      writeLastExternalId(null);
    });
  } catch {}
}

/** Best-effort: true if OneSignal page SDK script is present. */
export function isOneSignalSupported(): boolean {
  try {
    return typeof window !== 'undefined' && (typeof window.OneSignal !== 'undefined' || Array.isArray(window.OneSignalDeferred));
  } catch {
    return false;
  }
}
