import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { supabaseClient } from "../auth/supabaseClient";
import { useAuth } from "../auth/authContext";
import { BrandLogo } from "./BrandLogo";

export function ResetPasswordPage() {
  const { completePasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<string>();
  const [statusKind, setStatusKind] = useState<"error" | "success">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updatePassword() {
    if (!supabaseClient || !password) return;

    setIsSubmitting(true);
    setStatus(undefined);
    setStatusKind("success");

    const { error } = await supabaseClient.auth.updateUser({ password });

    if (error) {
      setStatusKind("error");
      setStatus(error.message);
      setIsSubmitting(false);
      return;
    }

    setStatusKind("success");
    setStatus("Your password has been updated. Redirecting you now...");
    setIsSubmitting(false);
    window.setTimeout(() => completePasswordRecovery(), 700);
  }

  return (
    <div className="ui-product-surface reset-page">
      <a href="#recovery-form" className="skip-link">Skip to password recovery</a>
      <header className="auth-topbar"><BrandLogo className="shell-logo" /><span className="auth-topbar-label">Account recovery</span></header>
      <main id="recovery-form" tabIndex={-1} className="reset-layout"><section className="reset-panel" aria-labelledby="recovery-title"><span className="ui-eyebrow">A fresh start</span><h1 id="recovery-title">Set a new password</h1><p>Choose a new password for your AWS Mastery account.</p>
        <form aria-busy={isSubmitting} onSubmit={event => { event.preventDefault(); void updatePassword(); }}>
          <div className="ui-field"><label htmlFor="new-password">New password</label><div className="ui-input-wrap"><span><LockKeyhole size={18} aria-hidden="true" /></span><input id="new-password" type={showPassword ? "text" : "password"} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your new password" aria-invalid={statusKind === "error" && Boolean(status)} aria-describedby={status ? "recovery-status" : undefined} /><button className="input-visibility" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div></div>
          {status && <p id="recovery-status" className={`ui-message ui-message--${statusKind}`} role={statusKind === "error" ? "alert" : "status"}>{status}</p>}
          <button className="ui-button ui-button--primary" type="submit" disabled={isSubmitting || !supabaseClient || !password}>{isSubmitting ? "Updating..." : "Update password"}<ArrowRight size={16} aria-hidden="true" /></button>
        </form>
        <div className="reset-footnote"><ShieldCheck size={16} aria-hidden="true" />Secure account recovery</div>
      </section></main>
      <footer className="auth-footer"><span>AWS Mastery</span><span>Get back to your learning.</span></footer>
    </div>
  );
}
