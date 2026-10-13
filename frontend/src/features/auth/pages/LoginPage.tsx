import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { usePreviewSession } from '../hooks/usePreviewSession';

const loginSchema = z.object({
  identity: z.string().trim().min(1, 'Enter your employee ID or email.'),
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean(),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const session = usePreviewSession();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identity: 'HR001',
      password: 'campushr-demo',
      remember: false,
    },
  });
  if (session.signedIn) return <Navigate to="/dashboard" replace />;
  const submit = handleSubmit(async ({ remember }) => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    session.login(remember);
    navigate('/dashboard', { replace: true });
  });
  return (
    <main className="login-page">
      <section className="login-story" aria-label="JCET campus">
        <div className="login-institution">
          <img
            src="/assets/jcet-logo.png"
            alt="JGI — JCET institutional logo"
            width="56"
            height="56"
          />
          <div>
            <p>
              Jain College of Engineering
              <br />
              and Technology
            </p>
            <span>Hubballi, Karnataka</span>
          </div>
        </div>
        <div className="login-story-copy">
          <h2>
            People at the heart
            <br />
            of our campus.
          </h2>
          <p>
            A connected workspace for the people
            <br className="hidden xl:block" /> who make academic excellence
            possible.
          </p>
        </div>
        <div className="login-campus">
          <img
            src="/assets/jcet-campus.png"
            alt="JCET Hubballi campus architectural visual"
            width="656"
            height="305"
          />
          <div>
            <span>OUR CAMPUS. OUR PEOPLE.</span>
            <p>One institution. One connected team.</p>
          </div>
        </div>
        <div className="login-story-footer">
          <span>JCET HUBBALLI</span>
          <span>Established 2017 · CET E265</span>
        </div>
      </section>
      <section className="login-form-panel" aria-label="CampusHR login">
        <div className="login-mobile-brand">
          <img
            src="/assets/jcet-logo.png"
            width="44"
            height="44"
            alt="JCET institutional logo"
          />
          <span>JCET Hubballi</span>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="login-form-content"
        >
          <div className="login-brand">
            <span className="brand-symbol" aria-hidden="true">
              <ShieldCheck />
            </span>
            <span>
              Campus<span className="brand-hr">HR</span>
            </span>
          </div>
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-primary">
              Welcome back
            </h1>
            <p className="text-base text-muted-foreground">
              Sign in to your campus workspace.
            </p>
          </header>
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <FieldGroup>
              <Field data-invalid={Boolean(errors.identity)}>
                <FieldLabel htmlFor="identity">
                  Faculty / Employee ID or Email
                </FieldLabel>
                <Input
                  id="identity"
                  autoComplete="username"
                  placeholder="e.g. HR001 or name@jcethbl.edu.in"
                  aria-invalid={Boolean(errors.identity)}
                  aria-describedby={
                    errors.identity ? 'identity-error' : undefined
                  }
                  {...register('identity')}
                />
                {errors.identity && (
                  <FieldError id="identity-error">
                    {errors.identity.message}
                  </FieldError>
                )}
              </Field>
              <Field data-invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? 'password-error' : undefined
                    }
                    {...register('password')}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      aria-pressed={showPassword}
                      size="icon-sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                {errors.password && (
                  <FieldError id="password-error">
                    {errors.password.message}
                  </FieldError>
                )}
              </Field>
            </FieldGroup>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="remember-control" htmlFor="remember">
                <input
                  id="remember"
                  type="checkbox"
                  {...register('remember')}
                />
                Remember me
              </label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" type="button">
                    Forgot password?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Password assistance</DialogTitle>
                    <DialogDescription>
                      Contact the HR office at JCET to reset your CampusHR
                      password.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
            <Button
              type="submit"
              variant="accent"
              disabled={isSubmitting}
              className="w-full"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle
                  className="animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <LockKeyhole data-icon="inline-start" />
              )}
              {isSubmitting ? 'Opening your workspace…' : 'Login'}
              {!isSubmitting && <ArrowRight data-icon="inline-end" />}
            </Button>
          </form>
        </motion.div>
        <footer className="login-form-footer">
          Jain College of Engineering and Technology, Hubballi
          <br />
          <span>CampusHR</span>
        </footer>
      </section>
    </main>
  );
}
