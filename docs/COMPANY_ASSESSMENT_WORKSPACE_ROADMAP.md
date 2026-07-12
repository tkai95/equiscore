# Company Assessment Workspace — Roadmap

The Company Assessment Workspace is the partner-facing assessment product plus
the internal EquiScore admin layer that controls partner setup, access and
usage. It is intentionally separate from the consumer Trust Portfolio app.

## Surfaces

- **Consumer:** `dev.equiscore.app` for now, later `equiscore.app`. Consumers
  build a Trust Portfolio, connect evidence and complete partner assessment
  requests.
- **Partner:** `partners.equiscore.app/o/[organisation]`. Partner users review
  cases, create applicant requests, manage policies and view usage for only
  their organisation.
- **Internal admin:** `admin.equiscore.app`. EquiScore operators create partner
  organisations, invite partner members, manage internal admin access and
  monitor platform-wide usage/support signals.

## Shipped

- Partner organisation foundation: isolated organisations, members,
  invitations, usage events and audit trail.
- Internal admin foundation: bootstrap owner, internal admin invitations,
  partner organisation creation and partner-user invites.
- Applicant request flow: partner creates a request, applicant completes the
  consumer onboarding flow, returns to the request and grants consent to deliver
  an assessment snapshot.
- Domain separation: partner request/onboarding paths redirect to the consumer
  app; browser API calls use same-origin proxying; public share links render
  from server-side backend fetches.
- Access enforcement: admin endpoints require active internal-admin access;
  partner endpoints require active organisation membership.

## Active Roadmap

### 1. Access Clarity And Blocked States

Authentication and authorisation need to feel distinct:

- Clerk login proves the email/user.
- Internal admin access is granted only by bootstrap env or internal-admin
  invitation.
- Partner access is granted only by an organisation invitation/membership.
- Consumer access remains open self-serve.

Build:

- Admin shell-level "access required" screen for authenticated but unauthorised
  users.
- Partner workspace no-access states for uninvited users and wrong-organisation
  links.
- Copy that explains "you are signed in, but this email has not been invited".
- Switch-account action everywhere a user may have signed in with the wrong
  Google account.

### 2. Invite Acceptance And Email Delivery

- Send real invite emails for internal admin and partner organisation invites.
- Include signed invite links and clear expiry/reinvite handling.
- Show accepted/expired/revoked invite states consistently.
- Add resend and revoke actions in admin.

### 3. Partner Team Management

- Partner owners/admins can invite, suspend and remove members within their own
  organisation.
- Role-based UI for owner/admin/reviewer/billing/auditor.
- Audit every membership and role change.

### 4. Assessment Case Review Depth

- Case detail view with applicant snapshot, criteria results, evidence summary,
  notes, decision and audit trail.
- Manual decision/status controls.
- Missing-information flow back to the applicant.

### 5. Policy Builder

- Partner policy versions for rental, utilities, telecom, lending and other
  assessments.
- Draft/approve/activate lifecycle.
- Criteria configuration and preview against delivered snapshots.

### 6. Billing And Usage Operations

- Usage allowance, overage and manual credit adjustment flows.
- Exportable usage ledger.
- Admin billing view per partner.
