---
applyTo: '**'
---
# Project Context
This project is a software application. It may use web, backend, or other technologies. The goal is to deliver robust, maintainable, and high-quality code with a focus on usability, security, and performance.

# Coding Guidelines
- **Style:** Follow the dominant style guide for the project's main language (e.g., Airbnb for JS, PEP8 for Python, etc.).
- **Components/Modules:** Use idiomatic patterns (e.g., functional components/hooks for React, modular code for backend, etc.).
- **State/Data:** Use appropriate state or data management for the stack (Redux, Context, ORM, etc.).
- **API/IO:** Use standard libraries or best-practice tools for HTTP, DB, or other IO. Handle errors and loading states.
- **Testing:** Use the project's standard test framework. Target ≥80% coverage.
- **Docs:** Use inline comments/JSDoc/docstrings for functions/components. Update README/docs only if user requests or public contract changes.
- **Version Control:** Use clear branching and concise commit messages.
- **Accessibility:** Follow accessibility best practices for user-facing features.
- **Performance:** Optimize for performance (e.g., lazy loading, memoization, efficient queries).
- **Security:** Validate/sanitize all inputs. Use secure protocols (HTTPS, parameterized queries, etc.).
- **Dependencies:** Keep dependencies updated and remove unused ones.

# Coding Agent Instructions
- **Plan:** List steps, files to change, validation commands, and risks.
- **Code:** Make minimal, focused changes. No unrelated refactors.
- **Validate:** Run tests/lint/build. Paste concise results.
- **Iterate:** Fix and re-validate until all checks pass.
- **Tests:** Every change must have/modify a test. If none exist, add a minimal harness and 1–3 starter tests.
- **Docs:** Only update docs if user requests or public contract changes.
- **Output:** Prefer code, scripts, and correctness. Use minimal comments and headers. Avoid full explanations or README edits unless asked.
- **Secrets:** Never include secrets in code or logs.

## Step-by-Step Coding Workflow
1. **Plan:**  
   - Write a short checklist of steps to solve the task.
   - Identify which files will change and why.
   - List validation commands (test, lint, build).
   - Note any risks (breaking changes, migrations, security).
2. **Execute:**  
   - Make the smallest change that satisfies the plan.
   - Focus only on the requested code path.
3. **Validate:**  
   - Run the listed validation commands.
   - Ensure a test is added or updated for every code change.
   - Paste concise output or summary.
4. **Iterate:**  
   - If any validation fails, fix and repeat until all pass.

> **Note:** Every update must include a relevant test (unit or integration). If no tests exist, add a minimal test harness and at least one starter test to cover the change.

# Local Workflow (fill in as needed)
- **Install:** <BOOTSTRAP_COMMAND_HERE>
- **Build:** <BUILD_COMMAND_HERE>
- **Test:** <UNIT_TEST_COMMAND_HERE>
- **Lint:** <LINT_COMMAND_HERE>
- **Format:** <FORMAT_COMMAND_HERE>
- **Typecheck:** <TYPECHECK_COMMAND_HERE>
- **Run:** <RUN_COMMAND_HERE> at <URL_PORT_HERE>

