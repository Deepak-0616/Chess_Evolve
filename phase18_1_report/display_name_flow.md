# Phase 18.1 — Display Name Lifecycle & Resolution Flow

## Overview
This document outlines how display names are collected, validated, resolved, and persisted across both Email/Password signups and Google OAuth logins.

---

## 1. Flow Diagram

```
[ User Action ]
      │
      ├─────────────────────────────────────────┐
      ▼                                         ▼
[ Email Signup ]                        [ Google OAuth ]
      │                                         │
- User enters Display Name              - User completes consent
- Client validates (2–50 chars)         - Supabase returns session
- Passed in user metadata               - Identity metadata extracted
  (display_name & full_name)                    │
      │                                         │
      ▼                                         ▼
[ Supabase Auth User Created ]           [ Supabase Auth User Created ]
      │                                         │
      └────────────────────┬────────────────────┘
                           ▼
                  [ Backend /auth/sync ]
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    [ User Exists in DB? ]     [ User Missing in DB? ]
             │                           │
    ┌────────┴────────┐                  │
   YES                NO                 │
    │                                    ▼
    ▼                           Create User record:
User.displayName != null?       - id = Supabase UUID
    │                           - email = user.email
    ├───────────┐               - displayName = resolved name
   YES          NO                       │
    │            │                       ▼
Preserve    Initialize from       User record active
custom      metadata:
name        User.update({
            displayName })
```

---

## 2. Validation Constraints (Signup Form)
1. **Required**: Rejects undefined, null, or empty inputs.
2. **Whitespace Sanitization**: Trims leading and trailing spaces; rejects inputs that consist entirely of whitespace.
3. **Minimum Length**: Must be at least **2 characters** after trimming.
4. **Maximum Length**: Must not exceed **50 characters**.
5. **No Password/Email Leakage**: Validation failures only describe display name syntax errors.

---

## 3. Metadata Resolution Hierarchy (Google OAuth)
When authenticating via Google, the provider passes varying user metadata schemas. The system applies the following prioritized resolution waterfall:

```javascript
export const resolveGoogleDisplayName = (user) => {
  if (!user) return 'User';
  const meta = user.user_metadata || {};
  return (
    meta.full_name ??
    meta.name ??
    meta.display_name ??
    user.email?.split('@')[0] ??
    'User'
  );
};
```

---

## 4. Preservation of Manually Edited Names
A critical requirement is that returning Google OAuth users do not have their custom in-app display names overwritten on subsequent logins.

### Implementation in `backend/src/middleware/auth.js`:
```javascript
let userRecord = await prisma.user.findUnique({
  where: { id: userId },
});

if (!userRecord) {
  // First login: Create record and initialize display name
  userRecord = await prisma.user.create({
    data: {
      id: userId,
      email: email || `${userId}@user.local`,
      displayName: displayName || "User",
    },
  });
} else if (!userRecord.displayName && displayName) {
  // Subsequent login: ONLY initialize if userRecord.displayName is currently null/empty
  userRecord = await prisma.user.update({
    where: { id: userId },
    data: { displayName },
  });
}
// If userRecord.displayName already exists, it is strictly preserved without modification
```
