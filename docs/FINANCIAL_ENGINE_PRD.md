# PRD: EquiScore Bank Statement Analysis Engine — Audit, Financial Interpretation & Reliability Upgrade

**Product:** EquiScore
**Area:** Bank Statement Analysis / Financial Profile / Trust Score
**Status:** Proposed (north-star architecture)
**Priority:** Critical foundation
**Objective:** Upgrade the existing bank-statement engine from transaction extraction and categorisation into a reliable, auditable financial-behaviour interpretation system.

> **Note:** This document is the long-term reference architecture. The immediate milestone (§72-style fixes) is tracked separately and should not attempt to build all of this at once. Short-term fixes must not hard-code assumptions that have to be unwound during Phase 1.

---

# 1. Executive Summary

EquiScore's current bank-statement engine has established a promising technical foundation:

* transaction extraction works on the tested Wise statement;
* statement balances reconcile;
* transaction provenance is persisted;
* stored transaction categories now flow into downstream analysis;
* rent, salary and several other categories can be identified;
* the system already contains early mechanisms for asking users clarification questions.

However, the current engine still conflates several fundamentally different tasks:

1. extracting facts from a statement;
2. categorising transactions;
3. recognising recurring behaviour;
4. identifying relationships between accounts/entities;
5. interpreting financial meaning;
6. determining affordability and commitments;
7. deciding what should affect the EquiScore Trust Score.

That creates architectural failure modes.

For example, the previous implementation persisted a transaction as `rent_payment`, but downstream analysis ignored the stored category and reclassified the description using regex, causing real rent to disappear from the financial profile.

After that was corrected, the tested statement contained:

* 617 transactions;
* 0 duplicate external transaction IDs;
* balances and provenance for all 617;
* exact statement reconciliation;
* 10 detected rent payments;
* 21 salary transactions;
* 6 loan repayments.

This demonstrates that **extraction quality is becoming stronger than interpretation quality**.

The next version of the engine must therefore move from:

> Extract → Categorise → Score

to:

> Extract → Validate → Enrich → Detect relationships → Detect behaviours → Resolve ambiguity → Build financial model → Derive assessment → Score

The objective is not simply to categorise transactions more accurately.

The objective is to build the most accurate financial representation EquiScore can reasonably derive from the evidence available while:

* knowing what it knows;
* knowing what it does not know;
* asking the user when only the user can resolve ambiguity;
* never inventing certainty;
* maintaining complete evidence and provenance;
* preventing double counting;
* separating cash flow from expenditure and debt servicing;
* ensuring every important assessment can be explained and reproduced.

---

# 2. Problem Statement

Bank transactions are observations.

They are not inherently financial conclusions.

For example:

> `BARCLAYCARD £4,000`

may indicate:

* repayment of the user's own credit card;
* repayment of a joint credit card;
* someone else's credit card;
* business expenditure;
* debt repayment;
* an unusual one-off payment.

Similarly:

> `Sent money to Kohinoor Choudhury`

could represent:

* transfer to the user's joint account;
* transfer between their own accounts;
* household contribution;
* family support;
* rent;
* savings;
* debt repayment;
* discretionary spending.

The existing classifier cannot safely know the answer from description and amount alone.

This problem has already appeared in the current implementation.

The improved categorisation pipeline classified person-to-person payments as `savings_transfer`; because the clarification mechanism only triggered when the category was `other`, the better classifier accidentally prevented the necessary user question from being asked.

This demonstrates a critical architectural principle:

> **Clarification must be driven by unresolved financial meaning, not by whether a classifier happens to return `other`.**

---

# 3. Product Goal

Build a bank-statement analysis engine capable of converting raw financial transactions into a **resolved, explainable and confidence-scored financial model** that EquiScore can safely use for:

* income assessment;
* income stability;
* housing costs;
* regular household commitments;
* credit/debt servicing;
* recurring bills;
* discretionary expenditure;
* savings behaviour;
* internal transfers;
* affordability;
* financial stability;
* completeness/confidence;
* Trust Score inputs.

The engine should maximise automation while escalating genuine ambiguity to the user.

---

# 4. Non-Goals

This project should NOT attempt to:

* infer facts that cannot reasonably be determined;
* create more regex rules indefinitely for every merchant;
* allow an LLM to independently determine monetary values;
* allow AI-generated conclusions to overwrite extracted facts;
* treat transaction categories as financial truth;
* hide uncertainty;
* silently ignore transactions because they do not fit known categories;
* optimise the Trust Score before the underlying financial model is reliable;
* perfectly identify every transaction without user input.

A question answered accurately by the user is preferable to an incorrect automated inference.

---

# 5. Core Design Principles

## 5.1 Facts and interpretations must be separate

