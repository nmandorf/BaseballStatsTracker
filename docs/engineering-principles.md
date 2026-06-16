# AGENTS.md

## Core Engineering Principle

Your job is not to write code that looks clever. Your job is to write code that creates fewer problems for the next developer, reviewer, maintainer, support person, and future version of the product.

Good code should reduce surprise.

Before writing or changing code, optimize for:

- Readability under pressure
- Easy debugging
- Clear business meaning
- Safe changes
- Small reviewable diffs
- Explicit boundaries
- Useful errors
- Fewer invalid states
- Tests that prove important behavior

Do not write code to impress. Write code so the next change is easier, safer, and less confusing.

---

## 1. Prefer Early Returns Over Conditional Mazes

### Rule

Remove failure paths early so the main logic stays visible.

Use guard clauses for invalid inputs, missing records, failed permissions, disabled feature flags, and other conditions that stop the function from continuing.

### Why

Deep nesting forces the reader to hold too much state in their head. It hides the real business logic and makes debugging harder during incidents.

### Do

```ts
async function updateUserProfile(userId: string, input: ProfileInput) {
  const user = await getUser(userId);

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (!input.email) {
    throw new ValidationError("Email is required");
  }

  if (!user.canEditProfile) {
    throw new ForbiddenError("User cannot edit profile");
  }

  return saveProfile(user.id, input);
}
```

### Do Not

```ts
async function updateUserProfile(userId: string, input: ProfileInput) {
  const user = await getUser(userId);

  if (user) {
    if (input.email) {
      if (user.canEditProfile) {
        return saveProfile(user.id, input);
      }
    }
  }

  throw new Error("Unable to update profile");
}
```

### Guidance

Nesting is allowed when it represents a real hierarchy, such as tree traversal, parsing, or structured workflows. Do not use nesting just because it was the easiest path while writing.

Ask yourself:

- Can I remove the failure cases first?
- Is the happy path easy to find?
- Would this still be readable after two more conditions are added?

---

## 2. Name the Business Meaning, Not the Technical Accident

### Rule

Use names that describe what the thing means in the product or business, not just what the code technically contains.

Avoid vague names such as:

- `data`
- `result`
- `item`
- `payload`
- `response`
- `temp`
- `obj`
- `value`
- `list`

These names are only acceptable for very small, obvious, local scopes.

### Why

Bad names make the next developer reverse-engineer intent from implementation. Clear names prevent wrong assumptions.

### Do

```ts
const subscription = await getSubscription(subscriptionId);

if (subscription.isBillable) {
  await chargeSubscription(subscription);
}
```

### Do Not

```ts
const result = await getData(id);

if (result.status === "active") {
  await process(result);
}
```

### Guidance

Long names are acceptable when the business rule is specific.

```ts
const usersEligibleForReactivation = await findUsersEligibleForReactivation();
```

Do not make names long for performance. Make names clear when the concept carries business risk.

Ask yourself:

- Does this name explain what matters?
- Would another developer know how to use this safely?
- Does the name hide an important business rule?

---

## 3. Put Boundaries Around External Chaos

### Rule

Do not let systems you do not control define the shape of systems you do control.

External APIs, database rows, webhook payloads, framework request objects, environment variables, and third-party services should be mapped into internal shapes owned by the application.

### Why

APIs change. Fields disappear. Webhooks arrive late. Vendors rename properties. If raw external shapes spread across the codebase, small integration changes become large production risks.

### Do

```ts
function mapBillingCustomer(response: BillingCustomerResponse): Customer {
  return {
    id: response.id,
    name: response.user_name,
    isBillable: response.status === "ACTIVE",
    planName: response.subscription?.plan_name ?? "Free",
  };
}
```

### Do Not

```ts
const userName = response.data.user_name;
const isActive = response.data.status === "ACTIVE";
const plan = response.data.subscription.plan_name;
```

### Guidance

Create adapter, mapper, parser, or normalization functions when external data crosses more than one feature or layer.

Apply this to:

- API responses
- Webhook payloads
- Database rows
- Auth provider objects
- Payment provider objects
- CMS content
- Environment variables
- Framework-specific request/response objects

Ask yourself:

- Is external data leaking into unrelated code?
- If this vendor changes a field name, how many files break?
- Does the rest of the app speak our language or the vendor’s language?

