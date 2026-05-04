/**
 * Sanitize user input to prevent XSS attacks.
 * Strips HTML tags and trims whitespace.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Check if an email is from a personal domain (not a school/organization).
 */
const PERSONAL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es',
  'yahoo.com', 'yahoo.es', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'protonmail.com', 'proton.me', 'mail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'gmx.es', 'tutanota.com', 'fastmail.com',
];

export function isPersonalEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return PERSONAL_DOMAINS.includes(domain);
}

/**
 * Calculate age from date of birth.
 */
export function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