The system must distinguish:

### Observed

Directly present in the source.

Example:

> £1,551.72 paid to Strideup Homes on 10 occasions.

### Inferred

Derived algorithmically.

Example:

> Likely monthly housing payment.

### Confirmed

Explicitly confirmed by user or verified external evidence.

Example:

> User confirmed Strideup Homes is rent.

### Derived

Calculated from known facts.

Example:

> Current monthly rent = £1,551.72.

### Assessment

Used in EquiScore.

Example:

> Housing cost / monthly income = 27%.

These concepts must never collapse into a single untraceable value.

---

# 6. Required Target Architecture

The target pipeline should become:

```text
SOURCE
  ↓
INGESTION
  ↓
EXTRACTION
  ↓
STRUCTURAL VALIDATION
  ↓
NORMALISED TRANSACTIONS
  ↓
ENTITY + TRANSACTION ENRICHMENT
  ↓
RECURRENCE / PATTERN DETECTION
  ↓
ACCOUNT + RELATIONSHIP GRAPH
  ↓
FINANCIAL INTERPRETATION
  ↓
AMBIGUITY DETECTION
  ↓
USER CLARIFICATION
  ↓
RESOLVED FINANCIAL MODEL
  ↓
FEATURE GENERATION
  ↓
TRUST SCORE / ASSESSMENT
```

Each stage must expose its outputs separately.

Downstream stages must not silently repeat or override work from upstream stages.

---

# 7. Phase 0 — Audit the Existing Engine Before Changing It

This is mandatory.

Do not begin by adding more classifiers.

The engineer must first document exactly how the current engine works.

## 7.1 Produce a current-state architecture map

Identify:

* ingestion entry points;
* parser implementation;
* OCR implementation;
* LLM extraction fallback;
* validation logic;
* transaction normalisation;
* categorisation pipeline;
* recurrence detection;
* commitment detection;
* income detection;
* own-account detection;
* question generation;
* answer consumption;
* financial profile generation;
* Trust Score generation;
* score recomputation;
* persistence;
* APIs;
* frontend dependencies.

For every component document:

```text
Input
Output
Source file/module
Deterministic or probabilistic
DB tables touched
Fallback behaviour
Failure behaviour
Consumers
```

---

# 8. Build an End-to-End Transaction Trace

Create a development/debug facility allowing an engineer to select a transaction and see:

```text
Raw statement row
↓
Extracted transaction
↓
Normalised transaction
↓
Merchant/entity
↓
Candidate category
↓
Confidence
↓
Recurring stream membership
↓
Relationship
↓
Financial interpretation
↓
Question generated?
↓
User answer
↓
Final resolved meaning
↓
Profile impact
↓
Score impact
```

This should make bugs such as:

> DB says `rent_payment`, scoring engine says `other`

immediately visible.

The previous rent issue was specifically caused by downstream logic discarding the persisted category.

This class of bug must become difficult to introduce.

---

# 9. Canonical Transaction Model

Create one authoritative transaction structure.

Example:

```text
Transaction {
  id
  account_id
  statement_id
  transaction_date
  posting_date
  raw_description
  normalised_description
  amount
  currency
  direction
  running_balance
  transaction_type
  entity_id
  merchant_name
  candidate_category
  category_confidence
  resolved_category
  resolution_source
  relationship_id
  recurrence_group_id
  source_page
  source_row
  extractor
  extraction_confidence
  created_at
}
```

### Important rule

`candidate_category` and `resolved_category` are different.

Never overwrite the candidate simply because the user resolved it.

We need to preserve what the machine believed versus what ultimately became accepted truth.

---

# 10. Immutable Source Facts

The following fields should effectively become immutable after structural validation:

* date;
* amount;
* direction;
* balance;
* source document;
* source page;
* source row;
* currency;
* original description.

Any correction must be:

* explicitly logged;
* versioned;
* attributable;
* auditable.

LLMs must never freely modify these fields.

---

# 11. Structural Validation Layer

Before interpretation begins, validate the statement.

Required checks include:

### Document checks

* readable pages;
* statement identity available where expected;
* account identifier where available;
* statement date range;
* currency.

### Transaction checks

* dates valid;
* amounts parse;
* debit/credit direction understood;
* balances parse where provided;
* duplicates detected;
* page provenance retained.

### Reconciliation

Where sufficient data exists:

```text
opening balance
+ credits
- debits
= closing balance
```

The existing tested statement reconciled exactly and already retained balance/provenance across all 617 transactions.

This validation must become permanent testable behaviour.

---

# 12. Fail Closed on Structural Financial Errors

If:

* statement does not reconcile;
* transactions are missing;
* balance chain breaks unexpectedly;
* extraction confidence is materially low;
* page coverage is incomplete;

