import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { confirmResetPassword, resetPassword } from "aws-amplify/auth";
import { ArrowLeft, ArrowRight, Hash, Loader2, Mail, MailCheck } from "lucide-react";
import { PasswordInput, PasswordStrength } from "../../components/ui/PasswordField";
import { passwordIsValid } from "../../lib/password";
import AuthLayout from "./AuthLayout";
import { describeAuthError } from "./authErrors";

export default function ForgotPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const output = await resetPassword({ username: email.trim().toLowerCase() });
      setDestination(output.nextStep.codeDeliveryDetails?.destination ?? email);
      setStep("confirm");
    } catch (requestError) {
      setError(describeAuthError(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset(event) {
    event.preventDefault();
    if (!passwordIsValid(password)) {
      setError("Your new password doesn't meet all of the requirements yet.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmResetPassword({
        username: email.trim().toLowerCase(),
        confirmationCode: code.trim(),
        newPassword: password,
      });
      navigate("/login", { state: { email, notice: "Password updated. Sign in with your new password." } });
    } catch (confirmError) {
      setError(describeAuthError(confirmError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <Link to="/login" className="back-link"><ArrowLeft size={16} /> Back to sign in</Link>
      {step === "request" ? (
        <>
          <div className="auth-heading">
            <span className="auth-heading-icon"><Mail size={20} /></span>
            <h2>{location.state?.forced ? "Password reset required" : "Reset your password"}</h2>
            <p>Enter your account email and we'll send you a 6-digit verification code.</p>
          </div>
          <form className="auth-form" onSubmit={requestCode}>
            <label className="field">
              <span className="field-label">Email address</span>
              <div className="input-with-icon">
                <Mail size={17} className="input-icon" />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@greatercare.health" autoComplete="username" autoFocus required />
              </div>
            </label>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
              {busy && <Loader2 className="spin" size={18} />}
              {busy ? "Sending code…" : "Send verification code"}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="auth-heading">
            <span className="auth-heading-icon"><MailCheck size={20} /></span>
            <h2>Check your inbox</h2>
            <p>We sent a verification code to <strong>{destination}</strong>. Enter it below with your new password.</p>
          </div>
          <form className="auth-form" onSubmit={confirmReset} noValidate>
            <label className="field">
              <span className="field-label">Verification code</span>
              <div className="input-with-icon">
                <Hash size={17} className="input-icon" />
                <input className="code-input" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} placeholder="123456" autoComplete="one-time-code" maxLength={8} autoFocus required />
              </div>
            </label>
            <label className="field">
              <span className="field-label">New password</span>
              <PasswordInput value={password} onChange={setPassword} placeholder="Create a strong password" autoComplete="new-password" />
            </label>
            <PasswordStrength value={password} />
            <label className="field">
              <span className="field-label">Confirm password</span>
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter your password" autoComplete="new-password" />
            </label>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
              {busy && <Loader2 className="spin" size={18} />}
              {busy ? "Updating password…" : "Update password"}
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => requestCode()} disabled={busy}>
              Didn't get it? Resend code
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
