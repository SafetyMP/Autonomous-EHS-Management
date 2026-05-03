/** Keys for persisted tenant field-mapping rows (`integration_connector_mapping`). See docs/integration-connector-mapping.md */
export const INTEGRATION_CONNECTOR_KEYS = ["lms_inbound", "hris_inbound"] as const;

export type IntegrationConnectorKey = (typeof INTEGRATION_CONNECTOR_KEYS)[number];
