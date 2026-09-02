# Texture — Legal Document Revisions

**Purpose:** Ready-to-paste replacement language for the Terms & Conditions and Privacy Policy, correcting all flagged issues.

**⚠️ Important:** This is informed, protective language written to match how Texture actually operates — but it is not a substitute for a lawyer. When you can afford legal review, hand them this document; the sections marked **[LAWYER: …]** are the ones most worth their attention. Update the "Last updated" date on both live pages when you publish these.

**Before publishing, confirm these facts are true (they're asserted in the text):**
- Payment processor is **Stripe** (not Etsy). ✔ per your confirmation.
- Your generation code sends **only chart data** to Anthropic — no name/email. (Verify: if name rides along in the prompt, the Anthropic language below must change.)
- Your registered business address (used below as "Long Beach, California" — **replace with your actual current address** if different; make it identical in both docs).

---

# PART 1 — TERMS & CONDITIONS FIXES

## Fix 1A — Payment processor (Etsy → Stripe)

**Section 15 (Third-Party Service Providers)** — replace the final sentence:

> ~~Payments are processed through Etsy and their payment partners; Texture does not receive or store payment information.~~

with:

> Payments are processed through Stripe, Inc. (stripe.com) and their payment partners. Texture does not receive, process, or store your full payment card details; these are handled directly by Stripe under their own terms and privacy policy.

## Fix 1B — Purchases and Refunds (Section 19, full replacement)

Replace **all of Section 19** with the following. This strengthens the failure/delay remedy (your API-capacity risk) and adds the international digital-content withdrawal handling.

> ## 19. Purchases, Delivery, and Refunds
>
> **Purchase.** Readings are one-time purchases processed through Stripe. Prices are shown at checkout in U.S. dollars. By completing a purchase you agree to pay the listed price.
>
> **Generation and delivery.** Each reading is generated on-demand by automated systems after your purchase is confirmed. In most cases your reading is available within minutes at your permanent reading URL, which is also sent to the email address you provide. Because each reading is personalized content generated specifically for you from your birth data, generation begins immediately upon purchase.
>
> **Immediate performance; waiver of withdrawal right.** By completing your purchase and requesting immediate generation of your reading, you expressly consent to the immediate commencement of the service and acknowledge that, to the extent you have any statutory right of withdrawal or "cooling-off" period for digital content (including under EU and UK consumer law), that right is lost once generation of your reading has begun. You acknowledge and agree to this at checkout.
>
> **Delays and technical issues.** In rare cases — including technical problems, service-capacity limits, or interruptions in third-party services we depend on — generation of your reading may be delayed. If your reading cannot be generated promptly, we will complete and deliver it as soon as reasonably possible and notify you by email when it is ready. If we are unable to deliver your reading within a reasonable period (ordinarily within 48 hours of purchase), you may request a full refund by contacting help@gettexture.app.
>
> **Sole remedy.** To the fullest extent permitted by applicable law, your sole and exclusive remedy for any delay in, or failure of, reading generation or delivery is either (a) delivery of the reading once the issue is resolved, or (b) a full refund of the amount you paid. We are not liable for any indirect, incidental, or consequential damages arising from any delay or failure in generation or delivery.
>
> **Inaccurate birth data.** Readings are generated from the birth data you provide. Readings generated from incorrect or incomplete birth data are not grounds for a refund, as the content was generated as requested. If you entered incorrect information, contact us at help@gettexture.app and we will do our best to help.
>
> **Statutory rights.** Nothing in this section limits any non-waivable refund or consumer-protection rights you may have under the mandatory laws of your country or state of residence.

**[LAWYER: The withdrawal-waiver and "sole remedy" clauses are the highest-value items to review — especially whether the 48-hour window and the waiver mechanics satisfy EU/UK digital-content rules for your specific setup.]**

## Fix 1C — Anthropic data claim (Section 15 + wherever it appears)

Your current text says data sent to Anthropic "is not linked to your identity or stored by Anthropic." The "not stored/retained" part is likely inaccurate — API providers typically retain data for a limited period for trust-and-safety purposes even when they don't train on it. Replace the Anthropic sentence(s) in **Section 15** with the more accurate and still-protective:

> Chart data — planetary positions and placements calculated from your birth information — is transmitted to Anthropic, PBC (anthropic.com) solely to generate your personalized interpretation. We do not send your name or email address to Anthropic with this request. Anthropic processes this data under its own commercial terms and does not use it to train its models. Anthropic may retain data for a limited period in accordance with its data-retention and trust-and-safety policies.

**[LAWYER / VERIFY: confirm against Anthropic's current commercial terms that (a) API data isn't used for training, and (b) the retention description is accurate. Also confirm your code sends only chart data, no name/email, in the generation request.]**

## Fix 1D — Governing law / international customers (Section 8, add a sentence)

Keep California governing law, but add an international-savings sentence at the end of **Section 8**:

> If you are a consumer resident in a jurisdiction whose mandatory laws provide you with additional protections that cannot be waived by contract, nothing in these Legal Terms deprives you of those protections, and the mandatory consumer-protection laws of your country of residence continue to apply to the extent required.

## Fix 1E — Address consistency

Confirm your actual registered business address and make it **identical** in Terms Section 25, Privacy Section 15, and both footers. (Currently "Long Beach, California" in Terms; "Long Beach, CA 90802" in Privacy.) Replace with your true current address everywhere.

## Fix 1F — Add a Marketing Communications section (new Section, e.g. 19A or add to Miscellaneous)

You're about to send product-update emails (transits launch). Add this so it's covered and consent-based:

> ## Marketing and Product-Update Communications
>
> When you purchase a reading, we may send you transactional emails necessary to deliver your reading (such as your reading link). We will only send you marketing or product-update emails — such as notice of new features or offerings — if you have opted in to receive them, for example by requesting to be notified when a new feature becomes available. Every marketing email includes a way to unsubscribe, and we honor unsubscribe requests promptly. You can also opt out at any time by contacting help@gettexture.app.

---

# PART 2 — PRIVACY POLICY FIXES

## Fix 2A — Payment processor (Etsy → Stripe)

**Section 1 (Payment Data)** — replace:

> ~~All payment data is handled and stored by Etsy and their payment processors.~~

with:

> All payment data is handled and stored by Stripe, Inc. and their payment processors. We do not have access to your full payment card details.

**Section 13 (Third-Party Service Providers)** — replace the final sentence:

> ~~Payments are processed through Etsy and their payment partners; Texture does not receive or store your payment information.~~

with:

> Payments are processed through Stripe, Inc. (stripe.com) and their payment partners; Texture does not receive or store your full payment card information. Stripe processes your payment data under its own privacy policy.

## Fix 2B — Anthropic data claim (Sections 5 and 13)

**Section 5** — replace:

> ~~This data is not linked to your identity and is not retained by Anthropic.~~

with:

> We do not send your name or email address to Anthropic with this request. Anthropic processes this data under its own commercial terms, does not use it to train its models, and may retain it for a limited period in accordance with its data-retention and trust-and-safety policies.

**Section 13** — replace:

> ~~No data transmitted to Anthropic is linked to your identity or stored by Anthropic.~~

with:

> We do not send your name or email address to Anthropic. The chart data is processed by Anthropic under its own commercial terms and is not used to train its models; Anthropic may retain data for a limited period under its data-retention and trust-and-safety policies.

And in **Section 13**, the Etsy sentence — replace:

> ~~Payments are processed through Etsy and their payment partners; Texture does not receive or store your payment information.~~

with:

> Payments are processed through Stripe, Inc. (stripe.com) and their payment partners; Texture does not receive or store your full payment card information.

## Fix 2C — Add Stripe to the shared-parties list (Section 4)

In **Section 4 (When and with whom do we share)**, add Stripe to the Third-Party Service Providers bullet:

> **Third-Party Service Providers.** We share birth data transiently with Vercel for chart calculation and with Anthropic for interpretation generation. Your reading data is stored in Supabase. Payment information is processed by Stripe. See Section 13 for full details.

## Fix 2D — Marketing communications & consent (new subsection under Section 2 or as a note)

Add this to reflect the opt-in email approach (important for GDPR/CASL):

> **Marketing communications.** We send transactional emails necessary to deliver your reading (such as your reading link). We send marketing or product-update emails only to individuals who have opted in to receive them — for example, by asking to be notified when a new feature becomes available. You can withdraw this consent at any time using the unsubscribe link in any such email or by contacting help@gettexture.app. In jurisdictions that require express consent for commercial electronic messages (such as Canada under CASL or the EU/UK under GDPR and PECR), we rely on your opt-in as the basis for sending these messages.

## Fix 2E — Legal bases: add Consent for marketing (Section 3)

In **Section 3**, add to the EU/UK paragraph:

> Where we send you marketing or product-update communications, our legal basis is your consent, which you may withdraw at any time.

## Fix 2F — Sensitive data note (Section 1 / "Sensitive Information")

Your birth data is the core of the product. Under GDPR, birth date/time/location are generally **not** "special category" data, so "we do not process sensitive information" is defensible — but add a clarifying line so it's transparent rather than silent:

> **Sensitive Information.** We do not process special categories of personal data as defined under GDPR (such as data revealing health, religious beliefs, or biometric data). Your birth date, time, and location are processed solely to calculate your astrological chart and generate your reading.

**[LAWYER: birth data is the whole product — worth a glance to confirm "not special category" holds in every target jurisdiction. Astrological/belief-adjacent framing is the only conceivable stretch, and it's a stretch.]**

## Fix 2G — Address consistency + updated date

Make the address identical to the Terms (Fix 1E). Update "Last updated" to the date you publish these changes on both documents.

---

# PART 3 — IMPLEMENTATION CHECKLIST (for a later code session)

These are the changes that require touching the site, not just the legal pages:

1. **Checkout withdrawal-waiver acknowledgment.** Add a checkout acknowledgment (checkbox or clear statement above the pay button) capturing: *"I request immediate generation of my reading and understand that once generation begins I waive any statutory 14-day right of withdrawal for digital content."* Store that the user acknowledged it (timestamp) with the reading record. This is what makes "all sales final" hold internationally.

2. **Marketing opt-in capture ("notify me" button).** Build the pre-purchase "coming soon / notify me" interest capture and the post-purchase "notify me when transits is available" button. Record the opt-in (email + timestamp + what they opted into) so you have provable consent for CASL/GDPR. Only email people who are on this list.

3. **Unsubscribe mechanism.** Any marketing/product-update email must include a working unsubscribe link, and unsubscribes must be honored and recorded.

4. **Confirm generation sends no PII to Anthropic.** Verify the generation request contains only chart data — no name, no email. If the name is currently included in the prompt, either remove it or change the Anthropic language above to disclose it.

5. **Update both legal pages** with all the Part 1 & Part 2 text, and update the "Last updated" date.

6. **Confirm registered address** and make it identical everywhere.

---

# PART 4 — WHAT STILL NEEDS A LAWYER EVENTUALLY (prioritized)

When you can afford ~an hour of counsel, these are the items to point them at, in order:

1. The **digital-content withdrawal waiver** and **refund "sole remedy"** clauses (Fix 1B) — the mechanics of waiving EU/UK cooling-off rights are technical and jurisdiction-specific.
2. The **Anthropic / third-party data-retention representations** (Fix 1C / 2B) — you're making factual claims about a third party; a lawyer will want them airtight or appropriately hedged.
3. Whether **birth data** is "special category" data anywhere you sell (Fix 2F).
4. The **liability cap** ("lesser of amount paid or $100") — enforceability varies; usually fine, occasionally trimmed by local law.
5. Whether you need a **cookie/tracking notice** — depends on what analytics/tracking the site actually runs (your Privacy Policy currently implies minimal tracking; confirm that's true, or you may need a cookie banner for EU visitors).

**[LAWYER: item 5 — confirm what tracking/analytics the live site runs. If there's any non-essential tracking (analytics, pixels), EU/UK law likely requires a cookie consent banner, which the site does not currently appear to have.]**