then the system must NOT quietly proceed as if the statement is complete.

Possible state:

```text
processing_status: NEEDS_REVIEW
```

rather than:

```text
processing_status: COMPLETE
```

The user should receive a meaningful explanation.

---

# 13. Separate Extraction from Interpretation

Extraction answers:

> What does the statement physically say?

Interpretation answers:

> What does this mean?

These must remain different systems.

For example:

```text
Raw:
SENT MONEY TO KOHINOOR CHOUDHURY
-£1,250
```

Extraction:

```text
amount: -1250
direction: debit
counterparty_text: KOHINOOR CHOUDHURY
```

Interpretation:

```text
possible_transfer_type:
  joint_account
  family_support
  household_contribution
  internal_transfer
  unknown
```

Interpretation failure must never imply extraction failure.

---

# 14. Entity Resolution Layer

Introduce durable counterparty entities.

Example:

```text
Entity {
  id
  canonical_name
  entity_type
  aliases[]
  known_metadata
  confidence
}
```

Possible entity types:

* employer;
* landlord;
* utility;
* lender;
* credit-card provider;
* insurer;
* subscription;
* person;
* government;
* bank;
* own account;
* joint account;
* merchant;
* unknown.

Examples:

```text
STRIDEUP HOMES LIMITED
→ StrideUp
→ probable housing provider
```

```text
BARCLAYCARD
→ Barclaycard
→ credit card provider
```

But:

> Barclaycard is a credit-card provider

does NOT mean:

> this is necessarily the user's own credit-card repayment.

Entity identification and transaction interpretation remain separate.

---

# 15. Relationship Graph

Create a lightweight financial relationship graph.

Example:

```text
User
│
├── Wise Current Account
│
├── Savings Account
│
├── Barclays Credit Card
│
├── Joint Household Account
│
└── Employer: Wise Payments
```

Relationships should be reusable.

Example:

```text
relationship:
  from_account: Wise Current
  counterparty: Account ending 1234
  type: own_joint_account
  confirmed_by_user: true
```

Future transactions matching this relationship should inherit the relationship unless evidence contradicts it.

This reduces repeated questioning.

---

# 16. Recurrence Engine

Recurrence detection must be independent of transaction category.

The engine should detect recurring streams based on:

* counterparty;
* description similarity;
* account;
* transaction direction;
* approximate cadence;
* amount distribution;
* temporal consistency.

Supported frequencies should include:

* weekly;
* fortnightly;
* every four weeks;
* monthly;
* approximately monthly;
* quarterly;
* annual;
* irregular recurring.

Do NOT assume that recurring = same amount.

---

# 17. Fix Salary Cadence Modelling

The current implementation successfully identifies salary income but can still set:

```text
recurringSalaryDetected = false
```

when salary arrives fortnightly rather than monthly.

This is unacceptable if the flag affects scoring.

Salary recurrence should be determined using cadence-aware models.

For example:

### Fortnightly

Expected occurrences:

```text
~26 per year
```

### Four-weekly

```text
~13 per year
```

### Monthly

```text
~12 per year
```

The engine must distinguish these.

---

# 18. Recurring Stream Object

Create an explicit object:

```text
RecurringStream {
  id
  entity_id
  account_id
  transaction_ids[]
  direction
  cadence
  cadence_confidence
  median_amount
  mean_amount
  amount_variability
  first_seen
  last_seen
  occurrence_count
  likely_financial_role
  role_confidence
  resolution_status
}
```

This becomes a fundamental building block of the profile.

---

# 19. Separate Transaction Category From Financial Role

This is critical.

A transaction can be:

```text
category:
credit_card_payment
```

while simultaneously having financial roles:

```text
cashflow_outflow: yes
debt_service: yes
consumption: no
internal_transfer: no
```

Do not force one category to carry every financial meaning.

---

# 20. Introduce Multi-Dimensional Financial Semantics

Each transaction/stream should optionally expose:

```text
cashflow_effect
consumption_effect
commitment_effect
debt_effect
savings_effect
income_effect
internal_transfer_effect
housing_effect
```

This solves several existing problems.

---

# 21. Credit Card Treatment

Credit cards require special handling.

A payment such as:

```text
BARCLAYCARD -£4,000
```

may simultaneously be:

### Cash flow

£4,000 genuinely leaves the current account.

### Consumption

The payment itself should generally not be interpreted as £4,000 of newly generated consumption if underlying card spending is separately represented.

### Debt servicing

The repayment demonstrates debt servicing behaviour.

### Commitment

Depending on context, recurring card repayment may be important for affordability.

Therefore:

> Do NOT simply "net out credit-card payments."

