# UI Intake

## Source

- Provider: Stitch MCP
- Credential handling: API keys and MCP headers stay in local, ignored configuration.
- Tracked source files: none yet

## Scope

- Capture external UI direction so the project manager can add UI review work to the Kanban board.
- Review any generated UI against the approved OpenSpec before implementing product behavior.
- Keep the app mobile-first.

## Constraints

- Do not commit provider API keys or MCP credentials.
- Do not add baseball tracker feature logic until the relevant OpenSpec change is approved.
- Treat generated UI as a design/input artifact until implementation is explicitly scoped.

## Kanban Follow-Up

- Review the UI source and decide which approved screens/components should be implemented.
- Create implementation tasks from approved UI only after the matching OpenSpec change exists.
