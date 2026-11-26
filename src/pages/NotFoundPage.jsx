import { Link } from "react-router";
import { Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="status-page">
      <span className="status-code"><Compass size={30} /></span>
      <div className="eyebrow">404 · Not found</div>
      <h1>We couldn't find that page</h1>
      <p>The link may be outdated, or the page may have moved.</p>
      <div className="status-actions">
        <Link className="btn btn-primary" to="/">Back to overview</Link>
      </div>
    </div>
  );
}
