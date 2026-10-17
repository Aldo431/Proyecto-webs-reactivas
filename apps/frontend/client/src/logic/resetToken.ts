const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function isValidResetToken(token: string): boolean {
  return RESET_TOKEN_PATTERN.test(token);
}
