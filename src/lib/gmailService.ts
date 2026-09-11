import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize or get Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Provider with Gmail Scopes
const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: any = null;

// LocalStorage keys
const STORAGE_KEY_TOKEN = "plp_gmail_access_token";
const STORAGE_KEY_USER = "plp_gmail_user";
const STORAGE_KEY_TIME = "plp_gmail_token_time";

/**
 * Saves Gmail token and user to memory and localStorage
 */
export const saveGmailAuthSession = (
  token: string,
  user: { email: string; displayName?: string; photoURL?: string }
) => {
  cachedAccessToken = token;
  cachedUser = user;
  try {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
};

/**
 * Clears Gmail token and user from memory and localStorage
 */
export const clearGmailAuthSession = () => {
  cachedAccessToken = null;
  cachedUser = null;
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TIME);
  } catch (e) {
    console.warn("Could not clear localStorage:", e);
  }
};

/**
 * Checks remaining valid time for token (in seconds)
 */
export const getGmailTokenRemainingSeconds = (): number => {
  const tokenTime = Number(localStorage.getItem(STORAGE_KEY_TIME) || "0");
  if (!tokenTime) return 0;
  const elapsedMs = Date.now() - tokenTime;
  const maxMs = 55 * 60 * 1000; // 55 minutes validity
  const remaining = Math.floor((maxMs - elapsedMs) / 1000);
  return remaining > 0 ? remaining : 0;
};

/**
 * Gets cached token in memory or restores from localStorage (if not expired)
 */
export const getGmailAccessToken = (): string | null => {
  if (cachedAccessToken) {
    if (getGmailTokenRemainingSeconds() <= 0) {
      console.warn("Gmail access token has expired (55-min threshold)");
      clearGmailAuthSession();
      return null;
    }
    return cachedAccessToken;
  }

  // Restore from localStorage
  try {
    const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (savedToken && getGmailTokenRemainingSeconds() > 0) {
      cachedAccessToken = savedToken;
      const savedUserStr = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUserStr) {
        cachedUser = JSON.parse(savedUserStr);
      }
      return savedToken;
    } else if (savedToken) {
      clearGmailAuthSession();
    }
  } catch (e) {
    console.warn("Error restoring gmail token:", e);
  }
  return null;
};

export const getGmailUser = (): any => {
  if (cachedUser) return cachedUser;
  try {
    const savedUserStr = localStorage.getItem(STORAGE_KEY_USER);
    if (savedUserStr) {
      cachedUser = JSON.parse(savedUserStr);
      return cachedUser;
    }
  } catch (e) {
    console.warn("Error restoring gmail user:", e);
  }
  return null;
};

/**
 * Listener for auth state changes. Does NOT wipe external Gmail access tokens.
 */
export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getGmailAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      }
    }
  });
};

declare const google: any;

/**
 * Direct Google OAuth 2.0 Token Client via GIS JS SDK (fallback for restricted Firebase Auth popups)
 */
export const requestGmailTokenViaGIS = (): Promise<{ accessToken: string; email?: string }> => {
  return new Promise((resolve, reject) => {
    const scriptId = "google-gis-script";
    const clientId =
      firebaseConfig.oAuthClientId ||
      (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
      "";

    const runGIS = () => {
      try {
        if (!clientId) {
          reject(new Error("ពុំទាន់មាន OAuth Client ID ក្នុង config ទេ។ សូមប្រើប្រាស់ Google Access Token ដោយផ្ទាល់ខាងក្រោម។"));
          return;
        }

        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope:
            "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
          callback: async (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }
            if (response.access_token) {
              try {
                const profileRes = await fetch(
                  "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                  {
                    headers: { Authorization: `Bearer ${response.access_token}` },
                  }
                );
                const profile = profileRes.ok ? await profileRes.json() : {};
                const email = profile.emailAddress || "user@gmail.com";
                cachedAccessToken = response.access_token;
                cachedUser = { email, displayName: email } as any;
                resolve({ accessToken: response.access_token, email });
              } catch {
                cachedAccessToken = response.access_token;
                resolve({ accessToken: response.access_token });
              }
            } else {
              reject(new Error("ពុំទទួលបាន Access Token ទេ"));
            }
          },
          error_callback: (err: any) => {
            const errStr = JSON.stringify(err || {});
            if (errStr.includes("popup") || errStr.includes("failed_to_open") || err?.type === "popup_failed_to_open") {
              reject(new Error("កម្មវិធីរុករក (Browser) បានទប់ស្កាត់ផ្ទាំង Popup។ សូមអនុញ្ញាត Popup លើ Browser ឬចុចបើកផ្ទាំងថ្មី (Open in New Tab) ឬប្រើប្រាស់ Google Access Token ដោយផ្ទាល់ខាងក្រោម។"));
            } else {
              reject(new Error(err?.message || "ការភ្ជាប់ Google OAuth បរាជ័យ"));
            }
          },
        });
        client.requestAccessToken();
      } catch (e: any) {
        reject(e);
      }
    };

    if (typeof google !== "undefined" && google?.accounts?.oauth2) {
      runGIS();
    } else {
      const existing = document.getElementById(scriptId);
      if (existing) {
        existing.addEventListener("load", runGIS);
      } else {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.onload = runGIS;
        script.onerror = () => reject(new Error("មិនអាចទាញយក Google Identity Script បានទេ"));
        document.body.appendChild(script);
      }
    }
  });
};

