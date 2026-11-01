/** @param {string} password */
export function passwordRequirements(password) {
  // Count UTF-8 bytes without platform-specific Buffer/TextEncoder dependencies.
  let bytes = 0;
  for (const character of password) {
    const point = character.codePointAt(0) ?? 0;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return [
    {
      id: 'length',
      label: 'At least 12 characters',
      met: password.length >= 12,
    },
    {
      id: 'lowercase',
      label: 'A lowercase letter (a–z)',
      met: /[a-z]/.test(password),
    },
    {
      id: 'uppercase',
      label: 'An uppercase letter (A–Z)',
      met: /[A-Z]/.test(password),
    },
    { id: 'number', label: 'A number (0–9)', met: /[0-9]/.test(password) },
    {
      id: 'symbol',
      label: 'A special symbol (e.g. ! @ #)',
      met: /[\p{P}\p{S}]/u.test(password),
    },
    { id: 'bytes', label: 'No more than 72 UTF-8 bytes', met: bytes <= 72 },
  ];
}
/** @param {string} password */
export function passwordIsValid(password) {
  return passwordRequirements(password).every((rule) => rule.met);
}
/** @param {string} password */
export function passwordProblem(password) {
  const missing = passwordRequirements(password).find((rule) => !rule.met);
  return missing ? `Required: ${missing.label}.` : '';
}
