import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { getEmailAuthErrorMessage } from "./authErrorMessages";

type EmailAuthMode = "login" | "create";

export function EmailPasswordAuthForm() {
  const [mode, setMode] = useState<EmailAuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoginMode = mode === "login";

  async function submitEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setEmailError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setEmailError(null);

    try {
      const auth = getFirebaseAuth();
      if (mode === "login") {
        await auth.signInWithEmailAndPassword(trimmedEmail, password);
      } else {
        await auth.createUserWithEmailAndPassword(trimmedEmail, password);
      }
    } catch (nextError) {
      setEmailError(getEmailAuthErrorMessage(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode: EmailAuthMode) {
    setMode(nextMode);
    setEmailError(null);
  }

  return (
    <form className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4" onSubmit={submitEmailAuth}>
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--surface)] p-1">
          <EmailAuthModeButton active={isLoginMode} label="Log in" onClick={() => switchMode("login")} />
          <EmailAuthModeButton active={!isLoginMode} label="Create account" onClick={() => switchMode("create")} />
        </div>
        <p className="text-sm font-medium text-[var(--muted-foreground)]">
          {isLoginMode
            ? "Use this if you already made an email/password account."
            : "Use this once to make a new email/password account."}
        </p>
      </div>
      <EmailAuthInput icon="mail" label="Email" onChange={setEmail} placeholder="you@example.com" value={email} />
      <EmailAuthInput
        autoComplete={isLoginMode ? "current-password" : "new-password"}
        icon="password"
        label="Password"
        minLength={6}
        onChange={setPassword}
        placeholder={isLoginMode ? "Password" : "At least 6 characters"}
        type="password"
        value={password}
      />
      {emailError ? (
        <div className="rounded-lg border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
          {emailError}
        </div>
      ) : null}
      <button className="btn-base btn-primary min-h-12 px-4 text-sm" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Working..." : isLoginMode ? "Log in with email" : "Create email account"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function EmailAuthModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={cn("btn-base min-h-11 rounded-md px-3 text-sm", active ? "btn-choice-selected" : "btn-choice text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-foreground")}
      aria-pressed={active}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function EmailAuthInput({
  autoComplete = "email",
  icon,
  label,
  minLength,
  onChange,
  placeholder,
  type = "email",
  value,
}: {
  autoComplete?: string;
  icon: "mail" | "password";
  label: string;
  minLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "email" | "password";
  value: string;
}) {
  const Icon = icon === "mail" ? Mail : LockKeyhole;

  return (
    <label className="grid gap-2">
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-[var(--muted-foreground)]">
        <Icon className="size-4 text-[var(--accent)]" aria-hidden="true" />
        {label}
      </span>
      <input
        autoComplete={autoComplete}
        className="min-h-12 rounded-lg border border-[var(--border)] bg-white px-3 text-base font-semibold text-foreground outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
        inputMode={type === "email" ? "email" : undefined}
        minLength={minLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}