The existing proposal correctly recognises that credit-card repayments have both netting and commitment implications, but these effects need explicit separation.

---

# 22. Internal Transfers

Internal transfers should be excluded from:

* income;
* expenditure;
* affordability spending.

But they should still appear in:

* cashflow;
* account movement;
* savings analysis where relevant.

Possible classification:

```text
financial_role:
  internal_transfer
```

If EquiScore knows both accounts belong to the user:

```text
income_effect = 0
expense_effect = 0
cashflow_effect = actual transfer
```

---

# 23. Joint Account Transfers

Do not automatically treat transfers into a joint account as discretionary expenditure.

The engine should ask:

> You regularly transfer approximately £X to account/person Y. What is this?

Possible answers:

* My own account
* Our joint household account
* Household contribution
* Rent
* Family support
* Loan repayment
* Savings
* Something else

A joint account contribution could potentially represent:

* household expenditure;
* internal household movement;
* an affordability commitment.

Its treatment should depend on the user's answer.

---

# 24. Clarification Engine Must Become First-Class

Questions are not failures.

They are part of successful financial interpretation.

A question should be generated whenever:

```text
financially_material == true
AND
meaning_confidence < required_threshold
```

NOT simply:

```text
category == other
```

The previous question regression demonstrates why category-dependent triggers are fragile.

---

# 25. Materiality-Based Questioning

Do not ask users about every coffee.

Prioritise questions by:

```text
materiality
× recurrence
× uncertainty
× expected score/profile impact
```

Example priority:

### High

£1,500 monthly unexplained transfer.

### High

£4,000 recurring Barclaycard payments.

### Medium

£200 irregular transfer.

### Low

£7.50 unknown retail transaction.

---

# 26. Question Ranking

Suggested score:

```text
question_priority =
financial_materiality
× ambiguity
× recurrence_strength
× assessment_impact
```

Ask the highest-value questions first.

---

# 27. Question UX

Questions should use plain language.

Avoid:

> Classify transaction stream 82DDF.

Prefer:

> **You regularly send around £1,200 to Kohinoor Choudhury. What is this for?**

Supporting detail:

```text
11 payments found
£12,250 total
Usually every month
```

Answers:

* My own/joint account
* Household/family contribution
* Rent
* Loan repayment
* Something else

---

# 28. Question Bundling

If several transactions belong to one stream, ask once.

Bad:

> What is transaction #1?

> What is transaction #2?

> What is transaction #3?

Good:

> We found 10 monthly payments to Strideup Homes. Are these your rent payments?

User confirms once.

Apply resolution to the stream.

---

# 29. Question Memory

Once the user confirms:

```text
Barclaycard = my credit card
```

store that relationship.

Do not repeatedly ask on future uploads.

However, allow users to:

* review;
* edit;
* revoke;

previous answers.

---

# 30. Evidence Ledger

Every financially meaningful conclusion must have an evidence record.

Example:

```text
FinancialFact {
  key: current_monthly_rent

  value: 1551.72
  currency: GBP

  status: confirmed

  evidence:
    - 10 matching transactions
    - entity: StrideUp

  inference:
    cadence: monthly
    consistency: very_consistent

  confirmation:
    user_confirmed: true

  derived_by:
    engine_version: 3.1

  calculated_at:
}
```

---

# 31. Confidence Model

Standardise confidence rather than having different modules invent their own meanings.

Suggested states:

```text
VERIFIED
CONFIRMED
HIGH
MEDIUM
LOW
UNKNOWN
CONFLICTED
```

Alternatively numeric confidence can coexist internally.

High-impact assessment values should generally require:

* verified source evidence;
* high-confidence deterministic inference;
* or user confirmation.

---

# 32. Financial Model

The pipeline should ultimately generate a resolved financial model.

Suggested structure:

```text
FinancialProfile {
  income
  housing
  household_commitments
  utilities
  debt_service
  credit_card_service
  regular_spending
  discretionary_spending
  internal_transfers
  savings
  cashflow
  recurring_streams
  financial_relationships
  unresolved_items
}
```

---

# 33. Income Model

Income should support:

* salary;
* self-employment;
* benefits;
* pension;
* dividends;
* rental income;
* irregular income;
* transfers that are not income.

For each stream:

```text
source
monthly_equivalent
cadence
variability
continuity
confidence
months_observed
```

Do not determine income stability from a simple monthly transaction check.

---

# 34. Monthly Equivalisation

Cadence-aware conversion:

```text
weekly:
amount × 52 / 12

fortnightly:
amount × 26 / 12

four-weekly:
amount × 13 / 12

monthly:
amount

quarterly:
amount / 3

annual:
amount / 12
```

Avoid naïvely multiplying the most recent payment.

---

# 35. Housing Model

