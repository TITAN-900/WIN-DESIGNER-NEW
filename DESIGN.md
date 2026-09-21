---
name: WIN DESIGN
description: Warm residential interiors, expressed through architectural imagery and restrained editorial type.
colors:
  cream: "#f7f1e8"
  ivory: "#fffdf8"
  warm-white: "#fbf7f0"
  linen: "#e9ddcd"
  walnut: "#6b4934"
  gold: "#bf9458"
  black: "#171513"
  ink: "#211d19"
  muted: "#6f675d"
  line: "rgba(69, 52, 38, 0.14)"
  line-strong: "rgba(69, 52, 38, 0.22)"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(3.1rem, 6.7vw, 5.45rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "0"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.45rem, 5.4vw, 4.6rem)"
    fontWeight: 600
    lineHeight: 0.98
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.78
  navigation:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 800
rounded:
  surface: "12px"
  pill: "999px"
components:
  button-dark:
    backgroundColor: "{colors.black}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
  button-outline:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
  field:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "14px 15px"
---

# Design System: WIN DESIGN

## Overview

**Creative North Star: "Warm architectural interiors"**

This records the existing WIN DESIGN identity, not a new direction. Cream surfaces, walnut accents, serif headlines and compact sans-serif controls frame residential imagery. Photographs and the existing interior scene carry the visual detail; interface decoration stays restrained.

**Key Characteristics:**

- Warm neutral surfaces and dark readable text.
- Architectural imagery at generous scale.
- Serif editorial hierarchy with practical sans-serif navigation.
- Shared pill navigation and concise calls to action.

Source of truth: `assets/css/styles.css`, `assets/css/studio-sculpture.css`, `assets/css/about.css` and the existing scene controller. This is a source extraction, not a claim that every state has passed visual QA.

## Colors

Warm off-whites and brown-black text echo the interior material palette.

### Primary

- Walnut supplies restrained brand accents and secondary emphasis.
- Gold supports focus feedback, not broad decorative panels.

### Neutral

- Warm white is the main page surface; cream provides section variation.
- Ivory serves light controls and text over imagery; linen backs media.
- Black and ink establish primary text; muted carries supporting copy.
- Line and line-strong provide warm, low-contrast dividers and field borders.

**The Existing Palette Rule.** Extend the existing warm identity rather than giving About a separate visual brand.

## Typography

Display and headings use Cormorant Garamond with Georgia fallback. Body, navigation and controls use Inter with Arial fallback. Large serif headlines are closely led; supporting copy has relaxed reading space. Labels and navigation use compact, bold uppercase text.

The frontmatter records global heading defaults. Page-specific responsive clamps remain in their owning stylesheet; do not normalize them into a new site-wide ramp. About uses short headlines and short supporting sentences rather than long narrative blocks.

## Layout

The shared content container is capped at 1380px with fluid horizontal gutters. The fixed navigation is capped at 1300px and inset from the viewport. Standard sections use responsive vertical spacing; About uses tighter, purpose-specific spacing and large media rather than repeated empty viewport sections.

Navigation collapses at 1040px. At 760px, paired content and media grids stack, staggered project images align, and calls to action wrap vertically. About's interior stage expands beyond the normal text measure; captions overlay the scene instead of reserving a permanent explanation column.

## Elevation & Depth

Depth comes primarily from imagery and the preserved 3D scene. The interface uses diffuse warm shadows for navigation, media and menus, with translucent blurred navigation over imagery. Scene captions use a dark gradient for legibility; this is functional contrast rather than a new page background.

## Shapes

Navigation and buttons use pill silhouettes. Shared media containers and fields use gently rounded surface corners. About editorial images can remain rectangular; the existing system does not require every image to become a rounded card. Borders are thin and warm-toned.

## Components

### Buttons

Compact bold sans-serif pills, with a 46px minimum height. Dark actions pair black with ivory; outlined actions use warm borders; translucent light actions work over imagery. Hover and keyboard focus change their surface or border, and pressed state moves down by 1px.

### Fields

Ivory surfaces, warm borders and generous internal padding. Focus adds a walnut border and soft gold ring. Reuse the existing field styles rather than introducing a different form language on About.

### Navigation

One shared WIN logo, Portfolio, Before + After, About, Contact and WhatsApp arrangement. About is a real `about.html` destination; the logo returns Home. Active state uses the existing pill treatment. Mobile navigation retains the same destinations in the existing menu.

### Interior story

The scene, materials, lights, camera and bidirectional scroll-lock controller are existing approved behavior. Progress drives one active caption at a time; caption placement may alternate on desktop and returns to the left on mobile. Preserve endpoint settling and the requirement for fresh input before page scrolling resumes. Do not introduce a second scrolling controller. Reduced-motion styling keeps only the active caption visible without transition.

## Do's and Don'ts

### Do:

- **Do** reuse the existing warm palette, type families and navigation.
- **Do** make architectural imagery the principal visual content.
- **Do** preserve the existing scene and bidirectional scroll behavior when changing page composition.
- **Do** give each section a clear content purpose and keep supporting text concise.

### Don't:

- **Don't** replace the approved interior with a generic geometric demo.
- **Don't** rebuild the scroll controller to accommodate a layout change.
- **Don't** turn About into a different visual identity.
- **Don't** put the complete About 3D experience back on Home.
