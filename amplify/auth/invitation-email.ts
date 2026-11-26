/**
 * Branded HTML invitation sent by Cognito when an administrator provisions an
 * account. Cognito substitutes the `{username}` and `{####}` placeholders.
 *
 * Email clients have poor CSS support, so everything is inline and table based.
 */
const PORTAL_URL = process.env.GREATERCARE_PORTAL_URL ?? 'http://localhost:5173';

export function invitationEmail(username: string, temporaryPassword: string): string {
  return `
<div style="margin:0;padding:32px 12px;background:#eef4f1;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1d3434">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dce8e3">
    <tr>
      <td style="background:#14564d;padding:28px 36px;color:#ffffff">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:38px;height:38px;background:#ffffff;border-radius:11px;text-align:center;font-weight:800;font-size:20px;color:#14564d">G</td>
          <td style="padding-left:12px;font-size:20px;font-weight:700;letter-spacing:-0.3px">GreaterCare</td>
        </tr></table>
        <p style="margin:26px 0 0;font-size:24px;line-height:1.3;font-weight:700">Your GreaterCare account is ready</p>
        <p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:#cfe7e0">An administrator has provisioned secure access to the GreaterCare care portal for you.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 36px 8px">
        <p style="margin:0 0 18px;font-size:15px;line-height:1.6">Use the credentials below to sign in for the first time. You will be asked to choose your own password straight away.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8f6;border-radius:12px;border:1px solid #e1ebe7">
          <tr><td style="padding:16px 20px 6px;font-size:12px;letter-spacing:1px;color:#6b8580;font-weight:700">SIGN-IN EMAIL</td></tr>
          <tr><td style="padding:0 20px 14px;font-size:16px;font-weight:600">${username}</td></tr>
          <tr><td style="padding:6px 20px 6px;font-size:12px;letter-spacing:1px;color:#6b8580;font-weight:700;border-top:1px solid #e1ebe7">TEMPORARY PASSWORD</td></tr>
          <tr><td style="padding:0 20px 16px;font-size:18px;font-weight:700;font-family:Consolas,Menlo,monospace;letter-spacing:1px">${temporaryPassword}</td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0">
          <tr><td style="background:#1f7a6c;border-radius:10px">
            <a href="${PORTAL_URL}/login" style="display:inline-block;padding:14px 26px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px">Sign in to GreaterCare &rarr;</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#5d7571">This temporary password expires in 7 days. If it expires, ask your administrator to resend your invitation.</p>
        <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#5d7571">Never share your password. GreaterCare staff will never ask you for it.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 36px;background:#f7faf9;border-top:1px solid #e6eeeb;font-size:12px;color:#7c918d;line-height:1.5">
        You received this email because an account was created for you on GreaterCare. If you were not expecting it, you can safely ignore this message.
      </td>
    </tr>
  </table>
</div>`.trim();
}