---

## 4. Make Invalid States Hard to Represent

### Rule

Model data honestly. Do not make everything optional just to silence TypeScript or avoid validation.

Use types, schemas, constructors, validation functions, or factories to make invalid states harder to create and easier to catch.

### Why

When impossible states are allowed to exist, every caller must defensively check for nonsense. That creates repetitive bugs and weakens confidence in the codebase.

### Do

```ts
type DraftUser = {
  email: string;
  role: "admin" | "member";
};

type SavedUser = {
  id: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "disabled";
};
```

### Do Not

```ts
type User = {
  id?: string;
  email?: string;
  role?: string;
  status?: string;
};
```

### Better State Modeling Example

```ts
type Payment =
  | { state: "pending"; id: string }
  | { state: "authorized"; id: string; authorizationId: string }
  | { state: "captured"; id: string; receiptId: string }
  | { state: "failed"; id: string; reason: string };

function sendReceipt(payment: Extract<Payment, { state: "captured" }>) {
  return emailReceipt(payment.receiptId);
}
```

### Guidance

A user is not always just a user. A payment is not always just a payment. An order is not always just an order.

Represent important lifecycle states clearly.

Ask yourself:

- Am I making fields optional because they are truly optional or because it is convenient?
- Are two different states being forced into one loose type?
- Can this function receive data it should never be allowed to handle?

---

## 5. Separate Decisions From Actions

### Rule

Separate business decisions from side effects.

Decision logic should be easy to test without calling databases, APIs, payment providers, email services, or framework code.

### Why

When rules are mixed with actions, testing becomes heavy. Heavy tests get skipped. Skipped tests allow business rules to break.

### Do

```ts
function getRefundEligibility(invoice: Invoice): RefundEligibility {
  if (invoice.status !== "paid") {
    return { allowed: false, reason: "Invoice is not paid" };
  }

  if (invoice.refundedAt) {
    return { allowed: false, reason: "Invoice is already refunded" };
  }

  if (invoice.amount <= 0) {
    return { allowed: false, reason: "Invalid refund amount" };
  }

  return { allowed: true };
}

async function refundInvoice(invoiceId: string) {
  const invoice = await getInvoice(invoiceId);
  const eligibility = getRefundEligibility(invoice);

  if (!eligibility.allowed) {
    throw new ValidationError(eligibility.reason);
  }

  await paymentProvider.refund(invoice.paymentId);
  await markInvoiceRefunded(invoice.id);
  await sendRefundEmail(invoice.customerId);
}
```

### Avoid

```ts
async function refundInvoice(invoiceId: string) {
  const invoice = await getInvoice(invoiceId);

  if (invoice.status !== "paid") {
    throw new Error("Invoice cannot be refunded");
  }

  if (invoice.refundedAt) {
    throw new Error("Invoice already refunded");
  }

  if (invoice.amount <= 0) {
    throw new Error("Invalid refund amount");
  }

  await paymentProvider.refund(invoice.paymentId);
  await markInvoiceRefunded(invoice.id);
  await sendRefundEmail(invoice.customerId);
}
```

### Guidance

Separate decisions for:

- Permissions
- Validation
- Pricing
- Refund eligibility
- Feature access
- Retry behavior
- Notification rules
- Workflow transitions
- Scheduling rules

Do not over-abstract tiny logic. But if a decision carries business risk, give it a name and test it.

Ask yourself:

- Can I test this rule without mocking the world?
- Is the decision visible as a named concept?
- Are side effects hiding the rule?

---

## 6. Make Errors Useful to the Next Person

### Rule

Errors must communicate clearly to the right audience: user, frontend, support, logs, and developers.

Use stable error codes for systems and safe messages for humans.

### Why

Vague errors slow debugging. Human text should not be parsed by frontend logic. Logs without context make incidents harder to trace.

### Do

```json
{
  "code": "USER_EMAIL_ALREADY_EXISTS",
  "message": "A user with this email already exists.",
  "details": {
    "field": "email"
  },
  "requestId": "req_8f91a2"
}
```

### Do Not

```json
{
  "message": "Something went wrong"
}
```

### Do Not Parse Human Error Text

```ts
if (error.message.includes("already exists")) {
  showEmailTakenError();
}
```

