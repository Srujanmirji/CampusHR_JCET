import { passwordIsValid, passwordProblem } from '@campushr/password-policy';
import { PasswordRequirements } from './PasswordRequirements';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ApiError } from '@/services/api';
import {
  confirmPasswordReset,
  requestPasswordReset,
  passwordResetOptions,
} from '../api/auth';

export function PasswordResetDialog({
  onComplete,
}: {
  onComplete: (email: string) => void;
}) {
  const generation = useRef(0),
    openRef = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null),
    successRef = useRef<HTMLButtonElement>(null),
    passwordRef = useRef<HTMLInputElement>(null),
    repeatRef = useRef<HTMLInputElement>(null);
  const id = useId(),
    codeRef = useRef<HTMLInputElement>(null),
    busyRef = useRef(false);
  const [open, setOpen] = useState(false),
    [enabled, setEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState(''),
    [challenge, setChallenge] = useState(''),
    [code, setCode] = useState('');
  const [password, setPassword] = useState(''),
    [repeat, setRepeat] = useState(''),
    [error, setError] = useState('');
  const [busy, setBusy] = useState(false),
    [seconds, setSeconds] = useState(0);
  const canConfirm =
    /^\d{6}$/.test(code) && passwordIsValid(password) && password === repeat;
  function reset() {
    setStep('email');
    setChallenge('');
    setCode('');
    setPassword('');
    setRepeat('');
    setError('');
    setSeconds(0);
  }
  async function options() {
    const epoch = generation.current;
    setEnabled(null);
    setError('');
    try {
      const result = await passwordResetOptions();
      if (generation.current === epoch && openRef.current)
        setEnabled(result.enabled);
    } catch {
      if (generation.current === epoch && openRef.current) {
        setEnabled(false);
        setError('Could not check email reset availability. Please retry.');
      }
    }
  }
  useEffect(() => {
    if (!open) return;
    let active = true;
    void passwordResetOptions()
      .then((result) => {
        if (active) setEnabled(result.enabled);
      })
      .catch(() => {
        if (active) {
          setEnabled(false);
          setError('Could not check email reset availability. Please retry.');
        }
      });
    return () => {
      active = false;
    };
  }, [open]);
  useEffect(() => {
    if (!open || seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [open, seconds]);
  useEffect(() => {
    if (!open || !enabled) return;
    if (step === 'email') emailRef.current?.focus();
    if (step === 'code') codeRef.current?.focus();
    if (step === 'done') successRef.current?.focus();
  }, [open, enabled, step, challenge]);
  function changeOpen(next: boolean) {
    if (busyRef.current) return;
    generation.current++;
    openRef.current = next;
    setOpen(next);
    if (next) {
      setEnabled(null);
      setError('');
    } else reset();
  }
  async function perform(action: 'request' | 'confirm') {
    if (busyRef.current) return;
    setError('');
    if (
      action === 'request' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      setError('Enter the email registered with CampusHR.');
      return;
    }
    if (
      action === 'confirm' &&
      (!/^\d{6}$/.test(code) ||
        !passwordIsValid(password) ||
        password !== repeat)
    ) {
      (!/^\d{6}$/.test(code)
        ? codeRef
        : !passwordIsValid(password)
          ? passwordRef
          : repeatRef
      ).current?.focus();
      setError(
        !/^\d{6}$/.test(code)
          ? 'Enter the six-digit code.'
          : !passwordIsValid(password)
            ? passwordProblem(password)
            : 'The passwords do not match.',
      );
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      if (action === 'request') {
        const result = await requestPasswordReset(email.trim());
        setEmail(email.trim());
        setChallenge(result.challengeId);
        setSeconds(result.resendAfter);
        setCode('');
        setStep('code');
      } else {
        await confirmPasswordReset({
          challengeId: challenge,
          code,
          newPassword: password,
        });
        setPassword('');
        setRepeat('');
        setCode('');
        setStep('done');
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Something went wrong. Please try again.',
      );
      if (e instanceof ApiError && e.status === 429) setSeconds(60);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="link" type="button">
          Forgot password?
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={!busy}
        className="max-h-dvh overflow-y-auto [&_[data-slot=dialog-close]]:min-h-11 [&_[data-slot=dialog-close]]:min-w-11"
      >
        <DialogHeader>
          <DialogTitle className="pr-11">
            {step === 'done'
              ? 'Password updated'
              : step === 'code'
                ? 'Check your email'
                : 'Reset your password'}
          </DialogTitle>
          <DialogDescription>
            {step === 'done'
              ? 'Use your new password to sign in on the website or mobile app.'
              : step === 'code'
                ? `If ${email} belongs to an active account, a code will arrive shortly. Check your spam folder too. Codes expire after 10 minutes.`
                : 'Enter the email registered with CampusHR to request a six-digit verification code.'}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-foreground">
            {error}
          </p>
        )}
        {step === 'done' ? (
          <Button
            ref={successRef}
            type="button"
            className="min-h-11 bg-foreground text-background hover:bg-foreground/90"
            onClick={() => {
              onComplete(email);
              changeOpen(false);
            }}
          >
            Back to sign in
          </Button>
        ) : enabled === null ? (
          <p role="status" className="text-sm text-muted-foreground">
            Checking email recovery…
          </p>
        ) : !enabled ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Email recovery is temporarily unavailable. Contact the college
              office for account support.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void options()}
            >
              Check again
            </Button>
          </div>
        ) : (
          <form
            noValidate
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void perform(step === 'email' ? 'request' : 'confirm');
            }}
          >
            {step === 'email' ? (
              <Field>
                <FieldLabel htmlFor={id + 'email'}>Registered email</FieldLabel>
                <Input
                  className="min-h-11"
                  ref={emailRef}
                  id={id + 'email'}
                  type="email"
                  autoComplete="email"
                  value={email}
                  maxLength={254}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor={id + 'code'}>
                    Verification code
                  </FieldLabel>
                  <Input
                    className="min-h-11"
                    ref={codeRef}
                    id={id + 'code'}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    disabled={busy}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={id + 'password'}>
                    New password
                  </FieldLabel>
                  <Input
                    className="min-h-11"
                    id={id + 'password'}
                    ref={passwordRef}
                    aria-describedby={id + 'password-help'}
                    aria-invalid={
                      password.length > 0 && !passwordIsValid(password)
                    }
                    type="password"
                    autoComplete="new-password"
                    maxLength={72}
                    value={password}
                    disabled={busy}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                  />
                  <PasswordRequirements
                    password={password}
                    id={id + 'password-help'}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={id + 'repeat'}>
                    Repeat new password
                  </FieldLabel>
                  <Input
                    className="min-h-11"
                    id={id + 'repeat'}
                    ref={repeatRef}
                    aria-describedby={id + 'repeat-help'}
                    aria-invalid={repeat.length > 0 && password !== repeat}
                    type="password"
                    autoComplete="new-password"
                    maxLength={72}
                    value={repeat}
                    disabled={busy}
                    onChange={(e) => {
                      setRepeat(e.target.value);
                      setError('');
                    }}
                  />
                  <p
                    id={id + 'repeat-help'}
                    aria-live="polite"
                    className="text-sm text-foreground"
                  >
                    {repeat.length === 0
                      ? 'Enter the same password again.'
                      : password === repeat
                        ? 'Passwords match.'
                        : 'Passwords do not match yet.'}
                  </p>
                </Field>
              </>
            )}
            <Button
              className="w-full min-h-11 bg-foreground text-background hover:bg-foreground/90"
              type="submit"
              disabled={busy || (step === 'code' && !canConfirm)}
              aria-busy={busy}
            >
              {busy
                ? 'Please wait…'
                : step === 'email'
                  ? 'Send verification code'
                  : 'Update password'}
            </Button>
            {step === 'code' && (
              <div className="flex flex-wrap justify-between gap-2">
                <Button
                  className="min-h-11"
                  variant="ghost"
                  type="button"
                  disabled={busy || seconds > 0}
                  onClick={() => void perform('request')}
                >
                  {seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}
                </Button>
                <Button
                  className="min-h-11"
                  variant="ghost"
                  type="button"
                  disabled={busy}
                  onClick={() => reset()}
                >
                  Use another email
                </Button>
              </div>
            )}
          </form>
        )}
        {step !== 'done' && (
          <a
            className="inline-flex min-h-11 items-center text-sm text-primary underline"
            href="mailto:contactus@jcethbl.edu.in"
          >
            Contact the college office
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
