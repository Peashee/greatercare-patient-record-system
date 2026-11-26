/** Turns Cognito errors into friendly, non-enumerating messages. */
export function describeAuthError(error) {
  const name = error?.name ?? "";
  const message = error?.message ?? "";
  if (name === "NotAuthorizedException") {
    if (/disabled/i.test(message)) return "This account has been deactivated. Please contact your administrator.";
    if (/temporary password has expired/i.test(message)) {
      return "Your temporary password has expired. Ask your administrator to resend your invitation.";
    }
    if (/current state/i.test(message)) {
      return "Your account hasn't been activated yet. Sign in with the temporary password from your invitation email.";
    }
    return "Incorrect email or password.";
  }
  if (name === "UserNotFoundException") return "Incorrect email or password.";
  if (name === "InvalidPasswordException") return message.replace(/^Password does not conform to policy: /, "");
  if (name === "CodeMismatchException") return "That verification code is incorrect.";
  if (name === "ExpiredCodeException") return "That verification code has expired. Request a new one.";
  if (name === "LimitExceededException" || name === "TooManyRequestsException") {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (name === "InvalidParameterException" && /no registered\/verified email/i.test(message)) {
    return "Your account hasn't been activated yet. Sign in with the temporary password from your invitation email.";
  }
  return message || "Something went wrong. Please try again.";
}
