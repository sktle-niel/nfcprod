# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: a customer of a Philippine food or drink shop who taps the shop's NFC card (or scans its QR code) at the table or counter. The menu opens on their phone with no app. They read it and decide what to ask for. They are often seated or in a queue, one-handed, sometimes on slow data.

Secondary: the shop owner, who picks a template and light or dark in the dashboard, then fills in their own items, prices, photos and contact details.

## Product Purpose

Give any shop with a menu its own menu website, reached by a tap. Success for the customer is finding what they want and its price quickly. Success for the owner is a page that looks like their shop, without a designer.

## Positioning

One codebase serves many shops, each on its own menu site, opened from a physical card on the table. It is a menu to read, not a store: no ordering, cart, accounts or ratings on the page.

## Operating Context

Shop types: coffee and milk tea shops, juice bars, bars, carinderias, fast casual, bakeries, dessert shops, fine dining, and hybrids such as cafe plus meals. Single branch to multi-branch. The customer is already at the shop, so calling and directions are secondary there.

## Capabilities and Constraints

- A menu has categories and products; a product has a name, description, price or sizes, add-on groups, tags, a picture and an availability flag. Any of these except the name and price can be empty.
- An owner can choose the accent, text, page and card colors, the font pairing, Grid or List, and a page photo. Templates must hold up under those choices.
- Owner photos are phone photos: mixed light and backgrounds, and some items have none. Designs must look finished anyway.
- Pages paint only from the `--menu-*` variables and use container queries, so the public page and the owner's preview agree.
- Frontend only for now, on mock data behind repository interfaces.

## Evidence on Hand

Five demo businesses: `cafe-luna`, `kapehan-ni-ana`, `la-bella`, `bean-there`, `tea-hub`. Sample photos in `public/sample` and page photos in `public/stock`, all from Pexels and listed in `CREDITS.md`. No testimonials, customer numbers or ratings exist; do not invent any.

## Product Principles

- The food comes first: the menu is the page, and nothing stands between the customer and the items.
- The shop is the identity: a page should feel like that shop, not like this platform and not like a coffee shop when it is not one.
- Never show a control or a fact with nothing real behind it.
- Assume imperfect content: long names, no photo, no description, no logo.
- Fast on a cheap phone on slow data.

## Accessibility & Inclusion

Mobile first from 320 px. Text contrast at 4.5:1 for every palette, sold-out items said in words, full keyboard use, and calm motion under `prefers-reduced-motion`.