Housing should support:

* rent;
* mortgage;
* board/lodging;
* shared housing payment;
* unknown housing arrangement.

Store:

```text
monthly_cost
recipient
cadence
consistency
confidence
confirmation_status
```

The existing fix correctly identified £1,551.72 monthly rent with a 27% rent-to-income ratio on the tested statement.

---

# 36. Household Commitment Detection

Improve commitment detection beyond exact recurrence.

Identify:

* council tax;
* electricity;
* gas;
* water;
* broadband;
* mobile;
* insurance;
* childcare;
* subscriptions;
* loan payments;
* credit cards;
* transport finance;
* maintenance payments;
* household transfers.

Use entity knowledge + recurrence + user confirmation.

---

# 37. Variable Bills

Bills may vary materially every month.

For recurring stream matching, tolerate reasonable variance.

Example:

```text
£82
£106
£91
£127
£101
```

can still clearly represent recurring electricity payments.

---

# 38. Spending Analysis

Separate:

### Essential expenditure

Housing, utilities, necessary transport, childcare etc.

### Debt service

Loans/credit.

### Discretionary spending

Restaurants, leisure, non-essential retail etc.

### Transfers

Internal/joint/savings movement.

### Unknown

Do not force unknown transactions into discretionary spending.

---

# 39. Cashflow Model

Build cash flow independently from spending classification.

For each month:

```text
opening_balance
income
cash_inflows
cash_outflows
closing_balance
net_cashflow
lowest_balance
highest_balance
days_negative
overdraft_usage
```

This provides information categories cannot.

---

# 40. Avoid Double Counting

This must be implemented as a formal invariant.

Examples:

### Internal transfers

Never count as both expenditure and savings movement.

### Credit card

Never count the repayment and underlying card transactions as duplicated consumption when both data sets exist.

### Salary

Never count employer payment and an internal transfer of that salary as separate income.

### Joint accounts

Avoid counting movements between included accounts twice.

Introduce automated double-count checks.

---

# 41. Trust Score Separation

The Trust Score must consume the resolved financial model.

It must NOT independently re-interpret raw transaction descriptions.

Required:

```text
Raw statement
↓
Financial model
↓
Features
↓
Score
```

Never:

```text
Raw statement
↓
Score-specific regex
```

This directly avoids the type of category-threading bug previously encountered.

---

# 42. Feature Store

Create explicit score inputs.

Example:

```text
monthly_income: £5,827
income_stability: 0.93
housing_cost: £1,552
housing_to_income: 0.27
monthly_debt_service: £X
monthly_household_commitments: £X
monthly_disposable_cashflow: £X
financial_data_completeness: 0.88
```

For each:

```text
source
confidence
version
timestamp
```

---

# 43. Score Recalculation

Changes to material underlying information should automatically invalidate relevant scores.

Examples:

* user answers question;
* transaction classification corrected;
* relationship resolved;
* new statement uploaded;
* extraction reprocessed;
* engine version changes materially.

There should not be situations where the profile is correct while the displayed score remains indefinitely stale.

The current implementation has already experienced this mismatch.

---

# 44. Score Versioning

Every score should store:

```text
score
score_version
engine_version
financial_profile_version
calculated_at
inputs_hash
```

This allows EquiScore to reproduce why a historical score existed.

---

# 45. LLM Responsibilities

LLMs can assist with:

* messy merchant descriptions;
* entity identification;
* candidate transaction category;
* semantic clustering;
* transaction description interpretation;
* ambiguity detection;
* question wording.

LLMs should NOT be authoritative for:

* amounts;
* balances;
* dates;
* arithmetic;
* reconciliation;
* account ownership;
* whether an account belongs to the user;
* whether a person is a spouse;
* final score computation.

Those require deterministic evidence or explicit confirmation.

---

# 46. AI Output Contract

All AI calls should return structured outputs.

Example:

```json
{
  "candidate_category": "credit_card_payment",
  "confidence": 0.96,
  "entity": "Barclaycard",
  "ambiguities": [
    "account_ownership"
  ]
}
```

Schema validate before consumption.

Invalid output:

```text
fail → retry/fallback
```

Never silently coerce arbitrary generated text into financial data.

---

# 47. Engine Self-Validation

After analysis, run independent checks.

Required invariants:

### Transaction accounting

All extracted transactions represented exactly once.

### Cashflow

Transaction totals match source.

### Classification

Every transaction has either:

* resolved meaning;
* candidate meaning;
* unresolved status.

### Internal transfer

Internal transfer does not affect spending/income.

### Financial model

All components can be traced back to source transactions.

### Score

Every score feature maps to financial facts.

---

# 48. Exception Resolver

The current engine's own assessment identified the exception-resolver as incomplete.

