---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

//MUST HAVE
-modern and sleek design
-responsive design
-beautiful animations and transitions
-user our theme engine to support light and dark mode
-only dark and light mode outside of editor (home page, about page, settings page, etc...)
--colors like panel backgrounds, text colors, borders, etc... are for editor only
--use our theme engine to get colors for editor (ex: theme.getColor('editor.background'))


// style guide (core)
- use Antd components
- use Tailwind CSS utilities only for layout, spacing, minor visual tweaks when Antd token/config not suitable
- mobile first, then scale up (define: xs <640, sm 640–767, md 768–1023, lg 1024–1279, xl 1280–1535, 2xl 1536+)
- maintain visual + interaction consistency across components (respect design tokens)
- before any UI change, ensure alignment with design system (tokens, components, patterns)
- use appropriate semantic HTML
- approach all UI/UX tasks as a senior front end web dev with 30 years of experience
- prioritize accessibility and inclusivity
- use skeletons (not spinners) for loading content where structure is predictable
- adhere to WCAG 2.2 AA (contrast, focus order, keyboard nav, reduced motion)

// design system + theming
- centralize color, spacing, typography, radius, shadow, motion, z-index, and opacity in Antd theme config or a tokens file
- prefer token references over hard-coded values
- support light & dark themes; ensure both meet contrast requirements
- define elevation scale (e.g., shadow-sm|md|lg) and use consistently
- typography scale: set heading levels with consistent line-height and responsive scaling
- never inline magic numbers; document rationale if unavoidable

// layout & responsiveness
- implement fluid layouts (max-width wrappers, clamp() for fluid typography where appropriate)
- avoid horizontal scroll on small screens
- ensure touch targets >= 44x44px
- test critical paths on narrow (320px) and large (1440px) widths

// performance & perceived speed
- code-split route-level and heavy components
- prefer Antd Tree Shaking where possible
- lazy load non-critical below-the-fold content
- prefetch likely next routes on idle
- optimize images (next-gen formats, width descriptors, decoding="async")
- minimize layout shifts (reserve space, use skeletons, specify dimensions)

// accessibility details
- every interactive element: visible focus state (do not remove outline without replacement)
- provide ARIA labels only when semantic element insufficient
- ensure motion respects prefers-reduced-motion
- validate forms with inline, accessible messages (aria-live="polite")
- announce async state changes (loading/success/error) to screen readers

// interaction & motion
- use subtle micro-interactions (easing: cubic-bezier(0.4,0,0.2,1) or tokens)
- keep motion duration short (150–250ms standard, 300ms for larger transitions)
- avoid parallax or large motion for users with reduced motion preference
- use motion to reinforce hierarchy and affordance, never purely decorative

// forms & validation
- group related fields with fieldset + legend where meaningful
- label every input (never placeholder-only)
- real-time validation: only after first blur
- show error + recovery guidance
- disable submit only while processing; otherwise allow submission attempts

// component guidelines
- keep components small, focused; container (logic) vs presentational (ui) separation when complexity rises
- ensure reusable components accept className + style overrides safely
- export types/interfaces for props
- document complex component behavior with concise JSDoc

// state & data
- show optimistic UI where safe
- loading states: skeleton (structure), shimmer optional; fallback empty state if data absent
- error states: clear message + retry + support path if critical
- never silently fail

// inclusivity & intl
- support text expansion (avoid truncation assumptions)
- avoid gendered language
- prepare for i18n (no hard-coded copy in components; use message catalog)
- use logical date/number formatting utilities

// dark mode specifics
- test contrast separately; do not simply invert
- maintain accessible focus rings in both themes
- reduce large pure white (#fff) blocks in light mode (prefer near-white tokens) and avoid pure black (#000) in dark mode (use near-black)


// security & resilience
- escape/encode user-generated content
- guard against XSS in dangerouslySetInnerHTML (avoid unless sanitized)
- handle network timeouts gracefully (retry pattern, abort controllers)
- never expose secrets in front-end bundle

// testing
- write unit tests for complex logic (formatters, reducers, hooks)
- write component tests for critical UI flows (render, a11y roles, interaction)
- include accessibility assertions (axe where available)
- snapshot only for stable presentational output

// code quality
- descriptive names
- DRY, modular, composable
- clear error boundaries wrapping major route segments
- prefer early returns for readability
- exhaustive switch/conditional handling for discriminated unions

// review checklist (pre-merge)
- design tokens used? (no magic values)
- responsive at key breakpoints?
- keyboard + screen reader usable?
- performance: no excessive re-renders or large bundle additions?
- tests added/updated?
- error + empty + loading states covered?
- theming/dark mode verified?

// visual polish
- consistent spacing rhythm (use spacing scale)
- align elements to an 8px baseline grid (allow 4px exceptions sparingly)
- avoid visual clutter: negative space is intentional
- use color primarily for meaning and emphasis, not decoration
- limit simultaneous accent colors to maintain hierarchy

// logging & analytics
- instrument critical user journeys (anonymized)
- avoid logging sensitive data
- debounce high-frequency events

// adoption guidance
- before introducing a new library, justify vs existing stack
- prefer native / existing Antd capability before custom

// do nots
- do not nest more than 3 flex/grid wrappers without reason
- do not block main thread with heavy synchronous loops (offload / debounce)
- do not rely solely on color to convey state
- do not introduce breaking visual changes without design sign-off

