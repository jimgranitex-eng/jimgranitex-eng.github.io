# #93 — Bonus Stacking: TERMS-CHECK (do NOT build promotional content)

**Status:** STAGED research only. No promotional content built, per GO-57 Group E instructions.
**Date:** 2026-10-10
**Question:** Which major affiliate programs allow or forbid purchase incentives (cashback, rewards, "stack the bonus" promotions) on affiliate links?

## Verdict up front

- **Amazon Associates: FORBIDDEN.** Explicit ban on any consideration, reward, or incentive for using affiliate links.
- **Impact: ALLOWED, brand-dependent.** Loyalty/rewards (cashback, card-linked offers) is a recognized publisher type; each advertiser can allow or exclude it, and stand-down rules govern extension behavior.
- **ShareASale: CLOSED.** Awin consolidated ShareASale into Awin; no new signups. Route through Awin instead.
- **CJ: FORBIDDEN by default; allowed only with the advertiser's prior written permission.** CJ's publisher agreement explicitly bans reward-for-transaction promotions without advertiser sign-off.
- **Awin: ALLOWED, brand-dependent.** Advertiser terms include "Loyalty" and "Virtual incentives" as partner types.

**Kingdom implication:** Bonus stacking is **not viable** on our Amazon-tagged links (granitex60-20) — forbidden outright. On Impact/Awin/CJ it is possible only program-by-program with advertiser opt-in. This is operationally fragile and risks account standing on a core revenue rail. **Recommendation: do not build bonus-stacking promotions.** If ever revisited, it requires James's explicit tap first — never a background decision.

---

## Program-by-program findings (with sources)

### 1. Amazon Associates — FORBIDDEN
The Associates Program Operating Agreement, Section (g):
> "You will not offer any person or entity any consideration, reward, or incentive (including any money, rebate, discount, points, donation to charity or other organization, or other benefit) for using Special Links. For example, you cannot implement any 'rewards' or loyalty program that incentivizes persons or entities to visit an Amazon Site via your Special Links."

Sources:
- https://affiliate-program.amazon.co.uk/help/operating/policies (Operating Agreement, §(g))
- https://affiliate-program.amazon.com/help/node/topic/G8TW5AE9XL2VX9VM ("You cannot offer any person or entity any consideration, reward, or incentive for using your links")

This is a network-wide, non-negotiable ban — no per-brand opt-in exists. Bonus stacking on Amazon links = account termination risk.

### 2. Impact — ALLOWED (brand-dependent)
Impact recognizes "loyalty and rewards (cashback and card-linked offers included)" as a standard affiliate publisher category. Brands opt in or out per program, and Impact's Stand-Down Policy governs browser-extension behavior (e.g., suppressing cashback prompts on traffic already attributed to another publisher).

Sources:
- https://impact.com/partnerships/types-of-affiliate-publishers/ ("loyalty and rewards (cashback and card-linked offers included)")
- https://www.benedelman.org/topics/adware/adware-loyalty/ (citing Impact's Stand-Down Policy requiring publishers to "refrain from actions that could … interfere with existing publisher-referred traffic")

Cashback/loyalty is structurally supported, but **per-advertiser** — the brand's program terms decide.

### 3. ShareASale — CLOSED (consolidated into Awin)
Awin announced ShareASale would be closed and consolidated into Awin. The standalone platform is discontinued; new affiliate applications are not accepted. Publishers and merchants previously on ShareASale route through Awin.

Source: https://rohansharma.blog/2026/09/28/shareasale-vs-cj-affiliate-which-is-better-for-affiliate-marketers-in-2026/ (Sept 2026: "Awin announced that ShareASale would be closed and that the business would be consolidated into Awin.")

Terms-check answer: **moot** — no longer an available program. Use Awin's rules (above).

### 4. CJ — FORBIDDEN by default; allowed only with advertiser's prior written permission
CJ's Publisher Service Agreement (SEC-filed):
> "You shall not establish or cause to be established any promotion that provides any rewards, points or compensation for Transactions … unless You receive the Advertiser's prior written permission, upon notification to and verification by CJ."

Source: https://www.sec.gov/Archives/edgar/data/1142889/000110801701500395/irex102.htm (CJ publisher agreement, §2.2)

So the network does not ban incentives outright — but the default is NO, and each advertiser must opt in in writing, verified by CJ. Same per-brand reality as Impact, with a stricter default.

### 5. Awin — ALLOWED (brand-dependent)
Awin's advertiser terms include **"Loyalty"** and **"Virtual incentives"** as standard partner types a brand can allow on its program.

Source: https://ui.awin.com/advertiser-terms/122418/affiliate?setLocale=it_IT (allowed partner types list: Loyalty; Virtual incentives)

Same as Impact: structurally allowed, per-advertiser decision.

---

## Summary table

| Program | Incentivized purchases (cashback/rewards) | Authority |
|---|---|---|
| Amazon Associates | **Forbidden** — network-wide ban | Operating Agreement §(g) |
| Impact | **Allowed** — per-advertiser opt-in; stand-down rules apply | Impact publisher-type taxonomy |
| ShareASale | **N/A** — platform closed, merged into Awin | Awin consolidation announcement |
| CJ | **Forbidden by default** — allowed only with advertiser's prior written permission | Publisher Service Agreement §2.2 |
| Awin | **Allowed** — per-advertiser opt-in (Loyalty / Virtual incentives partner types) | Advertiser terms |

## Decision (staged — needs James's word to change)

No bonus-stacking promotional content is staged, built, or deployed anywhere in GO-57. The lane stays clean: honest disclosures, no incentives on Amazon links, and any future incentive-based promotion happens only on Impact/Awin/CJ programs whose advertiser terms explicitly permit it — and only on James's explicit tap.

<!-- TAG-PENDING: N/A — research document, no affiliate links -->
