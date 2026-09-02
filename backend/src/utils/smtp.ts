export function resolveSmtpSecure(port: number): boolean {
  return port === 465;
}

export function resolveSmtpFromEmail(smtpUser: string, smtpHost: string): string {
  const user = smtpUser.trim();
  if (user.includes('@')) {
    return user;
  }

  const host = smtpHost.trim().replace(/^smtp\./i, '');
  if (host) {
    return `noreply@${host}`;
  }

  return 'noreply@localhost';
}

export function isSmtpConfigured(input: {
  smtpHost?: string;
  smtpUser?: string;
  smtpPassword?: string;
  smtpPasswordConfigured?: boolean;
}): boolean {
  return Boolean(
    input.smtpHost?.trim() &&
      input.smtpUser?.trim() &&
      (input.smtpPassword?.trim() || input.smtpPasswordConfigured)
  );
}
