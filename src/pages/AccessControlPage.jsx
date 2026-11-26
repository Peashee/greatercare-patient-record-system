import { Check, Cloud, Database, FileLock2, KeyRound, LayoutDashboard, Minus, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PERMISSION_GROUPS, ROLE_ORDER, ROLES } from "../lib/rbac";
import { Card, PageHeader, RoleBadge } from "../components/ui";

const LAYERS = [
  { icon: KeyRound, title: "Amazon Cognito", text: "Authenticates the user and places them in exactly one group: ADMINS, DOCTORS or PATIENTS. Groups travel as claims inside the signed JWT." },
  { icon: Database, title: "AWS AppSync + DynamoDB", text: "Every query and mutation is checked against per-model rules — group rules for staff, owner rules (patientEmail = token email) for patients." },
  { icon: FileLock2, title: "Amazon S3", text: "Clinical documents live under records/*. Only the ADMINS and DOCTORS identity-pool roles hold IAM permissions on that prefix." },
  { icon: Zap, title: "AWS Lambda", text: "Account provisioning calls Cognito admin APIs from a function only ADMINS can invoke — and the function re-checks the caller's group." },
  { icon: LayoutDashboard, title: "React route guards", text: "The portal hides routes and actions a role can't use, and records denied attempts. This is usability — the server layers above are the boundary." },
];

export default function AccessControlPage() {
  const { role, user } = useAuth();

  return (
    <>
      <PageHeader
        eyebrow="Security model"
        title="Access control"
        description="GreaterCare uses role-based access control (RBAC). Each permission below is enforced in AWS — not just hidden in the interface."
      />

      <section className="card your-access">
        <ShieldCheck size={22} />
        <div>
          <strong>You are signed in as {user?.email}</strong>
          <span>Effective role: <RoleBadge role={role} /> — Cognito groups: <code>{(user?.groups ?? []).join(", ") || "none"}</code></span>
        </div>
      </section>

      <Card title="Permission matrix" eyebrow="Role × capability" padded={false}>
        <div className="table-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th>Capability</th>
                {ROLE_ORDER.map((key) => (
                  <th key={key} className={key === role ? "current-role" : ""}>
                    {ROLES[key].label}
                    {key === role && <small>You</small>}
                  </th>
                ))}
                <th className="hide-sm">Enforced by</th>
              </tr>
            </thead>
            {PERMISSION_GROUPS.map((group) => (
              <tbody key={group.title}>
                <tr className="matrix-group"><td colSpan={ROLE_ORDER.length + 2}>{group.title}</td></tr>
                {group.permissions.map((permission) => (
                  <tr key={permission.key}>
                    <td>
                      <span className="block">{permission.label}</span>
                      <code className="perm-key">{permission.key}</code>
                    </td>
                    {ROLE_ORDER.map((key) => (
                      <td key={key} className={`matrix-cell${key === role ? " current-role" : ""}`}>
                        {permission.roles.includes(key) ? (
                          <span className="matrix-yes" aria-label="Allowed"><Check size={15} /></span>
                        ) : (
                          <span className="matrix-no" aria-label="Denied"><Minus size={15} /></span>
                        )}
                      </td>
                    ))}
                    <td className="hide-sm muted small">{permission.enforcedBy}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Card>

      <Card title="Defence in depth" eyebrow="Where each rule is enforced">
        <ol className="layer-list">
          {LAYERS.map((layer, index) => (
            <li key={layer.title}>
              <span className="layer-index">{index + 1}</span>
              <span className="layer-icon"><layer.icon size={18} /></span>
              <div>
                <strong>{layer.title}</strong>
                <p>{layer.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="muted small"><Cloud size={13} /> Infrastructure is defined as code with AWS Amplify Gen 2 (see <code>amplify/</code>), so these rules are versioned and reviewable.</p>
      </Card>
    </>
  );
}