Build explicit recovery paths.

Example:

```text
Parser failed
↓
Try alternative deterministic parser
↓
Try OCR/document extraction
↓
Validate
↓
Attempt targeted recovery
↓
If unresolved → manual/user intervention
```

Never simply continue with partial silent results.

---

# 49. Parsing Strategy

Support multiple ingestion routes.

## Digital PDF

Prefer text/coordinate extraction.

## Scanned PDF

Document/OCR extraction.

## Photograph

Image preprocessing + OCR/document extraction.

## CSV

Deterministic field mapping.

All routes must end in the same canonical transaction schema.

---

# 50. Parser Adapter Architecture

Avoid building one universal parser containing hundreds of bank-specific regexes.

Use adapters where necessary:

```text
Generic parser
├── Wise adapter
├── Monzo adapter
├── Barclays adapter
├── HSBC adapter
└── fallback document parser
```

Shared validation occurs after parsing.

---

# 51. Golden Test Corpus

This is mandatory before production expansion.

The existing engine has principally been validated using one Wise statement, and the internal assessment acknowledges that generalisation and regression testing remain weak.

Build a permanent anonymised corpus.

Minimum first milestone:

**25 statements**

Target before broad production:

**50–100 statements**

Cover:

* Wise;
* Monzo;
* Starling;
* Revolut;
* Barclays;
* Lloyds;
* Halifax;
* NatWest;
* Santander;
* HSBC;
* Nationwide.

---

# 52. Corpus Variation

Include:

* digital PDFs;
* scanned PDFs;
* photos;
* CSVs;
* 1-month statements;
* 3-month statements;
* 12-month statements;
* foreign currencies;
* joint accounts;
* overdrafts;
* sparse accounts;
* high-volume accounts;
* statements with refunds;
* salary;
* weekly salary;
* fortnightly salary;
* irregular income;
* benefits;
* transfers;
* debt payments.

---

# 53. Ground Truth

For each fixture manually annotate:

```text
transaction count
opening balance
closing balance
credits
debits
income
rent
major bills
internal transfers
credit card payments
recurring streams
known ambiguous transactions
```

Tests should compare engine results against this ground truth.

---

# 54. Permanent Regression Suite

Tests must cover:

### Extraction

Transaction counts.

### Arithmetic

Reconciliation.

### Provenance

Every transaction has source.

### Categorisation

Known categories.

### Recurrence

Known recurring streams.

### Questions

Expected ambiguity produces question.

### Answers

User answer changes interpretation correctly.

### Scoring

Resolved facts produce expected feature values.

### Corruption tests

Modified balance fails validation.

### Missing row

Fails reconciliation.

### Duplicate row

Detected.

### LLM hallucination

Cannot alter financial facts.

---

# 55. Falsification Testing

We should deliberately attempt to break EquiScore.

Examples:

* remove one transaction;
* change £100 to £1,000;
* swap credit/debit direction;
* duplicate transaction;
* alter running balance;
* introduce malformed date;
* move transaction to another page;
* LLM returns impossible category;
* user answer conflicts with known data;
* two accounts claim same transfer incorrectly.

The validator should catch the expected failure.

---

# 56. Shadow Evaluation Mode

Before changing production assessment behaviour:

Run old engine and new engine concurrently.

Example:

```text
OLD
income = £5,827
rent = £1,552
commitments = £1,552

NEW
income = £5,827
rent = £1,552
commitments = £2,348
internal transfers = £1,200
```

Record differences.

Do NOT affect live scores initially.

---

# 57. Difference Analysis

For every profile run calculate:

```text
old vs new income
old vs new rent
old vs new commitments
old vs new disposable income
old vs new internal transfers
old vs new score
```

Flag large changes for review.

---

# 58. Observability

Introduce engine-level metrics.

Track:

```text
statements_processed
statements_reconciled
reconciliation_failure_rate
transactions_extracted
duplicate_rate
unknown_category_rate
unresolved_material_transaction_rate
questions_per_statement
question_answer_rate
user_correction_rate
internal_transfer_detection_rate
salary_detection_rate
rent_detection_rate
commitment_detection_rate
score_recompute_failures
```

---

# 59. Quality Metrics

Key production targets:

### Structural extraction

> 99.9% reconciliation success for supported digital statement formats.

### Provenance

> 100% of persisted transactions linked to source evidence.

### No silent corruption

> 0 known cases where failed structural validation produces a completed assessment.

### Material ambiguity

> 100% of materially ambiguous streams surfaced or explicitly marked unresolved.

### Score traceability

> 100% of Trust Score inputs traceable to financial facts.

---

# 60. User-Correction Metric

One of the most important long-term metrics:

> How often does the user correct EquiScore?

