export const validateUsername = (raw) => {
  if (raw === undefined || raw === null || typeof raw !== 'string') {
    return { valid: false, error: 'Username is required.' };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Username cannot be empty or whitespace only.' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'Username must be at least 2 characters.' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'Username must not exceed 50 characters.' };
  }
  return { valid: true, value: trimmed };
};

export const validateDisplayName = validateUsername;

export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required.' };
  }
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true, value: trimmed };
};

export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters.' };
  }
  return { valid: true, value: password };
};

export const formatAuthError = (error, context = 'login') => {
  if (!error) return '';
  const msg = (typeof error === 'string' ? error : error.message || '').toLowerCase();

  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid email or password') ||
    msg.includes('wrong password') ||
    msg.includes('user not found') ||
    msg.includes('invalid_grant')
  ) {
    return 'Invalid email or password.';
  }

  if (
    msg.includes('user already registered') ||
    msg.includes('already exists') ||
    msg.includes('duplicate key')
  ) {
    return 'An account with this email already exists. Try signing in.';
  }

  if (
    msg.includes('password should be at least') ||
    msg.includes('weak password') ||
    msg.includes('password is too weak') ||
    msg.includes('auth weak password')
  ) {
    return 'Please choose a stronger password.';
  }

  if (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('connection') ||
    msg.includes('timeout')
  ) {
    return 'Unable to connect. Please check your connection and try again.';
  }

  if (
    msg.includes('unsupported provider') ||
    msg.includes('provider is not enabled') ||
    msg.includes('provider_not_enabled')
  ) {
    return 'Google Sign-In is not enabled in your Supabase project. Please enable the Google provider in your Supabase Dashboard.';
  }

  if (
    msg.includes('oauth') ||
    msg.includes('google') ||
    msg.includes('popup') ||
    msg.includes('cancelled') ||
    msg.includes('access_denied')
  ) {
    return 'Google sign-in could not be completed. Please try again.';
  }

  return context === 'signup'
    ? 'Unable to create account. Please check your details and try again.'
    : 'Invalid email or password.';
};

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
