# `POST /document/analyze` — the non-medicine half of a prescription

The card can now render everything on a prescription that is **not** a medicine.
The frontend contract and the UI are done and shipped; **the backend does not
send these fields yet**, so today the block renders as nothing at all.

Nothing breaks in the meantime: every field is optional, and an absent
`prescription` object renders no heading, no empty rows and no placeholder
text. Verified against an analysis with the object omitted entirely, which is
also what every analysis stored before this change looks like.

## What to add to the response

Inside `analysis`, alongside `medicines`:

```jsonc
{
  "analysis": {
    "medicines": [ /* unchanged */ ],

    "prescription": {
      // The single most missed instruction on any prescription.
      // Copy the page's own phrasing: "after 5 days", "12 September 2026",
      // "in 2 weeks", "SOS". Do NOT convert a relative date into an absolute
      // one — the analysis may be read days after the visit.
      "followUp": "after 5 days",

      // What the prescription is for, in the doctor's words.
      "diagnosis": "a throat infection",

      // Tests or scans asked for. One per entry, expanded where the page
      // abbreviates: "CBC" -> "Complete blood count (CBC)".
      "testsAdvised": ["Complete blood count (CBC)", "Throat swab culture"],

      // Non-medicine instructions: rest, fluids, diet, exercises, physio.
      // One instruction per entry, as a full sentence.
      "generalAdvice": ["Drink plenty of warm fluids.", "Rest your voice for a few days."],

      // The date written on the prescription.
      "prescribedOn": "2 September 2026",

      // Doctor and/or clinic, so the patient can tell which page this is.
      "prescriber": "Dr. A. Menon, Sunrise Clinic"
    }
  }
}
```

## Rules that matter

1. **Omit a field you cannot read. Never guess, never default.** An absent
   field renders nothing; a wrong one is a claim about someone's care. This is
   the same rule `foodRelation: "not_stated"` already follows — the card says
   the page did not say, rather than assuming the common case.
2. **Never emit an empty string or an empty array to mean "none".** `""` and
   `[]` are treated as absent by the card, but omitting is clearer and keeps
   "the doctor asked for no tests" from ever being asserted.
3. **Keep the page's own phrasing for `followUp`.** The card adds the
   preposition it needs ("after 5 days" stays; "12 September" becomes "on 12
   September"), so a converted or reformatted date only makes that worse.
4. **`testsAdvised` and `generalAdvice` are lists, not paragraphs.** They are
   rendered one per line; a single joined string becomes an unreadable run-on.
5. Expand abbreviations the patient cannot be expected to know. The whole point
   of the feature is that they could not read the page.

## Already supported per medicine

These exist in the contract and the card renders them today — worth confirming
the extractor actually fills them, because `duration` in particular is often
left inside `howToTake` where the card has to parse it back out:

| field | example | shown as |
|---|---|---|
| `dose` | `"1 tablet"` | `1 tablet` |
| `timesOfDay` | `["morning","night"]` | the sunrise/sun/sunset/moon strip |
| `frequency` | `"1-0-1"`, `"BD"`, `"TDS"` | translated to words, or dropped if it only restates the strip |
| `foodRelation` | `"after_food"` | `After food` |
| **`duration`** | **`"5 days"`** | **`For 5 days`** |
| `specialInstructions` | `"Finish the full course…"` | its own line |
| `legible` / `verified` / `catalogueName` | | the `CHECK` marker and "Did it perhaps say X?" |