/**
 * Triggers Google Sign In requesting Gmail OAuth scopes (Direct GIS first to avoid async popup blocking)
 */
export const signInWithGoogleForGmail = async (): Promise<{
  user: any;
  accessToken: string;
} | null> => {
  const effectiveClientId =
    firebaseConfig.oAuthClientId ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
    "";

  // When Client ID is available, call GIS directly to keep browser user gesture synchronous
  if (effectiveClientId) {
    try {
      isSigningIn = true;
      const gisRes = await requestGmailTokenViaGIS();
      if (gisRes.accessToken) {
        return {
          user: cachedUser || ({ email: gisRes.email, displayName: gisRes.email } as any),
          accessToken: gisRes.accessToken,
        };
      }
    } catch (gisError: any) {
      console.warn("GIS primary sign in notice:", gisError?.message || gisError);
      // If error was popup blocked or explicit, rethrow with clear guidance
      if (gisError?.message?.includes("Popup") || gisError?.message?.includes("popup")) {
        throw gisError;
      }
    } finally {
      isSigningIn = false;
    }
  }

  // Fallback to Firebase Auth Popup if GIS was not used
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("ពុំទទួលបាន OAuth Access Token ពី Google ទេ");
    }

    const userData = {
      email: result.user.email || "user@gmail.com",
      displayName: result.user.displayName || result.user.email || "User",
      photoURL: result.user.photoURL || undefined,
    };
    saveGmailAuthSession(credential.accessToken, userData);

    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.warn("Firebase Auth Popup restricted:", error?.message || error);

    if (error?.code === "auth/admin-restricted-operation" || error?.message?.includes("admin-restricted-operation")) {
      throw new Error("ការចូលប្រើ Firebase ត្រូវបានកំណត់កម្រិត (admin-restricted)។ សូមប្រើប្រាស់ Google Access Token ដោយផ្ទាល់ខាងក្រោម។");
    }
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error("សេវាកម្ម Google Sign-In មិនទាន់បើកដំណើរការក្នុង Firebase Console ទេ។ សូមប្រើប្រាស់ Google Access Token ដោយផ្ទាល់។");
    }
    if (error?.code === "auth/popup-blocked" || error?.message?.includes("popup") || error?.message?.includes("Popup")) {
      throw new Error("ផ្ទាំង Popup ត្រូវទប់ស្កាត់ដោយកម្មវិធីរុករក (Browser)។ សូមអនុញ្ញាត Popup លើ Browser ឬបើកផ្ទាំងថ្មី ឬប្រើប្រាស់ Google Access Token ដោយផ្ទាល់ខាងក្រោម។");
    }
    throw new Error(error?.message || "ការភ្ជាប់ Google Sign-In បរាជ័យ។ សូមប្រើប្រាស់ Google Access Token ដោយផ្ទាល់ខាងក្រោម។");
  } finally {
    isSigningIn = false;
  }
};

/**
 * Manually set OAuth Access Token (Fallback when Firebase auth popup is restricted)
 */
