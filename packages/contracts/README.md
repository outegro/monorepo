# @outegro/contracts

Shared, dependency-light (`zod` only) source of truth for **cross-service event
contracts** and **RabbitMQ topology**. Imported by both backends (publish/consume)
and frontends (types only).

- Every event is an envelope: `{ id, type, occurredAt, version, data }`.
- Schemas are Zod → validate on **both** ends (producer before publish, consumer
  before handling; fail-closed).
- Routing keys / exchanges / queues are constants here, never hard-coded in services.

Service-specific shapes (HTTP request/response DTOs) do **not** belong here — only
contracts shared across service boundaries.