Track by:

* entity;
* category;
* financial role;
* recurrence;
* income;
* rent;
* account ownership.

This creates the training/evaluation data needed to improve the engine intelligently.

---

# 61. Admin Debug Interface

Create internal tooling showing:

### Statement

Reconciliation status.

### Transactions

Raw and interpreted.

### Streams

Recurring groups.

### Relationships

Account/entity graph.

### Questions

Generated/answered.

### Financial model

Resolved facts.

### Score features

Inputs.

### Audit trail

Engine versions.

This interface will dramatically reduce future debugging time.

---

# 62. User-Facing Financial Summary

The improved engine should ultimately support a profile resembling:

## Income

**£5,827/month**

High confidence

* Wise Payments — salary
* Computershare — dividend income

---

## Housing

**£1,552/month**

Strideup Homes

**Confirmed**

---

## Household commitments

**£486/month**

* Energy
* Water
* Council tax
* Mobile
* Broadband

---

## Credit commitments

**Barclaycard**

Variable monthly repayments

**Confirmed as your credit card**

---

## Household transfers

**£1,200/month**

Joint household account

**Confirmed**

---

## Internal transfers

**£1,750/month**

Excluded from expenditure

---

## Needs your attention

**2 questions**

> We found two recurring payments that we could not confidently identify.

This is significantly more useful than merely displaying transaction categories.

---

# 63. Explainability

Every major number should expose:

> Why?

Example:

### Monthly rent — £1,551.72

> We found 10 payments to Strideup Homes with a highly consistent monthly pattern.

Evidence:

```text
10 transactions
Jan–Oct
Median £1,551.72
Monthly cadence
User confirmed as rent
```

---

# 64. Conflict Handling

The system must detect contradictory information.

Example:

Machine:

```text
Barclaycard
likely credit card
```

User:

```text
This is rent.
```

Do not blindly accept or reject.

Create:

```text
status: CONFLICTED
```

Request clarification or review where material.

---

# 65. Historical Learning

Confirmed relationships should survive future statement uploads.

Examples:

```text
Strideup → rent
Barclaycard → user's credit card
Account XXXX → joint account
Wise Payments → salary
```

But classifications should remain time-bounded where circumstances may change.

A former landlord should not permanently be treated as current rent.

---

# 66. Time-Aware Relationships

Relationship:

```text
entity: Strideup
type: rent
valid_from: X
valid_to: Y
```

A new landlord can supersede the old one.

This is important for longitudinal financial profiles.

---

# 67. Multi-Statement Analysis

The engine should ultimately analyse a timeline rather than treating each statement independently.

Example:

```text
Jan
Feb
Mar
Apr
May
Jun
```

This allows:

* employment changes;
* rent changes;
* income trends;
* new debt;
* declining balances;
* improving savings;
* new commitments;
* missing salary.

---

# 68. Confidence Should Improve Over Time

Example:

Month 1:

```text
Possible salary
confidence 65%
```

Month 3:

```text
Recurring fortnightly salary
confidence 94%
```

User confirms:

```text
CONFIRMED
```

Historical evidence should accumulate.

---

# 69. Data Governance

Store:

* raw source;
* extracted values;
* interpretations;
* user answers;
* engine version;
* score version;
* timestamps.

Do not overwrite historical reasoning.

Financial assessments must remain reproducible.

---

# 70. Migration Strategy

Do NOT perform a big-bang replacement.

### Phase 0

Audit current engine.

### Phase 1

Canonical transaction model + provenance.

### Phase 2

Entity resolution + recurrence.

### Phase 3

Financial role model.

### Phase 4

Relationship graph.

### Phase 5

Clarification engine.

### Phase 6

Resolved financial model.

### Phase 7

Trust Score integration.

### Phase 8

Shadow evaluation.

### Phase 9

Controlled production rollout.

---

# 71. Recommended Engineering Workstreams

Parallelise where appropriate.

## Workstream A — Extraction Reliability

* source adapters;
* OCR;
* reconciliation;
* canonical transactions.

## Workstream B — Financial Interpretation

* entity resolution;
* recurrence;
* categories;
* financial roles.

## Workstream C — Relationship & Questions

* ownership;
* joint accounts;
* user answers;
* relationship persistence.

## Workstream D — Financial Model

* income;
* housing;
* commitments;
* debt;
* transfers;
* cashflow.

## Workstream E — Scoring

* feature store;
* invalidation;
* versioning;
* recomputation.

## Workstream F — Testing & Observability

* golden corpus;
* regression tests;
* falsification;
* dashboards.

---

# 72. Immediate Bugs to Fix Before Larger Refactor

The following should not wait for the entire new architecture.

### A. Recurring salary

Fix fortnightly/four-weekly salary detection.

