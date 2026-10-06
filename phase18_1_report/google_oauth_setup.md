# Phase 18.1 — Google OAuth Configuration Guide

## Overview
This document specifies the exact external configuration required to activate Google OAuth in the live production and staging environments for the Chess Evolve project (`jflaxfptqwnqxshzevqa`).

> [!IMPORTANT]
> **Operational Readiness Notice:**
> The application code for Google OAuth is fully implemented, wired, and verified with automated test suites. However, Google OAuth will only complete user logins once the developer registers the client credentials in the Google Cloud Console and enables the Google Provider in the Supabase Dashboard as outlined below.

---

## 1. External Credentials Required

### 1.1 Google Cloud Platform (GCP)
1. Navigate to [Google Cloud Console -> APIs & Services -> Credentials](https://console.cloud.google.com/apis/credentials).
2. **Configure OAuth Consent Screen**:
   - User Type: **External**
   - Application Name: `Chess Evolve`
   - User support email: `your-email@domain.com`
   - Scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
3. **Create OAuth 2.0 Client ID**:
   - Application Type: **Web application**
   - Name: `Chess Evolve Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (Local Development)
     - `https://app.chessevolve.com` (Production Web URL)
   - **Authorized redirect URIs** (Supabase Auth Callback):
     ```
     https://jflaxfptqwnqxshzevqa.supabase.co/auth/v1/callback
     ```
4. Record the **Client ID** and **Client Secret**.

---

## 2. Supabase Dashboard Provider Activation

1. Navigate to the active Supabase project:
   [https://supabase.com/dashboard/project/jflaxfptqwnqxshzevqa/auth/providers](https://supabase.com/dashboard/project/jflaxfptqwnqxshzevqa/auth/providers)
2. Expand the **Google** provider accordion:
   - Toggle **Enable Sign in with Google** to **ON**.
   - **Client ID**: Paste GCP Client ID.
   - **Client Secret**: Paste GCP Client Secret.
3. Click **Save**.

---

## 3. Supabase URL Configuration

Navigate to **Authentication -> URL Configuration** in the Supabase Dashboard:

### Site URL
- Development: `http://localhost:3000`
- Production: `https://app.chessevolve.com`

### Redirect URLs
Add each of the following redirect whitelist entries:
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/**`
- `https://app.chessevolve.com/auth/callback`
- `https://app.chessevolve.com/**`

---

## 4. Frontend Dynamic Origin Enforcement

The application uses the browser's dynamic origin rather than hardcoding domain names:
```javascript
const redirectTo = `${window.location.origin}/auth/callback`;

await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo,
  },
});
```

This guarantees that local development automatically redirects to `http://localhost:3000/auth/callback`, while production automatically redirects to `https://app.chessevolve.com/auth/callback`.
