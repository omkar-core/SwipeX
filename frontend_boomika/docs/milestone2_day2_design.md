# SwipeX — Milestone 2: Day 2 Deliverables
## Role: Intern 1 — Frontend & User Experience

> All Day 2 checkpoints are completed, tested, and verified with zero compilation errors (`tsc --noEmit` & `npm run build`). All deliverables are documented below based on the actual codebase implementation.

---

### Table of Contents
1. [Executive Summary & Checkpoint Status](#1-executive-summary--checkpoint-status)
2. [Key Findings & Component Implementations](#2-key-findings--component-implementations)
   - [2.1 Job Card Component (`src/components/discover/JobCard.tsx`)](#21-job-card-component-srccomponentsdiscoverjobcardtsx)
   - [2.2 Swipe Gesture Engine (`src/components/discover/SwipeDeck.tsx`)](#22-swipe-gesture-engine-srccomponentsdiscoverswipedecktsx)
   - [2.3 Filters Panel Scaffold (`src/components/discover/FiltersPanel.tsx`)](#23-filters-panel-scaffold-srccomponentsdiscoverfilterspaneltsx)
   - [2.4 Data Abstraction Layer & Mock Dataset (`src/hooks/useJobFeed.ts`)](#24-data-abstraction-layer--mock-dataset-srchooksusejobfeedts)
3. [Flags for Team Standup (Day 2 EOD Contract Freeze)](#3-flags-for-team-standup-day-2-eod-contract-freeze)
4. [Architecture Notes & Scope Boundaries](#4-architecture-notes--scope-boundaries)
5. [Day 3 Readiness & Next Steps](#5-day-3-readiness--next-steps)

---

## 1. Executive Summary & Checkpoint Status

| Checkpoint | Target | Status | Notes |
|---|---|:---:|---|
| **Job Card Component** | Build reusable `JobCard` with logo, title, salary, freshness, and competition badges | <span style="color: #10B981; font-weight: bold;">✅ Completed</span> | Implemented in `src/components/discover/JobCard.tsx` consuming `MOCK_JOBS_M2`. |
| **Swipe Gesture Engine** | Framer Motion drag physics, stamp overlays, button triggers, keyboard nav, and undo | <span style="color: #10B981; font-weight: bold;">✅ Completed</span> | Implemented in `src/components/discover/SwipeDeck.tsx` (60fps GPU transforms, zero `react-tinder-card`). |
| **Filters Panel Scaffold** | Build search bar, company type, work env, salary slider, and quick-filter chips | <span style="color: #10B981; font-weight: bold;">✅ Completed</span> | Implemented in `src/components/discover/FiltersPanel.tsx` using local state. |
| **Swipe Side-Effect Isolation** | Decouple swipe recording from UI/animation loops for Day 3 live API hookup | <span style="color: #10B981; font-weight: bold;">✅ Completed</span> | `recordSwipe()` isolated in `src/hooks/useJobFeed.ts`. Swapping to `POST /swipes` is a one-line change. |

---

## 2. Key Findings & Component Implementations

### 2.1 Job Card Component (`src/components/discover/JobCard.tsx`)
- **Data Source:** Consumes typed `Job` objects populated by `src/data/mockJobsMilestone2.ts`.
- **Rendered Elements & Layout:**
  - **Banner & Media:** Header image banner with darkened gradient overlay, dynamic category fallbacks (`src/utils/getJobImage.ts`), and high-resolution brand avatar with initial fallback.
  - **Milestone 2 Indicators:**
    - *Freshness Badge:* Computed dynamically (`✨ New Today`, `🕒 1d ago`, `🕒 2d ago`).
    - *Competition Metric:* Highlights `⚡ Low Competition (<10 applicants)` (e.g. Nexus Tech, Resend) or `🔥 High Demand` (Stripe, Google).
    - *Badges & Meta:* Floating `Hot Match 🔥` badge, Company Category (`Building2` `MNC` / `High-Growth Startup` / `Seed-Stage`), and Work Environment (`Briefcase` `Remote` / `Hybrid` / `On-site`).
  - **Tech Stack & Tooling:** Skill tags chips (`skills_required` / `skills`) with overflow counter (`+N more`).
  - **Action Controls:** Floating action bar with focusable, accessible buttons for **Undo (↺)**, **Pass (✕)**, and **Save & Apply (❤️)** equipped with `aria-label` tags and focus rings.

### 2.2 Swipe Gesture Engine (`src/components/discover/SwipeDeck.tsx`)
- **Physics & GPU Acceleration:**
  - Driven by Framer Motion's `useMotionValue(0)` and `useTransform` for smooth horizontal translation (`x`), 3D tilt rotation (`[-250, 250] -> [-15deg, 15deg]`), and scale compression (`cardScale`).
  - Strict absence of `react-tinder-card` (confirmed 0 references in the repository).
- **Dynamic Stamp Overlays:**
  - `SAVE & APPLY` stamp (Emerald/Heart): Opacity mapped to positive drag offset (`x: [20, 110] -> [0, 1]`) and scale (`[0.8, 1.05]`).
  - `PASS` stamp (Rose/X): Opacity mapped to negative drag offset (`x: [-20, -110] -> [0, 1]`) and scale (`[0.8, 1.05]`).
- **Unified `commitSwipe()` Action Handler:**
  - Both manual drag release past the ±85px threshold, JobCard button clicks (Pass/Save), and keyboard navigation (`ArrowRight` = Save, `ArrowLeft` = Pass) route through the exact same `commitSwipe(direction: 'right' | 'left')` function. No duplicated animation or state logic.
- **Undo Restoration:**
  - Invoking Undo (`Ctrl+Z` or button click) calls `undoLastSwipe()`, resets motion coordinates (`x.set(0)`), and smoothly restores the previous card to the top of the stack with entrance physics.
- **Multi-Card Stack Depth:**
  - Underneath the active top card, `SwipeDeck` renders a preview of `nextJob` scaled at `0.96` with `opacity: 0.6` to give authentic visual deck depth.
- **Empty State:**
  - Renders a clean "You're All Caught Up!" view with an instant "Reset Mock Deck" trigger when all cards are exhausted.

### 2.3 Filters Panel Scaffold (`src/components/discover/FiltersPanel.tsx`)
- **Controls Implemented:**
  1. *Keyword Search Input:* Text field for job title, skills, or company with search icon.
  2. *Quick-Filter Chips:* Interactive toggle chips for `✨ Fresher-Friendly`, `⚡ Low Competition`, and `🕒 Recently Posted` with active visual state indicators (`bg-blue-600`, `bg-amber-500`, `bg-emerald-600`).
  3. *Company Category Selector:* Multi-select checkboxes for *MNCs (500+)*, *High-Growth Startups*, and *Seed-Stage*.
  4. *Work Environment:* Toggle pills for *Remote*, *Hybrid*, and *On-site*.
  5. *Salary Slider:* Interactive range slider ($40,000 – $250,000+) with real-time numeric readout.
- **Scope Discipline:** State is managed purely within local React state (`useState<FiltersState>`). No network requests or `/jobs/search` endpoints are called (scheduled for Day 4).

### 2.4 Data Abstraction Layer & Mock Dataset (`src/hooks/useJobFeed.ts`)
- **Data Hook (`useJobFeed`):**
  - Manages in-memory feed state (`jobs`, `currentJob`, `nextJob`, `currentIndex`, `isDeckEmpty`, `canUndo`, `swipedHistory`).
  - Encapsulates `recordSwipe(jobId, direction)` to manage history tracking independently of UI components.
  - On Day 3, swapping this function to call `POST /api/v1/swipes` and fetching initial data from `GET /api/v1/jobs` is isolated directly to this hook without requiring any edits to `JobCard` or `SwipeDeck`.
- **Mock Dataset (`src/data/mockJobsMilestone2.ts`):**
  - Contains 6 structured jobs matching the expected `JobOut` schema (Nexus Tech, Stripe, Resend, Supabase, Google, Raycast) with placeholder fields for `applicant_count`, `posted_at`, `company_type`, and `competition_level`.

---

## 3. Flags for Team Standup (Day 2 EOD Contract Freeze)

The following items are submitted for formal confirmation during today's EOD contract freeze standup:

| Item | Dependency | Current Status | Action Needed Before Day 2 EOD Freeze |
|---|---|:---:|---|
| **`applicant_count` & `posted_at` in `JobOut`** | Intern 2 / Intern 3 | ⚠️ Pending backend schema update | Ensure `app/schemas/swipe.py` includes `posted_at: datetime` and `applicant_count: Optional[int] = 0` so the frontend doesn't need field fallback logic. |
| **`GET /api/v1/companies` Contract** | Intern 2 | ⏳ Required by Day 4 | Agree on query parameters (`?type=&industry=&search=`) and response schema (`company_id`, `name`, `logo`, `type`, `open_jobs_count`). |
| **Swipe Action Payload Shape** | Intern 2 | ✅ Confirmed & Aligned | Request body `{"job_id": "string", "direction": "right" | "left"}` returns `201 Created` with `{"swipe_id": int}`. |
| **Undo / Mind-Change Strategy** | Backend SwipeService | ✅ Confirmed & Aligned | Backend UPSERT on `(user_id_ref, job_id_ref)` verified in `app/models/swipe.py`. |

---

## 4. Architecture Notes & Scope Boundaries

### Component Hierarchy & Interaction Flow
```text
DiscoverScreen (Main Container)
 ├── User Profile Summary Card
 ├── FiltersPanel (Local State Scaffold)
 └── SwipeDeck (Framer Motion Engine)
      ├── Stamp Overlays (Dynamic Opacity / Scale)
      ├── Stack Depth Preview (nextJob)
      └── JobCard (Top Active Card)
           ├── Banner & Brand Badges (Freshness, Competition, Hot Match)
           ├── Info & Tech Stack Chips
           └── Floating Action Controls (Undo, Pass, Save)
```

### Strict Scope Discipline Maintained
Per the Milestone 2 day-by-day plan, the following items were **deliberately NOT built or wired today**:
- ❌ **No live `GET /api/v1/jobs` or `POST /api/v1/swipes` calls** (scheduled for Day 3).
- ❌ **No live `/jobs/search` API wiring** (scheduled for Day 4).
- ❌ **No Company & Startup Directory pages** (scheduled for Day 4).
- ❌ **No AI/ML recommendation feed replacement** (scheduled for Day 5).
- ❌ **No Recruiter vs Candidate RBAC splitting** (scheduled for Day 5).

---

## 5. Day 3 Readiness & Next Steps

With all Day 2 components fully decoupled and verified, the codebase is **100% prepared for Day 3**:

1. **Live Feed Hookup:** Wire `useJobFeed.ts` to `ApiService.getJobs()` (`GET /api/v1/jobs`).
2. **Swipe Recording:** Wire `recordSwipe()` in `useJobFeed.ts` to `ApiService.postSwipe()` (`POST /api/v1/swipes`).
3. **Optimistic Updates & Live Undo:** Ensure local swipe deck advances instantly while persisting to the backend, with seamless rollback on failure.
