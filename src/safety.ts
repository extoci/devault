const suspiciousPatterns = [
  /\brm\b/,
  /\bdropdb\b/,
  /\breset\b/,
  /\bprune\b/,
  /\bdestroy\b/,
  /\bdelete\b/,
  /\bmigrate\s+reset\b/
];

export function isSuspiciousCommand(command: string): boolean {
  return suspiciousPatterns.some((pattern) => pattern.test(command));
}
