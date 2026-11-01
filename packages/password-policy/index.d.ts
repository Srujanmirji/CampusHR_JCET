export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}
export function passwordRequirements(password: string): PasswordRequirement[];
export function passwordIsValid(password: string): boolean;
export function passwordProblem(password: string): string;
