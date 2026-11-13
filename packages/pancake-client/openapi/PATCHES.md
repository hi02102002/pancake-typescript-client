# OpenAPI generation patches

The pinned `openapi.yaml` is kept byte-for-byte as downloaded from the official
REST specification. The webhook companion specification is intentionally not
included.

- Source: `https://developer.pancake.biz/openapi/openapi.yaml`
- Retrieved: 2026-11-13
- SHA-256: `27a1429933efba4ccfd1f776ab24ef9209a7b94a85195f879ea90003aa372b26`

Before type generation, `scripts/generate-schema.ts` applies one narrowly scoped
in-memory patch:

- Six WhatsApp template parameter schemas contain `properties: { type: object }`
  in YAML form. OpenAPI requires every value below `properties` to be a Schema
  Object or boolean, so `type` cannot itself have the scalar value `object` there.
  These schemas describe dynamic parameter names in their examples. The invalid
  `properties` block is therefore replaced with `additionalProperties: true`,
  preserving the documented open-ended map shape without inventing value types.

Generation fails if the expected six occurrences change, forcing this patch to
be reviewed whenever the upstream schema is refreshed.
