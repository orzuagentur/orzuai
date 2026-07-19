export type PasswordRuleStatus = {
  current: number;
  required: number;
  ok: boolean;
};

export type PasswordStrength = {
  letters: PasswordRuleStatus;
  symbols: PasswordRuleStatus;
  digits: PasswordRuleStatus;
  ok: boolean;
};

export const PASSWORD_POLICY = {
  minLetters: 5,
  minSymbols: 3,
  minDigits: 2,
} as const;

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const letters = (password.match(/[A-Za-z]/g) ?? []).length;
  const digits = (password.match(/[0-9]/g) ?? []).length;
  const symbols = (password.match(/[^A-Za-z0-9\s]/g) ?? []).length;

  const result: PasswordStrength = {
    letters: {
      current: letters,
      required: PASSWORD_POLICY.minLetters,
      ok: letters >= PASSWORD_POLICY.minLetters,
    },
    symbols: {
      current: symbols,
      required: PASSWORD_POLICY.minSymbols,
      ok: symbols >= PASSWORD_POLICY.minSymbols,
    },
    digits: {
      current: digits,
      required: PASSWORD_POLICY.minDigits,
      ok: digits >= PASSWORD_POLICY.minDigits,
    },
    ok: false,
  };

  result.ok = result.letters.ok && result.symbols.ok && result.digits.ok;
  return result;
}

export function passwordPolicyMessage(password: string): string | null {
  const strength = evaluatePasswordStrength(password);
  if (strength.ok) return null;
  const missing: string[] = [];
  if (!strength.letters.ok) {
    missing.push(`${strength.letters.required} letters`);
  }
  if (!strength.symbols.ok) {
    missing.push(`${strength.symbols.required} symbols`);
  }
  if (!strength.digits.ok) {
    missing.push(`${strength.digits.required} digits`);
  }
  return `Password needs at least ${missing.join(", ")}.`;
}
