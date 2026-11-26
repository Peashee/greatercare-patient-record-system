import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { confirmSignIn, signIn, signOut } from "aws-amplify/auth";
import { ArrowRight, Check, Info, KeyRound, Loader2, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { audit } from "../../lib/audit";
import { PasswordInput, PasswordStrength } from "../../components/ui/PasswordField";
import { passwordIsValid } from "../../lib/password";
import AuthLayout from "./AuthLayout";
import { describeAuthError } from "./authErrors";

function Stepper({ current }) {
  const steps = ["Invitation received", "Create password", "Enter portal"];
  return (
    <ol className="auth-stepper">
      {steps.map((label, index) => (
        <li key={label} className={index < current ? "done" : index === current ? "current" : ""}>
          <span>{index < current ? <Check size={12} /> : index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export default function LoginPage() {
  const { reload } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState("signIn");
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const notice = location.state?.notice;

  async function finishSignIn(action, summary) {
    await reload({ forceRefresh: true });
    await audit(action, "AUTH", summary);
  }

  async function handleNextStep(nextStep) {
    switch (nextStep.signInStep) {
      case "DONE":
        await finishSignIn("SIGN_IN", "Signed in to the portal");
        break;
      case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
        setStep("newPassword");
        break;
      case "RESET_PASSWORD":
        navigate("/forgot-password", { state: { email, forced: true } });
        break;
      default:
        throw new Error(`This sign-in step (${nextStep.signInStep}) isn't supported yet.`);
    }
  }

  async function submitSignIn(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { nextStep } = await signIn({ username: email.trim().toLowerCase(), password });
      await handleNextStep(nextStep);
    } catch (signInError) {
      if (signInError.name === "UserAlreadyAuthenticatedException") {
        await signOut();
        setError("A previous session was still active and has been closed. Please sign in again.");
      } else {
        setError(describeAuthError(signInError));
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword(event) {
    event.preventDefault();
    if (!passwordIsValid(newPassword)) {
      setError("Your new password doesn't meet all of the requirements yet.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { nextStep } = await confirmSignIn({ challengeResponse: newPassword });
      if (nextStep.signInStep === "DONE") {
        await finishSignIn("ACCOUNT_ACTIVATED", "Activated account and set a personal password");
      } else {
        await handleNextStep(nextStep);
      }
    } catch (confirmError) {
      setError(describeAuthError(confirmError));
    } finally {
      setBusy(false);
    }
  }

  if (step === "newPassword") {
    return (
      <AuthLayout>
        <Stepper current={1} />
        <div className="auth-heading">
          <span className="auth-heading-icon"><KeyRound size={20} /></span>
          <h2>Create your password</h2>
          <p>
            Welcome to GreaterCare. Replace the temporary password from your invitation with a private password only you know.
          </p>
        </div>
        <form className="auth-form" onSubmit={submitNewPassword} noValidate>
          <div className="auth-identity">
            <Mail size={15} /> {email}
          </div>
          <label className="field">
            <span className="field-label">New password</span>
            <PasswordInput value={newPassword} onChange={setNewPassword} placeholder="Create a strong password" autoComplete="new-password" autoFocus />
          </label>
          <PasswordStrength value={newPassword} />
          <label className="field">
            <span className="field-label">Confirm password</span>
            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter your password" autoComplete="new-password" />
          </label>
          {confirmPassword && newPassword !== confirmPassword && <small className="field-error">Passwords don't match yet.</small>}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : null}
            {busy ? "Activating your account…" : "Activate account"}
            {!busy && <ArrowRight size={18} />}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-heading">
        <span className="auth-eyebrow">Care portal</span>
        <h2>Welcome back</h2>
        <p>Sign in with the email address your GreaterCare administrator registered for you.</p>
      </div>
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      <form className="auth-form" onSubmit={submitSignIn}>
        <label className="field">
          <span className="field-label">Email address</span>
          <div className="input-with-icon">
            <Mail size={17} className="input-icon" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@greatercare.health"
              autoComplete="username"
              autoFocus
              required
            />
          </div>
        </label>
        <label className="field">
          <span className="field-label field-label-row">
            Password
            <Link to="/forgot-password" state={{ email }} className="text-link">Forgot password?</Link>
          </span>
          <PasswordInput value={password} onChange={setPassword} />
        </label>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : null}
          {busy ? "Verifying…" : "Sign in"}
          {!busy && <ArrowRight size={18} />}
        </button>
      </form>
      <div className="auth-callout">
        <Info size={17} />
        <div>
          <strong>First time here?</strong>
          <p>
            Accounts are created by your administrator. Use the temporary password from your <em>“Welcome to GreaterCare”</em> email — you'll set your own password right after.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
