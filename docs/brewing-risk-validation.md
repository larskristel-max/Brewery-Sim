# Brewing Risk Validation Sheet

Status: approved for the current prototype pass by Lars on 2026-05-29.

Authoritative rule data lives in `src/data/brewingRiskRules.ts`. This document remains the human review sheet for future corrections.

This file exists so the brewing-risk model is not just hidden constants in the reducer. Do not mark the TODO item complete until Lars has approved or corrected these rules.

## Starter Style Rules

| Rule | Current gameplay interpretation | Needs brewer validation |
| --- | --- | --- |
| Fast Garage Blonde | Can be solid or excellent if sanitation, fermentation and packaging are clean. | Is this forgiving enough for the first beer? |
| Fast wheat / saison / kveik | Speed can be valid when yeast/style supports it. | Which starter styles should tolerate speed without feeling fake? |
| Fast Pils / short boil | Raises DMS / clean-lager risk. It is not an automatic dump. | How harsh should this be at garage scale? |
| Rough IPA transfer | Saves time/energy but raises oxygen and hop-aroma collapse risk. | Is the current penalty too strong, too weak, or in the wrong phase? |
| Hard dark-grain process | Should risk roast harshness/astringency, not safety. | Which dark-beer shortcut should teach this best? |
| Slow chill in dirty setup | Raises contamination risk when sanitation debt is already high. | What warning would a real brewer reasonably notice? |

## Fermentation Rules

| Rule | Current gameplay interpretation | Needs brewer validation |
| --- | --- | --- |
| FG unknown/moving | Packaging is allowed but carries refermentation and package-pressure risk. | What simplified "stable enough" signal should players learn? |
| Nearly stable FG | Risk exists but can be a reasonable deadline gamble. | Should this ever be safe for low-gravity beers? |
| Yeast cleanup green | Creates young/green-apple/slick notes, not necessarily unsafe. | Which faults should be detectable before packaging? |
| Warm fermentation | Style dependent: bad for clean lager, less damaging for saison/kveik. | Confirm temperature bands and severity. |

## Packaging And Cleaning Rules

| Rule | Current gameplay interpretation | Needs brewer validation |
| --- | --- | --- |
| Rushed packaging | Faster, more oxygen/fill/cap risk and worse presentation. | Are these the right first-order failure modes? |
| Missed bottling wand / filler head | Can ruin an otherwise good batch through contamination or package instability. | Which missed parts are most believable and gameplay-useful? |
| Unsafe verdict | Blocks normal sale; recovery/recall/dump required. | Which failures should force dump/recall rather than discount/hold? |
| Oxidized IPA | Commercial quality failure, not unsafe. | Confirm customer reaction severity per channel. |

## Consequence Rules

| Rule | Current gameplay interpretation | Needs brewer validation |
| --- | --- | --- |
| Friends/family | Forgiving, but trust can still fall on flawed beer. | Should Samira tolerate flawed but stable beer? |
| Formal buyers | Reject below-minimum or wrong-package beer before cash/inventory move. | Is this strict enough for bars/restaurants/festivals? |
| Recall-level risk | Reserved for severe package instability or contamination/refermentation risk. | Which conditions should trigger this in a simplified sim? |

## Approval Notes

Use this section during validation:

- Approved as-is:
- Change before implementation:
- Remove from early game:
- Add missing real brewery risk:
