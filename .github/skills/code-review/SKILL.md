---
name: code-review
description: Review pull requests for code quality, architectural compliance, security issues, test coverage, and provide actionable feedback with suggested improvements
---

# Code Review Skill

Conduct comprehensive code reviews on pull requests, evaluating quality, security, architecture, tests, and providing constructive feedback.

## When to Use This Skill

-   Pull request opened for review
-   Code needs quality verification
-   Security review required
-   Architecture compliance check needed
-   Test coverage validation requested

## What This Skill Does

1. **Analyze Changes**: Review diff, understand intent
2. **Check Quality**: Lint, formatting, code smells
3. **Verify Tests**: Coverage, test quality, edge cases
4. **Security Scan**: Vulnerabilities, secrets, unsafe patterns
5. **Architecture**: Pattern compliance, boundary violations
6. **Performance**: Efficiency, scalability concerns
7. **Feedback**: Actionable comments with examples

## Step-by-Step Procedure

### Phase 1: Context Loading

```
1. Read PR title and description
2. Understand what problem is solved
3. Review linked issues (Fixes #X)
4. Check acceptance criteria
5. Read project plan (Docs/Plan/)
6. Understand affected systems
```

### Phase 2: Diff Analysis

```
1. Review files changed
2. Identify:
   - New files created
   - Deleted files
   - Modified files
   - Renamed/moved files

3. Assess scope:
   - Lines added/removed
   - Complexity of changes
   - Number of files touched
   - Multiple domains affected?

4. Check for red flags:
   - Massive PRs (>500 lines)
   - Unrelated changes
   - Config files with secrets
   - Binary files committed
```

### Phase 3: Code Quality Review

```
AUTOMATED CHECKS:
1. Linting passes
2. Type checking passes
3. Formatting correct
4. No console.log/dd()/print() left
5. No commented-out code
6. No TODOs without issues

MANUAL CHECKS:
1. **Naming**: Clear, consistent, descriptive
2. **Functions**: Single responsibility, <50 lines
3. **Complexity**: Cyclomatic complexity <10
4. **Duplication**: DRY principle followed
5. **Error Handling**: All paths covered
6. **Readability**: Self-documenting code

PATTERNS TO AVOID:
- God classes (>300 lines)
- Deep nesting (>3 levels)
- Long parameter lists (>4 params)
- Magic numbers/strings
- Tight coupling
```

### Phase 4: Test Coverage Review

```
1. Check coverage report:
   - Overall % (must be ≥80%)
   - New code % (must be ≥85%)
   - Uncovered lines highlighted

2. Verify test quality:
   - Tests actually test behavior
   - Not just calling functions
   - Edge cases covered
   - Error paths tested
   - Integration tests present

3. Check test organization:
   - Descriptive test names
   - Proper arrange/act/assert
   - No test interdependencies
   - Mock/stub appropriately

4. Run tests locally:
   - All pass
   - No flaky tests
   - Reasonable execution time
```

### Phase 5: Security Review

```
SCAN FOR:
1. **Secrets in code**:
   - API keys
   - Passwords
   - Tokens
   - Private keys

2. **Injection vulnerabilities**:
   - SQL injection (raw queries)
   - XSS (unsanitized output)
   - Command injection (shell_exec)
   - Path traversal

3. **Authentication/Authorization**:
   - Missing auth checks
   - Weak password handling
   - Improper session management
   - Privilege escalation risks

4. **Data exposure**:
   - Sensitive data logged
   - PII in responses
   - Error messages too detailed

5. **Dependencies**:
   - Known CVEs
   - Outdated packages
   - Unnecessary dependencies

TOOLS:
- npm audit / composer audit
- Snyk / Dependabot
- SonarQube / CodeQL
```

### Phase 6: Architecture Compliance

```
1. Load architecture docs (Docs/Plan/)

2. Verify compliance:
   - Follows layered architecture
   - Respects module boundaries
   - No circular dependencies
   - Correct abstraction levels

3. Check patterns:
   - Repository pattern (if used)
   - Service layer separation
   - Controller responsibility
   - Domain model integrity

4. Evaluate decisions:
   - Technology choices justified
   - Trade-offs documented
   - Alternatives considered

RED FLAGS:
- Business logic in controllers
- Database calls in views
- UI code in domain models
- Tight coupling between modules
```

### Phase 7: Performance Review

```
EFFICIENCY CHECKS:
1. **Database queries**:
   - N+1 query problems
   - Missing indexes
   - Unnecessary joins
   - Query in loops

2. **Algorithm complexity**:
   - O(n²) where O(n) possible
   - Unnecessary iterations
   - Inefficient data structures

3. **Caching**:
   - Cache opportunities missed
   - Cache invalidation correct
   - Cache stampede prevention

4. **Resource usage**:
   - Memory leaks
   - File handles closed
   - Connection pooling

SCALABILITY:
- Will this work with 10x load?
- Any hard limits?
- Bottlenecks identified?
```

### Phase 8: Feedback Formulation

```
STRUCTURE:
1. **Approve** if:
   - All checks pass
   - High quality code
   - Well tested
   - No security issues

2. **Request Changes** if:
   - Tests failing
   - Security issues
   - Architecture violations
   - Coverage too low

3. **Comment** if:
   - Minor improvements suggested
   - Questions for clarity
   - Non-blocking issues

TONE:
- Constructive, not critical
- Explain "why", not just "what"
- Suggest solutions
- Acknowledge good work
- Ask questions vs demanding

EXAMPLES:
❌ "This code is bad"
✅ "This function has high complexity (15). Consider extracting the validation logic into a separate function."

❌ "Missing tests"
✅ "Could you add a test for the edge case where the user input is null? This would improve coverage and prevent future regressions."

❌ "Fix this"
✅ "This creates an N+1 query problem. Consider using eager loading: \`User::with('posts')\`"
```

