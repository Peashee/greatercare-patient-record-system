export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (value) => value.length >= 8 },
  { label: "An uppercase letter", test: (value) => /[A-Z]/.test(value) },
  { label: "A lowercase letter", test: (value) => /[a-z]/.test(value) },
  { label: "A number", test: (value) => /\d/.test(value) },
  { label: "A symbol", test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export function passwordIsValid(value) {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}
