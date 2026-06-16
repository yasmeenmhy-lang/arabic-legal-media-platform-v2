# Najiz Muhameen font files

This platform's typography is configured for "Najiz Muhameen" (ناجز محامين) as the
primary Arabic typeface (see `@font-face` rules in `app/globals.css` and the
`fontFamily.sans` stack in `tailwind.config.ts`).

The actual font files are **not bundled in this repository** — they are not
freely redistributable, so they must be supplied separately by whoever holds
the license/rights to the typeface. Add the following files to this folder to
activate it across the platform:

- `najiz-muhameen-regular.woff2` (weight 400, used for all body text and labels)
- `najiz-muhameen-bold.woff2` (weight 700, used only for main page headings)

Until these files are added, the UI gracefully falls back to "IBM Plex Sans
Arabic" (and then Tahoma/Arial), so the app remains fully usable.
