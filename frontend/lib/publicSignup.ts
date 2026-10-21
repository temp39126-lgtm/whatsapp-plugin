/** Mirrors backend PUBLIC_USER_SIGNUP_ENABLED (baked at build time in production). */
export function isPublicSignupEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_PUBLIC_USER_SIGNUP_ENABLED;
  if (raw === undefined || raw === '') {
    return false;
  }
  return raw === 'true' || raw === '1';
}
