import { Check, Minus } from 'lucide-react';
import { cn } from 'cn';
import {
  passwordRequirements,
  passwordProblem,
} from '@campushr/password-policy';

export function PasswordRequirements({
  password,
  id,
}: {
  password: string;
  id: string;
}) {
  const rules = passwordRequirements(password);
  return (
    <div id={id} className="space-y-2">
      <p aria-live="polite" className="text-sm text-foreground">
        {password.length > 0 && password.length < 12
          ? `Add ${12 - password.length} more ${password.length === 11 ? 'character' : 'characters'} to reach 12.`
          : password.length === 0
            ? 'Your password needs all of the following.'
            : passwordProblem(password) || 'All password requirements met.'}
      </p>
      <ul aria-label="Password requirements" className="grid gap-1 text-sm">
        {rules.map((rule) => {
          const StatusIcon = rule.met ? Check : Minus;
          return (
            <li
              key={rule.id}
              className={cn(
                'flex items-center gap-2',
                rule.met ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              <StatusIcon className="size-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="sr-only">
                  {rule.met ? 'Met: ' : 'Needed: '}
                </span>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
