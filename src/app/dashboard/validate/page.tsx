export default function ValidatePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Validate</h1>
      <p>
        Our Validate module ensures your product data is accurate, complete,
        and compliant before publishing or analysis.
      </p>
      <ul className="list-disc pl-5 space-y-2 mt-2">
        <li>
          Schema validation to ensure required fields and attribute types
          are present and well-formed.
        </li>
        <li>
          Automated business rule checks for pricing, dimensions,
          compatibility, and regulatory compliance (e.g., restricted
          goods).
        </li>
        <li>
          Outlier detection and anomaly flagging using statistical and
          machine learning models to catch suspicious values.
        </li>
        <li>
          Image and media validation, including resolution checks, aspect
          ratio, and presence of watermarks.
        </li>
        <li>
          Guided workflows for manual review and overrides, with version
          control and audit trails.
        </li>
        <li>
          Real‑time API feedback and bulk batch validation to support
          integration with e‑commerce platforms and PIM systems.
        </li>
      </ul>
      <p className="mt-4">
        Use Validate to maintain data integrity and build trust with
        customers across all channels.
      </p>
    </div>
  );
}