export const setGmailManualToken = async (token: string): Promise<{ email: string; accessToken: string }> => {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error("សូមបញ្ជូល Access Token");
  }

  // Validate token with Gmail Profile API
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${cleanToken}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Access Token មិនត្រឹមត្រូវ ឬផុតកំណត់");
  }

  const profile = await res.json();
  const userEmail = profile.emailAddress || "user@gmail.com";

  saveGmailAuthSession(cleanToken, {
    email: userEmail,
    displayName: userEmail,
  });

  return { email: userEmail, accessToken: cleanToken };
};

/**
 * Logout from Gmail
 */
export const logoutGmail = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Sign out error:", e);
  } finally {
    clearGmailAuthSession();
  }
};

/**
 * Safe Base64URL encoder supporting full UTF-8 (including Khmer characters) without stack limit issues
 */
function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  const chunkSize = 0x8000; // 32KB chunking
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + chunkSize, bytes.length)))
    );
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Encodes email subject header in RFC 2047 UTF-8 Base64
 */
function utf8SubjectEncode(subject: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(subject);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `=?utf-8?B?${btoa(binary)}?=`;
}

/**
 * Utility to encode RFC 2822 email message in base64url for Gmail API
 */
function createRawEmail(to: string, from: string, subject: string, htmlContent: string): string {
  const cleanTo = to
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");

  const cleanHtml = htmlContent || "<p></p>";

  const emailLines = [
    `To: ${cleanTo}`,
    `From: ${from}`,
    `Subject: ${utf8SubjectEncode(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    cleanHtml,
  ];

  return base64UrlEncode(emailLines.join("\r\n"));
}

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
}

/**
 * Sends email via Gmail API REST
 */
export const sendGmailEmail = async ({ to, subject, htmlBody }: SendEmailParams) => {
  const token = getGmailAccessToken();
  if (!token) {
    throw new Error("មិនទាន់បានចូលប្រើប្រាស់ Gmail ទេ ឬ Token បានផុតកំណត់ (No Valid Access Token)");
  }

  const senderEmail = getGmailUser()?.email || "me";
  const raw = createRawEmail(to, senderEmail, subject, htmlBody);

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 401) {
      clearGmailAuthSession();
      throw new Error(
        "Google Access Token បានផុតកំណត់ (Expired) ឬអស់សុពលភាព។ ប្រព័ន្ធបានសម្អាត Token ចាស់រួចរាល់ សូមចុចប៊ូតុង '🔑 ភ្ជាប់ Gmail ឡើងវិញ' ដើម្បីបន្តផ្ញើសារ។"
      );
    }
    if (res.status === 403) {
      throw new Error(
        errData?.error?.message ||
          "គ្មានសិទ្ធិផ្ញើអ៊ីមែល (403 Forbidden)។ សូមពិនិត្យមើល Gmail API Scope ឬភ្ជាប់ Google Account ឡើងវិញ។"
      );
    }
    throw new Error(
      errData?.error?.message ||
        `មិនអាចផ្ញើអ៊ីមែលបានទេ (កូដកំហុស៖ ${res.status})`
    );
  }

  return await res.json();
};

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  snippet: string;
  subject?: string;
  from?: string;
  date?: string;
}

/**
 * Fetches recent list of Gmail messages for the user
 */
export const listGmailMessages = async (maxResults = 10): Promise<GmailMessageSummary[]> => {
  const token = getGmailAccessToken();
  if (!token) {
    throw new Error("មិនទាន់បានចូលប្រើប្រាស់ Gmail ទេ");
  }

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || "បរាជ័យក្នុងការទាញយកបញ្ជីអ៊ីមែល");
  }

  const listData = await listRes.json();
  if (!listData.messages || !Array.isArray(listData.messages)) {
    return [];
  }

  // Fetch details for each message snippet
  const details = await Promise.all(
    listData.messages.slice(0, maxResults).map(async (m: { id: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!detailRes.ok) return { id: m.id, snippet: "" };
        const d = await detailRes.json();
        const headers: GmailMessageHeader[] = d.payload?.headers || [];
        const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "(គ្មានចំណងជើង)";
        const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
        const date = headers.find((h) => h.name.toLowerCase() === "date")?.value || "";
        return {
          id: m.id,
          snippet: d.snippet || "",
          subject,
          from,
          date,
        };
      } catch {
        return { id: m.id, snippet: "" };
      }
    })
  );

  return details;
};
