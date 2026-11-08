# PocketPot — "Invest in the Future"
### Key Stage 2 (Ages 7–11) Educational Savings Application
**Dual-Access Architecture (Teacher Dashboard & Child-Facing Pots App)**  
**Zero-PII, GDPR & COPPA Compliant**

---

## 1. Quick Start Guide

Install dependencies and start the local development server directly from this folder:

```bash
# 1. Install dependencies
npm install

# 2. Run the Next.js local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Key Stage 2 Features & Routes

### A. Teacher Class Creation & Quick-Add Roster
- **Form Component:** [`ClassSetup.tsx`](src/components/teacher/ClassSetup.tsx) in the Teacher Dashboard.
- **Separate Child Name Boxes:** Starts with 5 separate input boxes, with an interactive **"+ Add More Pupils"** button to append more boxes dynamically.
- **Privacy Mode Selector:**
  - **Anonymise Names:** Generates educational animal codenames (e.g., *"Calm River Otter #101"*). No real names are stored anywhere.
  - **Use First Name:** Displays the child's entered first name locally on their screen and desk cards.
- **Local Storage Safeguard Notice:** Reminds teachers that first names are stored **strictly in local browser storage** and never sent to remote servers (100% Zero-PII cloud compliance).
- **Duplicate Class Prevention:** Automatically verifies class names against existing classes (case-insensitive) and prevents duplicate creation.
- **Autonomous Zero-PII Generation:** Each student receives a cryptographically secure **UUID v4**, an educational animal codename, a desk badge number, and default starter Savings Pots.
- **6-Digit Class Join Code:** Automatically generated (e.g., `749281`) for classroom pairing and desk handout slips.

### B. Child-Facing Fintech Banking Dashboard (`/pupil/[pupilId]`)
- **Main View Route:** [`src/app/pupil/[pupilId]/page.tsx`](src/app/pupil/[pupilId]/page.tsx).
- **Fintech Banking Aesthetic:** Designed like a modern digital banking app for KS2 learners.
- **Child's Bank Card:** Visual debit card ([`ChildBankCard.tsx`](src/components/ui/ChildBankCard.tsx)) featuring the child's name, metallic golden EMV chip, contactless wave symbol, card snippet `•••• 4821`, and Calming Teal / Slate Navy gradients.
- **Top Balance Card:** Isolated white card island with clear available card balance at **minimum 24sp** (`text-island-lg` = `2.25rem` / `36px`).
- **Recent Activity:** Displays exactly the **last 3 transactions** with date, category icon, amount, and growth-mindset note.

### C. Dedicated Savings Pots Page (`/pupil/[pupilId]/pots`)
- **Route:** [`src/app/pupil/[pupilId]/pots/page.tsx`](src/app/pupil/[pupilId]/pots/page.tsx).
- **Interactive Move Money (Deposit & Withdraw):**
  - **Deposit:** Move seeds from available card balance into any Savings Pot (`+50p`, `+£1.00`).
  - **Withdraw:** Take seeds out of a Savings Pot back into the main card balance (`-50p`, `-£1.00`).
- **Physical Pot Aesthetic:** Distinct tactile rims, recessed viewing chambers with calibration markings, and 24sp isolated white card islands.
- **Non-Punitive Pedagogy:** Reflects growth mindset with "taking a pause" notices and celebration alerts.

### D. Teacher Observation / Impersonation Mode
- **Modal Component:** [`PupilInspectModal.tsx`](src/components/teacher/PupilInspectModal.tsx).
- **Inspect View Button:** Available next to each student in the class roster.
- **Read-Only Peek State:** Fetches and displays that student's live savings pots and coin balances in real-time, allowing the teacher to see exactly what the child sees without altering their live account state.

---

## 3. Brand & Design System Tokens

| Token Name | Hex Code | CSS Variable | Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#F8F9FA` | `--color-canvas` | Warm Off-White foundational canvas |
| **Surface Card** | `#FFFFFF` | `--color-surface` | Clean White card surfaces & numerical islands |
| **Primary Text** | `#1E293B` | `--color-primary-text` | Slate Navy high-contrast text |
| **Brand Primary** | `#0D9488` | `--color-brand-primary` | Calming Teal accent & pot rims |
| **Brand Secondary** | `#D97706` | `--color-brand-secondary` | Warm Amber accent & milestones |
| **Positive State** | `#15803D` | `--color-positive-state` | Sage Green completion & steady achievements |
| **Warning State** | `#C2410C` | `--color-warning-state` | Soft Terracotta non-punitive pause notices |
| **Focus Indicator** | `#4338CA` | `--color-focus-indicator` | Electric Indigo 3px accessible focus rings |

---

## 4. Firestore Security Rules Summary (`firestore.rules`)

1. **Default Deny:** Catch-all blocks all unauthorized operations.
2. **Subpath Roster Security (`/classes/{classId}/pupils/{pupilId}`):**
   - **Teachers:** Authorized teacher of `classId` can create anonymous rosters, view pupil lists, and inspect live pots.
   - **Pupils:** Authenticated pupil with `request.auth.uid == pupilId` can read/write ONLY to their own record and pots.
   - **Cross-Pupil Isolation:** Blocked completely. A student cannot read or modify any other student's account or pots.
3. **Payload Sanitizer (`hasNoPII`):** Rejects any document containing real names, emails, phone numbers, or dates of birth.
