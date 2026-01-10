# Zen Tasks Workflow Context

This project includes the required workflow context files used by the automation tools:

- `prompts/zen_tasks_workflow.md`
- `prompts/base.md`

If the loader reports "Workflow context files not found", it is typically due to:

1. Current working directory is not at the repo root
2. Path resolution differences on Windows vs POSIX
3. Case-sensitivity assumptions in the loader

Recommended steps:

- Ensure the working directory is the repository root before invoking the loader
- Use absolute paths when possible (e.g., `C:\Users\weird\.github\Copilot-Orchestration-Extension-COE-\prompts`)
- Verify the files exist and are readable
- If the loader supports configuration, set the prompts directory explicitly to the absolute path above

Example absolute path (Windows):

```
C:\Users\weird\.github\Copilot-Orchestration-Extension-COE-\prompts
```

Once the loader resolves paths correctly, it will hydrate the workflow context and Zen Tasks operations will work as expected.