### Prefer Stable Codes

```ts
if (error.code === "USER_EMAIL_ALREADY_EXISTS") {
  showEmailTakenError();
}
```

### Logging Guidance

Include safe, useful context.

```ts
logger.warn("Refund rejected", {
  invoiceId,
  customerId,
  reason: eligibility.reason,
  requestId,
});
```

Never log:

- Passwords
- Tokens
- API keys
- Secrets
- Payment details
- Sensitive personal data
- Full raw payloads unless explicitly safe and necessary

Ask yourself:

- Would this error help someone debug the issue?
- Is there a stable code for client logic?
- Is the message safe to show?
- Can logs connect this failure to a request or entity?

---

## 7. Optimize for the Diff, Not the Demo

### Rule

Code is not done when it works locally. It is done when the change is understandable, reviewable, testable, and safe to undo.

Keep diffs focused. Do not mix refactors, behavior changes, migrations, UI changes, and bug fixes in one large pull request unless absolutely necessary.

### Why

A working demo can still be dangerous to merge. Messy diffs hide bugs, slow review, and make rollbacks scary.

### Avoid One Giant Change

```md
feat: update billing flow

- refactor invoice service
- rename payment fields
- update refund logic
- change dashboard UI
- add new webhook handler
- modify retry behavior
- fix customer status bug
- update tests
```

### Prefer Focused Changes

```md
PR 1: Rename payment fields without behavior changes
PR 2: Add refund eligibility helper with tests
PR 3: Wire refund eligibility into billing flow
PR 4: Update dashboard UI to show refund reason
PR 5: Add webhook retry behavior
```

### Guidance

Refactoring is good. Hiding behavior changes inside refactors is not.

Before finishing work, ask:

- Can a reviewer understand this diff quickly?
- Are unrelated changes separated?
- Is there a clear rollback path?
- Does the PR title match the actual behavior change?
- Are tests focused on the risky parts?
- Did I document config, migration, or setup changes?

---

## Default Agent Behavior

When working on this codebase, follow these behaviors by default:

1. Prefer simple, boring, obvious code over clever abstractions.
2. Use early returns to keep functions readable.
3. Name variables, functions, files, and types by business meaning.
4. Keep external systems behind adapters, mappers, or service boundaries.
5. Model lifecycle states honestly instead of using loose optional fields everywhere.
6. Separate pure business rules from side effects.
7. Return and log useful structured errors.
8. Keep pull requests and commits small, focused, and reviewable.
9. Avoid changing unrelated code while implementing a feature.
10. Add tests for business rules, edge cases, and failure paths.
11. Do not let framework, vendor, or database details leak through the entire app.
12. Make the next developer guess less.

---

## Code Review Checklist

Before considering a task complete, check the following:

### Readability

- Is the main logic easy to find?
- Are failure paths handled early?
- Is nesting limited and meaningful?
- Can someone understand this under pressure?

### Naming

- Do names describe business meaning?
- Are vague names avoided where business risk exists?
- Would a new developer understand the intent without extra explanation?

### Boundaries

- Are external API shapes mapped into internal types?
- Are database rows kept out of UI/business logic when appropriate?
- Are framework-specific objects prevented from spreading into domain logic?

### State Safety

- Are required fields actually required?
- Are lifecycle states modeled clearly?
- Are impossible states difficult to create?

### Decisions and Actions

- Are business rules separated from side effects when the rule is important?
- Can decision logic be unit tested without heavy mocks?
- Are side effects isolated and easy to identify?

### Errors and Logs

- Do errors include stable codes when clients need to react?
- Are user-facing messages safe and helpful?
- Do logs include safe context and request/entity identifiers?
- Are secrets and sensitive data excluded from logs?

### Diff Quality

- Is the change focused?
- Are refactors separated from behavior changes when possible?
- Are tests included for risky behavior?
- Is the rollback path understandable?

---

## Final Standard

The final goal is not elegant code, flashy code, or code that proves how much the developer knows.

The final goal is code that gives the next developer fewer reasons to guess.

If a change reduces surprise, improves clarity, protects boundaries, makes invalid states harder, improves errors, or makes review safer, it is moving in the right direction.

If a change makes the code more clever but harder to understand, it is probably moving in the wrong direction.
