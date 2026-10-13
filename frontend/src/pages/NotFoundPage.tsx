import { Link } from "react-router-dom";
import { PageHeading } from "../components/PageHeading";

export function NotFoundPage() {
  return (
    <section>
      <PageHeading eyebrow="PAGE NOT FOUND" title="This page isn’t here" description="The address may be incorrect or the page may have moved." />
      <Link className="primary-button" to="/">Return to dashboard</Link>
    </section>
  );
}
