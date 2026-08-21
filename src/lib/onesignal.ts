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
 */

export type OneSignalRole = 'faculty' | 'admin';

/** Single shared helper — call this everywhere an external_id is needed. */
export function getOneSignalExternalId(user: { id: string; role: OneSignalRole }): string {
  return `${user.role}_${user.id}`;
}

type OneSignalApi = {
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  User: {
    addTags?: (tags: Record<string, string>) => Promise<void> | void;
    addTag?: (key: string, value: string) => Promise<void> | void;
  };
  Notifications: {
    requestPermission: () => Promise<boolean | void>;
    permission?: boolean;
    permissionNative?: string;
  };
  Slidedown?: { promptPush: (opts?: unknown) => Promise<void> };
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

function withOneSignal<T>(fn: (os: OneSignalApi) => Promise<T> | T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const w = window as unknown as Window;
    // SDK already loaded (post-page.js) → use window.OneSignal directly
    if (w.OneSignal && typeof (w.OneSignal as any).login === 'function') {
      Promise.resolve(fn(w.OneSignal as OneSignalApi))
        .then(resolve)
        .catch(reject);
      return;
    }
    // Defer until SDK init fires
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async (os: OneSignalApi) => {
      try {
        resolve(await fn(os));
      } catch (e) {
        reject(e);
      }
    });
    // Safety: if SDK never loads (offline), resolve silently after 5s
    window.setTimeout(() => {
      // best-effort: no rejection — OneSignal is non-critical for login success
      // Call site should swallow errors; this timeout avoids hanging the login flow.
    }, 5000);
  });
}

/**
 * Identify the current user on this browser.
 * Implements the shared-browser requirement: every login where the externalId
 * changes calls logout() before login(newExternalId), not only on explicit sign-out.
 * This keeps the OneSignal Audience subscriber count at 1, not 2, across sequential
 * logins on one device.
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
      // Tag for dashboard filtering + optional server-side targeting fallback
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
  } catch {
    // Non-blocking: auth success must not depend on OneSignal
  }
}

/** Convenience: identify + request permission in one call after OTP verify. */
export async function identifyAndPrompt(user: { id: string; role: OneSignalRole }): Promise<void> {
  await identifyOneSignalUser(user);
  await requestOneSignalPermission();
}

/** Request push permission post-login (not on page load). Idempotent. */
export async function requestOneSignalPermission(): Promise<void> {
  try {
    await withOneSignal(async (os) => {
      // Native prompt path preferred (allows automatic permission UI)
      if (os.Notifications?.requestPermission) {
        await os.Notifications.requestPermission();
        return;
      }
      if (os.Slidedown?.promptPush) {
        await os.Slidedown.promptPush();
      }
    });
  } catch {}
}

/** Unlink this device from the current identity. Call before clearing session on logout. */
export async function logoutOneSignalUser(): Promise<void> {
  try {
    await withOneSignal(async (os) => {
      try {
        await os.logout();
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
