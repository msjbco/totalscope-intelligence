export function evaluateZctaImportState({ activeVersions, geometryCount, requested }) {
  if (activeVersions.length > 1) {
    throw new Error(`Invalid governed ZCTA state: ${activeVersions.length} active dataset versions exist.`);
  }
  if (activeVersions.length !== 1) return { shortCircuit: false, reason: "no-active-dataset" };

  const active = activeVersions[0];
  if (active.version !== requested.version) return { shortCircuit: false, reason: "different-version" };
  if (active.source_sha256 !== requested.sourceSha256) return { shortCircuit: false, reason: "different-fingerprint" };
  if (active.expected_record_count !== requested.expectedRecordCount) return { shortCircuit: false, reason: "different-expected-count" };
  if (active.imported_record_count !== requested.expectedRecordCount) return { shortCircuit: false, reason: "incomplete-metadata-count" };
  if (geometryCount !== requested.expectedRecordCount) return { shortCircuit: false, reason: "incomplete-geometry-count" };
  return { shortCircuit: true, reason: "exact-active-dataset" };
}
