import { describe, it, expect } from 'vitest';
import { isSmtpConfigured, resolveSmtpFromEmail, resolveSmtpSecure } from '../src/utils/smtp';

describe('smtp utils', () => {
  it('uses username when it is an email address', () => {
    expect(resolveSmtpFromEmail('mailer@example.com', 'smtp.example.com')).toBe(
      'mailer@example.com'
    );
  });

  it('derives from address from host when username is not an email', () => {
    expect(resolveSmtpFromEmail('mailer', 'smtp.example.com')).toBe('noreply@example.com');
  });

  it('marks port 465 as secure', () => {
    expect(resolveSmtpSecure(465)).toBe(true);
    expect(resolveSmtpSecure(587)).toBe(false);
  });

  it('checks required SMTP fields', () => {
    expect(
      isSmtpConfigured({
        smtpHost: 'smtp.example.com',
        smtpUser: 'mailer@example.com',
        smtpPasswordConfigured: true,
      })
    ).toBe(true);
  });
});
