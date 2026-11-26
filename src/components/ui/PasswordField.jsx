import { useState } from "react";
import { Check, Eye, EyeOff, Lock } from "lucide-react";
import { PASSWORD_RULES } from "../../lib/password";

export function PasswordInput({ id, value, onChange, placeholder = "Enter your password", autoComplete = "current-password", autoFocus }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-with-icon">
      <Lock size={17} className="input-icon" />
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
      />
      <button
        type="button"
        className="input-action"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export function PasswordStrength({ value }) {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  const level = value ? Math.ceil((passed / PASSWORD_RULES.length) * 4) : 0;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  return (
    <div className="password-strength">
      <div className="strength-meter" data-level={level}>
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={step <= level ? "filled" : ""} />
        ))}
        <small>{labels[level]}</small>
      </div>
      <ul className="password-rules">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li key={rule.label} className={ok ? "rule-ok" : ""}>
              <Check size={13} /> {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