## Expected Input

**Pull Request**:

```markdown
Title: Fix: Resolve authentication bug (#42)

## Description

Fixes issue where users couldn't log in after password reset.

## Changes

-   Added null check in AuthController
-   Fixed session creation logic
-   Added unit tests for edge cases

## Testing

-   All tests pass (125/125)
-   Coverage: 87% (+3%)
-   Manual testing: Login works correctly

Fixes #502
```

## Expected Output

**Approval Review**:

```markdown
## Code Review ✅ Approved

Great work fixing this critical bug! The implementation is clean and well-tested.

### Strengths

-   ✅ Proper null checking added
-   ✅ Excellent test coverage (+3%)
-   ✅ Clear error messages
-   ✅ Follows existing patterns

### Minor Suggestions (Non-blocking)

**File: AuthController.php (line 45)**
Consider extracting this validation logic into a separate validator class for reusability:
\`\`\`php
// Current
if (!$user || !Hash::check($password, $user->password)) {
return response()->json(['error' => 'Invalid credentials'], 401);
}

// Suggested
$validator = new AuthValidator();
if (!$validator->validateCredentials($user, $password)) {
return $validator->getErrorResponse();
}
\`\`\`

This would make the controller thinner and the validation testable independently.

**File: tests/AuthControllerTest.php (line 23)**
Nice edge case coverage! Consider also testing:

-   Login with locked account
-   Login with expired password
-   Concurrent login attempts (race condition)

### Approval Checklist

-   [x] Code quality excellent
-   [x] Tests comprehensive
-   [x] No security issues
-   [x] Architecture compliant
-   [x] Documentation updated
-   [x] Ready to merge

**Status**: Approved - Ready to merge after CI passes
```

**Request Changes Review**:

```markdown
## Code Review ⚠️ Changes Requested

Thank you for the PR! The core fix looks good, but there are some issues that need to be addressed before merging.

### Critical Issues

**1. Security: Hardcoded API Key (line 67)**
\`\`\`php
// ❌ Do not hardcode secrets
$apiKey = "sk_live_abc123def456";

// ✅ Use environment variables
$apiKey = env('STRIPE_API_KEY');
\`\`\`
**Action**: Move API key to .env and .env.example

**2. Test Failure: Missing Assertion**
Test `testUserLogin()` has no assertions - it's not actually testing anything.
\`\`\`php
// ❌ Empty test
public function testUserLogin() {
$response = $this->post('/login', ['email' => 'test@example.com']);
// Missing assertion!
}

// ✅ Add assertion
public function testUserLogin() {
$response = $this->post('/login', ['email' => 'test@example.com']);
$response->assertStatus(200);
$this->assertAuthenticated();
}
\`\`\`

**3. N+1 Query Problem (line 89)**
Loading users in a loop creates an N+1 query issue.
\`\`\`php
// ❌ N+1 queries
foreach ($userIds as $id) {
  $user = User::find($id); // Database query in loop
}

// ✅ Use whereIn
$users = User::whereIn('id', $userIds)->get();
\`\`\`

### Non-Critical Improvements

**File: UserService.php (line 34)**
Consider adding type hints for better IDE support:
\`\`\`php
// Before
public function getUser($id)

// After
public function getUser(int $id): ?User
\`\`\`

### Checklist

-   [ ] Remove hardcoded API key
-   [ ] Fix test assertions
-   [ ] Resolve N+1 query
-   [ ] Add type hints (optional)
-   [ ] Re-run tests

Please make these changes and request re-review when ready. Happy to help if you have questions!
```

## Integration with Other Skills

-   **Testing**: Uses [test-generation](./test-generation/SKILL.md) for coverage
-   **Architecture**: Consults [architecture-design](./architecture-design/SKILL.md)
-   **Security**: References security best practices

## Review Checklist Template

```markdown
## Code Review Checklist

### Code Quality

-   [ ] Naming clear and consistent
-   [ ] Functions focused (single responsibility)
-   [ ] Complexity reasonable (<10)
-   [ ] No code duplication
-   [ ] Error handling complete
-   [ ] Code readable and self-documenting

### Tests

-   [ ] Coverage ≥80%
-   [ ] New code coverage ≥85%
-   [ ] Tests actually test behavior
-   [ ] Edge cases covered
-   [ ] Integration tests present

### Security

-   [ ] No secrets in code
-   [ ] No injection vulnerabilities
-   [ ] Auth/authz checks present
-   [ ] Sensitive data protected
-   [ ] Dependencies up to date

### Architecture

-   [ ] Follows project patterns
-   [ ] Respects module boundaries
-   [ ] No circular dependencies
-   [ ] Proper abstraction layers

### Performance

-   [ ] No N+1 queries
-   [ ] Efficient algorithms
-   [ ] Caching where appropriate
-   [ ] Resources properly managed

### Documentation

-   [ ] Code comments where needed
-   [ ] README updated if needed
-   [ ] API docs updated
-   [ ] Breaking changes documented
```

## References

-   `.github/PULL_REQUEST_TEMPLATE.md` - PR template
-   `Docs/Plan/detailed project description` - Architecture
-   [Google Engineering Practices - Code Review](https://google.github.io/eng-practices/review/)