### B. Clarification regression

A person transfer classified as `savings_transfer` must still be eligible for clarification.

### C. Material recurring debit detection

Identify major recurring commitments even when amounts vary.

### D. Score invalidation

Material profile corrections should invalidate/recompute the score.

### E. Regression tests

Commit permanent tests for:

* rent classification;
* persisted categories;
* salary recurrence;
* questions;
* reconciliation.

---

# 73. Definition of Done — Phase 1

Phase 1 is complete only when:

* canonical transactions exist;
* source facts are immutable;
* all supported test statements reconcile;
* provenance is complete;
* tests are permanent;
* downstream engines consume canonical values;
* no scoring logic reparses raw descriptions independently.

---

# 74. Definition of Done — Interpretation Engine

Complete when:

* entities are resolved separately from categories;
* recurring streams exist independently;
* fortnightly/monthly/etc. cadence works;
* internal transfers can be identified;
* joint-account ambiguity can be surfaced;
* credit-card repayments receive separate financial semantics;
* major unresolved transactions produce questions;
* user answers persist as relationships;
* questions are not dependent on category=`other`.

---

# 75. Definition of Done — Financial Model

Complete when the engine can reliably provide:

```text
monthly income
income stability
housing cost
household commitments
debt servicing
credit card servicing
internal transfers
savings
essential expenditure
discretionary expenditure
net cashflow
unresolved material items
```

with provenance and confidence.

---

# 76. Definition of Done — Trust Score Integration

Complete when:

* the Trust Score only consumes explicit financial-model features;
* every feature has provenance;
* profile changes invalidate stale scores;
* score versions are reproducible;
* unresolved ambiguity is reflected in confidence/completeness rather than silently guessed.

---

# 77. Acceptance Scenario — Current EquiScore Statement

Using the existing tested statement, the new engine should at minimum recognise:

### Strideup

Recurring monthly stream.

Expected interpretation:

```text
housing / rent
~£1,551.72 per month
```

### Wise Payments

Recurring income.

Fortnightly cadence must still result in:

```text
recurringSalaryDetected = true
```

### Barclaycard

Expected:

```text
entity = Barclaycard
possible financial role = credit card repayment
account ownership = unresolved
```

Generate question:

> Are these payments to your own credit card?

If yes:

```text
cashflow = outflow
debt_service = yes
credit_card_service = yes
consumption = not automatically treated as new spending
```

### Recurring person transfer

Detect stream independently from classification.

Generate:

> You regularly transfer approximately £X to Y. What is this?

If:

> Our joint account

then:

```text
relationship = joint household account
```

and apply appropriate financial semantics.

---

# 78. Important Architectural Constraint

Do not solve the current problems by simply expanding:

```text
if description contains X
→ category Y
```

Regex/rules remain useful for deterministic clues.

They must not become the primary financial intelligence architecture.

---

# 79. Product Principle

The engine should optimise for:

> **Maximum justified certainty**

not:

> Maximum automatic classification.

If EquiScore knows something, state it.

If EquiScore strongly infers something, explain why.

If EquiScore needs the user to answer something, ask.

If EquiScore genuinely cannot determine something, say so.

---

# 80. Expected End State

A bank statement should cease being merely a list of categorised transactions.

EquiScore should turn it into a living financial model:

```text
USER
│
├── Income
│   ├── Salary
│   └── Additional income
│
├── Housing
│   └── Rent
│
├── Household
│   ├── Utilities
│   ├── Joint-account funding
│   └── Regular commitments
│
├── Credit
│   ├── Credit cards
│   └── Loans
│
├── Savings
│
├── Internal Transfers
│
├── Spending
│   ├── Essential
│   └── Discretionary
│
└── Unknown / Needs Clarification
```

Every branch should be backed by source transactions.

Every inference should have confidence.

Every user-confirmed fact should be remembered.

Every important unresolved question should be surfaced.

Every Trust Score input should derive from this model.

---

# 81. Final Engineering Direction

The current system should be treated as a **working ingestion and early classification foundation**, not as the completed EquiScore analysis architecture.

The engineering priority should now move away from endlessly improving regex classifications and toward five capabilities:

1. **Recurring financial behaviour detection**
2. **Account/entity relationship understanding**
3. **Multi-dimensional financial semantics**
4. **User-assisted ambiguity resolution**
5. **Provable, regression-tested financial modelling**

The success criterion is not:

> "We categorised 95% of transactions."

The success criterion is:

> **"We can explain the user's financial position accurately, know which conclusions are certain versus inferred, ask intelligently when information is missing, and prove exactly how every assessment was produced."**

That should become the foundation upon which EquiScore's affordability, Trust Score and reusable financial profile are built.
