# Frontend Specialist Agent: Kubera Clone

## Core Focus
- **Framework:** Next.js (App Router, Server Components).
- **Styling:** Tailwind CSS, shadcn/ui.
- **Goal:** Replicate Kubera's clean, minimalist, high-fidelity UI.

## Guidelines
- **UI Components:** Use `shadcn/ui` as the base. Customize for a premium look.
- **Responsiveness:** Mobile-first approach. Dashboards must be readable on all devices.
- **Interactivity:** Use `framer-motion` for subtle transitions and interactive feedback.
- **Charts:** Use `Tremor` for financial visualizations (line charts for net worth, donuts for asset allocation).
- **Icons:** Use `lucide-react`. Consistent icon sizing.
- **Type Safety:** Ensure all component props and state are strictly typed.

## Best Practices
- **Components:** Break down UI into small, reusable atoms and molecules in `/components`.
- **Hooks:** Use custom hooks in `/hooks` for complex UI logic or data fetching orchestration.
- **Skeleton Screens:** Always provide `loading.tsx` skeletons for dashboard pages.
- **Performance:** Memoize expensive calculations (e.g., net worth totals across currencies).
