## Context

The project-manager script inspects committed repo files and proposes ClickUp Kanban operations. It currently reports app, Prisma, domain, and workflow scaffold signals, then creates roadmap tasks from static planned work.

The user provided a Stitch MCP configuration and API key for UI work. That key must remain local and must not be written into tracked source. The tracked project can safely document and detect a non-secret UI intake artifact instead.

## Goals / Non-Goals

**Goals:**
- Add a repo signal that indicates UI source/intake material exists.
- Add a Kanban-ready roadmap item for integrating approved UI into the app.
- Keep dry-run, duplicate detection, and complete-task behavior stable.
- Keep secrets out of tracked files.

**Non-Goals:**
- Do not call Stitch MCP from the project-manager script.
- Do not commit MCP API keys or generated-provider credentials.
- Do not implement baseball tracker product feature logic.
- Do not change ClickUp API behavior beyond the existing task creation/update flow.

## Decisions

- Use a tracked `docs/ui-intake.md` artifact as the UI signal. This makes the signal reviewable, source-controlled, and safe to scan without depending on local MCP configuration.
- Add `hasUiIntakeArtifact` to `inspectProject`. This keeps the project overview and planned-work completion model consistent with existing signals.
- Add a planned-work item named `Review and add approved UI to the app`. It stays incomplete until `docs/ui-intake.md` exists, and it can be created on the Kanban board like the other roadmap items.
- Keep local MCP credentials outside tracked project files. If a future task needs live Stitch access, configure it in the agent environment or ignored local config rather than in source.

## Risks / Trade-offs

- UI intake content could be too vague to implement later. Mitigation: include a short template that names source, scope, constraints, and follow-up tasks.
- The Kanban board may receive the UI review task before the UI is approved for product implementation. Mitigation: word the task as review/intake rather than direct product feature implementation.
- Local MCP setup cannot be verified from committed files. Mitigation: keep source changes provider-neutral and avoid storing secrets.
