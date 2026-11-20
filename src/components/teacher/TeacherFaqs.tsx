"use client";

import React, { useState, useMemo } from "react";
import {
  HelpCircle,
  Search,
  ShieldCheck,
  Lock,
  Cloud,
  Briefcase,
  ChevronDown,
  Sparkles,
  GraduationCap,
  CreditCard,
  Printer,
  Coins,
  ShoppingBag,
  Laptop,
  Users,
  CheckCircle2,
  KeyRound,
  PiggyBank,
} from "lucide-react";

export type FaqCategory =
  | "setup"
  | "cards"
  | "money"
  | "jobs"
  | "marketplace"
  | "safeguarding"
  | "devices";

export interface FaqItem {
  id: string;
  category: FaqCategory;
  categoryLabel: string;
  question: string;
  answer: React.ReactNode;
}

export const FAQS_DATA: FaqItem[] = [
  // ==========================================
  // 1. CLASS SETUP & PUPILS
  // ==========================================
  {
    id: "faq-setup-class",
    category: "setup",
    categoryLabel: "Class Setup & Pupils",
    question: "How do I create a new class in PocketPot?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Teachers can set up a complete classroom cohort in seconds using two approaches:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1">
          <li>
            <strong>1-Click Fast Track:</strong> Pre-populates recommended UK KS2 defaults: a £5.00 account opening deposit, £5.00 automated Friday basic income, starter savings pots (<em>Book Fair</em>, <em>Class Trip</em>), popular jobs (<em>Eco Warrior</em>, <em>Tech Support</em>, <em>Line Leader</em>), and interactive behaviour rewards.
          </li>
          <li>
            <strong>Custom Setup Wizard:</strong> Allows you to choose your own class name (e.g. <em>Year 4 Oak</em>), year group (Years 3–6), privacy mode, custom opening balances, and specific starter pots or roles.
          </li>
        </ul>
        <p>
          You can edit any classroom settings at any point after creation by clicking <strong>Edit Class</strong> on your class card.
        </p>
      </div>
    ),
  },
  {
    id: "faq-csv-upload",
    category: "setup",
    categoryLabel: "Class Setup & Pupils",
    question: "Can I upload my class list from a CSV or school MIS spreadsheet?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Yes! In the <strong>Class Setup</strong> tab, click <strong>Upload Classlist CSV</strong>.
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>You can upload a CSV file or paste pupil first names directly from SIMS, Arbor, Bromcom, or Excel.</li>
          <li>
            <strong>Zero-PII Safeguarding:</strong> PocketPot automatically ignores surnames, email addresses, phone numbers, and dates of birth to keep pupil data safe and GDPR-compliant.
          </li>
          <li>Each pupil is instantly assigned an individual desk badge number (#101, #102...) and digital card profile.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-naming-options",
    category: "setup",
    categoryLabel: "Class Setup & Pupils",
    question: "What is the difference between 'Animal Codenames' and 'Classroom First Names'?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          PocketPot supports two privacy modes designed for primary schools:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1">
          <li>
            <strong>Animal Codenames (Maximum Cloud Anonymity):</strong> Each child receives an endearing UK nature pseudonym (such as <em>Swift Fawn #101</em> or <em>Curious Forest Fox #102</em>). Pupil records are 100% pseudonymized both in the classroom and in cloud databases.
          </li>
          <li>
            <strong>Classroom First Names (Familiar Recognition):</strong> Displays first names on the teacher’s screen and on printed cards (e.g. <em>Lucas #101</em>). First names remain strictly in your local device browser storage and are never uploaded with surnames to remote servers.
          </li>
        </ul>
        <p>
          You can switch between these modes at any time by clicking <strong>Edit Class</strong> on your classroom card.
        </p>
      </div>
    ),
  },
  {
    id: "faq-add-pupil-midyear",
    category: "setup",
    categoryLabel: "Class Setup & Pupils",
    question: "How do I add a new student who joins my class mid-year?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Adding mid-year joiners is quick and seamless:
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Go to the <strong>Class Setup</strong> tab and click the <strong>+ Add Pupil</strong> button.</li>
          <li>Enter the child&apos;s first name (or assign an animal codename).</li>
          <li>Confirm their starting balance (defaults to your class opening balance, e.g. £5.00).</li>
        </ol>
        <p>
          PocketPot automatically assigns the next available desk badge number, sets up their starter savings pots, and generates their secret 4-digit PIN.
        </p>
      </div>
    ),
  },
  {
    id: "faq-edit-delete-class",
    category: "setup",
    categoryLabel: "Class Setup & Pupils",
    question: "How do I edit classroom settings or delete a class?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          On both the <strong>Teacher Dashboard</strong> and <strong>Admin Portal</strong>, each class card features dedicated management buttons:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>
            <strong>Edit Class:</strong> Update the class name, year group, weekly basic income amount, weekly payout day, or toggle anonymity settings.
          </li>
          <li>
            <strong>Delete Class:</strong> Safely archive or remove a classroom at the end of the school year. A confirmation modal prevents accidental deletions, and all associated pupil accounts, badges, and pots are safely cleaned up.
          </li>
          <li>
            <strong>Delete Student:</strong> Individual students can also be removed from the class list in Class Setup if a child moves schools.
          </li>
        </ul>
      </div>
    ),
  },

  // ==========================================
  // 2. DEBIT CARDS & LOGINS
  // ==========================================
  {
    id: "faq-student-logins",
    category: "cards",
    categoryLabel: "Debit Cards & Logins",
    question: "How do pupils log into PocketPot on classroom tablets or Chromebooks?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Children never need personal email accounts, Google accounts, or complex passwords.
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Pupils open PocketPot on their tablet or browser and tap <strong>Pupil Login</strong>.</li>
          <li>They enter the <strong>6-Digit Classroom Join Code</strong> (e.g. <code>512222</code>).</li>
          <li>They tap their <strong>Desk Badge Number</strong> (e.g. #101) or avatar.</li>
          <li>They enter their secret <strong>4-Digit PIN</strong> (found on their printed debit card).</li>
        </ol>
        <p>
          This touch-friendly workflow allows an entire class of 30 pupils to get logged in and ready in under 60 seconds.
        </p>
      </div>
    ),
  },
  {
    id: "faq-print-class-cards",
    category: "cards",
    categoryLabel: "Debit Cards & Logins",
    question: "How do I print debit cards for my pupils?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          In the <strong>Class Setup</strong> tab, click the <strong>Print Class Cards</strong> button.
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>
            <strong>A4 Ready:</strong> Cards are precisely formatted with <strong>two cards per width</strong> on standard A4 portrait paper, making them quick and economical to print, cut, and laminate.
          </li>
          <li>
            <strong>Card Replica:</strong> Replicates the green contactless debit card from the app, complete with the pupil&apos;s name, desk badge number, 4-digit PIN, and classroom join code.
          </li>
          <li>
            <strong>Dotted Edges:</strong> A clean dotted outline guides cutting without wasteful outer borders or unnecessary text prompts.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-print-join-poster",
    category: "cards",
    categoryLabel: "Debit Cards & Logins",
    question: "How do I print the Class Join Code poster for my classroom wall?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          In the <strong>Class Setup</strong> tab, click <strong>Print Class Join Code</strong>.
        </p>
        <p>
          This generates a clean, branded <strong>A4 Landscape Poster</strong> featuring:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>The official PocketPot logo and friendly mascot characters.</li>
          <li>Your class name (e.g. <em>Year 4 Oak</em>).</li>
          <li>The 6-digit Classroom Join Code displayed central and extra large so children can easily read and type it into classroom tablets from anywhere in the room.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-forgotten-pin",
    category: "cards",
    categoryLabel: "Debit Cards & Logins",
    question: "What should I do if a pupil forgets their 4-digit PIN?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Teachers have instant 1-click PIN management in the Class Setup roster:
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Find the pupil&apos;s row in the Class List and click the <strong>Key icon (Reset PIN)</strong>.</li>
          <li>The pop-up immediately reveals their current 4-digit PIN so you can remind them.</li>
          <li>If needed, you can click <strong>Generate New PIN</strong> or type in a custom 4-digit number.</li>
        </ol>
        <p>
          The updated PIN takes effect instantly without locking the child out of their account.
        </p>
      </div>
    ),
  },
  {
    id: "faq-home-access",
    category: "cards",
    categoryLabel: "Debit Cards & Logins",
    question: "Can children access PocketPot from home with their parents?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Yes! A pupil&apos;s printed debit card contains everything they need to log in from home: the Classroom Join Code, Desk Badge Number, and secret PIN.
        </p>
        <p>
          Pupils can log in on home tablets or laptops to show parents their weekly earnings, savings pot progress, and job achievements, fostering positive family conversations around money.
        </p>
      </div>
    ),
  },

  // ==========================================
  // 3. MONEY, POTS & PAYDAY
  // ==========================================
  {
    id: "faq-scheduled-payouts",
    category: "money",
    categoryLabel: "Money, Pots & Payday",
    question: "What is Weekly Basic Income and does it require manual teacher approval?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          <strong>Weekly Basic Income</strong> (Universal Basic Income in school) is a baseline weekly allowance (e.g. £2.00 or £5.00) credited automatically to every pupil&apos;s debit card.
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1">
          <li>
            <strong>100% Automated:</strong> The system verifies the calendar and deposits funds on your chosen payout day (e.g. Friday at 08:00 AM). Teachers do not need to click any buttons or remember to approve payouts.
          </li>
          <li>
            <strong>Financial Inclusion:</strong> It guarantees that all children—regardless of whether they hold a classroom role—have funds to practise budgeting, delayed gratification, and saving into pots.
          </li>
          <li>
            <strong>Combined with Wages:</strong> Pupils with active classroom jobs receive their job wage automatically on the exact same payday.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-savings-pots",
    category: "money",
    categoryLabel: "Money, Pots & Payday",
    question: "How do Savings Pots work, and can pupils create their own?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Savings Pots teach children the fundamental habit of &quot;paying yourself first&quot; and separating spending money from savings:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1">
          <li>
            <strong>Moving Funds:</strong> Children can deposit money from their card into a pot or withdraw it back to their card at any time using an intuitive slider or quick-amount buttons.
          </li>
          <li>
            <strong>Target Goals &amp; Progress Rings:</strong> Each pot displays an animated circular progress ring, showing how close the child is to their goal.
          </li>
          <li>
            <strong>Celebration Effects:</strong> Reaching a savings goal triggers celebratory confetti and positive on-screen feedback.
          </li>
          <li>
            <strong>Custom Pots:</strong> In addition to preset pots (*Book Fair*, *Class Trip*), pupils can create custom pots with their own names, target amounts, and pastel themes.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-non-punitive",
    category: "money",
    categoryLabel: "Money, Pots & Payday",
    question: "Can a pupil's account balance ever go negative or receive monetary fines?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Never. In accordance with UK KS2 educational safeguarding and PocketPot non-punitive guidelines:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>Balances are hard-capped at £0.00 minimum. Overdrafts, interest charges, and debt are mathematically impossible.</li>
          <li>Withdrawals and marketplace purchases cannot exceed the available balance on the card.</li>
          <li>
            PocketPot strictly prohibits punitive fines. Financial learning should inspire confidence, responsibility, and security rather than anxiety or shame.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-peer-transfers",
    category: "money",
    categoryLabel: "Money, Pots & Payday",
    question: "Can children transfer money to each other (peer-to-peer transfers)?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          No. To protect pupils from classroom coercion, peer pressure, or accidental transfers, child-to-child monetary transfers are intentionally prohibited.
        </p>
        <p>
          All funds originate from legitimate classroom activities (basic income, job wages, and teacher behaviour bonuses), and move strictly between a pupil&apos;s own card, their savings pots, and the classroom marketplace.
        </p>
      </div>
    ),
  },
  {
    id: "faq-opening-balance",
    category: "money",
    categoryLabel: "Money, Pots & Payday",
    question: "What is the Initial Opening Balance when creating a class?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          When a class is first created, every pupil receives an initial starter balance (e.g. £5.00 or £7.00) deposited directly into their card.
        </p>
        <p>
          This ensures that from Day 1, pupils have real practice capital to explore transferring money into savings pots, reading their transaction feed, and understanding digital currency before their first weekly payday arrives.
        </p>
      </div>
    ),
  },

  // ==========================================
  // 4. CLASSROOM JOBS & BONUSES
  // ==========================================
  {
    id: "faq-jobs-board",
    category: "jobs",
    categoryLabel: "Jobs & Bonuses",
    question: "How does the Classroom Jobs Board and CV application process work?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          The Jobs Board introduces pupils to career aspirations and real-world application processes in an encouraging, supportive environment:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 pl-1">
          <li>
            <strong>Posting Jobs:</strong> Teachers post classroom roles (e.g. <em>Eco Warrior</em>, <em>Tech Support</em>, <em>Librarian</em>, <em>Line Leader</em>) with a weekly wage (e.g. £1.50), term length (e.g. 4 weeks), and required qualities.
          </li>
          <li>
            <strong>Pupil Applications:</strong> Pupils browse open roles, select qualities that match them (e.g. <em>Organised</em>, <em>Reliable</em>, <em>Enthusiastic</em>), and write a short CV statement.
          </li>
          <li>
            <strong>Teacher Hiring:</strong> Teachers review applications from their Jobs Board tab and hire a candidate. A celebratory alert is sent to the hired pupil, and encouraging positive messages are sent to other applicants.
          </li>
          <li>
            <strong>Wage Automation:</strong> The weekly wage is paid automatically into the hired pupil&apos;s card balance every payday for the duration of the term.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: "faq-completed-jobs-references",
    category: "jobs",
    categoryLabel: "Jobs & Bonuses",
    question: "What happens when a job term completes, and how do teacher references work?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          One week prior to and upon term completion, automated notifications remind the teacher and pupil that the role term is concluding.
        </p>
        <p>
          Upon completion, the teacher selects a positive reference from a pre-populated list personalised with the child&apos;s strengths. The role is permanently archived into the child&apos;s <strong>Completed Jobs Portfolio</strong>, which automatically attaches to any future job applications they submit!
        </p>
      </div>
    ),
  },
  {
    id: "faq-bonuses-whiteboard",
    category: "jobs",
    categoryLabel: "Jobs & Bonuses",
    question: "How do instant bonuses work on the Interactive Whiteboard?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          The <strong>Bonuses</strong> dashboard is engineered specifically for classroom touchscreens (SMART Boards, Promethean, ViewSonic):
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1">
          <li>
            <strong>Touch Cards:</strong> Displays positive behaviours (e.g. <em>Kind Helper</em>, <em>Great Focus</em>, <em>Team Player</em>, <em>Perseverance</em>) with micro-rewards (e.g. 10p, 15p, 20p, 50p).
          </li>
          <li>
            <strong>Quick Multi-Select:</strong> Tap any card to open the whiteboard overlay, tap one or several pupils (or select all), and hit confirm.
          </li>
          <li>
            <strong>Sound &amp; Visual Celebration:</strong> Plays an uplifting 4-note musical chime via the Web Audio API and triggers a colourful confetti burst.
          </li>
          <li>
            <strong>Immediate Credit:</strong> The bonus amount credits directly to the child&apos;s card balance and appears in their ledger as <code>Bonus - [Description]</code>.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-behaviour-deductions",
    category: "jobs",
    categoryLabel: "Jobs & Bonuses",
    question: "Can I take money away or fine a pupil for misbehaviour?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          No. PocketPot is strictly positive and non-punitive. Research shows that penalizing children by deducting digital currency damages financial confidence and disengages disadvantaged learners.
        </p>
        <p>
          Classroom behaviour management should follow your school&apos;s standard pastoral policy, keeping financial learning encouraging, empowering, and stress-free.
        </p>
      </div>
    ),
  },

  // ==========================================
  // 5. CLASSROOM MARKETPLACE & REWARDS
  // ==========================================
  {
    id: "faq-marketplace-overview",
    category: "marketplace",
    categoryLabel: "Class Marketplace",
    question: "What is the Classroom Marketplace and what can pupils purchase?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          The <strong>Classroom Marketplace</strong> allows pupils to redeem their hard-earned money for meaningful classroom privileges and rewards:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1">
          <li>
            <strong>Privilege Catalog:</strong> Teachers offer non-monetary rewards such as <em>15 Mins Golden Time</em>, <em>Sit with a Friend for a Day</em>, <em>Line Leader for a Week</em>, <em>Homework Pass</em>, or <em>Choose the Class Story</em>.
          </li>
          <li>
            <strong>Tiered Goals:</strong> Items can be categorized into <em>Short-term</em> (e.g. £1.00), <em>Medium-term</em> (e.g. £3.00), or <em>Milestone</em> (e.g. £5.00) rewards, reinforcing multi-week saving habits.
          </li>
          <li>
            <strong>Teacher Customization:</strong> Teachers can add, edit, or disable rewards, set custom prices, and adjust icons anytime.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-marketplace-fulfilment",
    category: "marketplace",
    categoryLabel: "Class Marketplace",
    question: "How do teachers approve, fulfill, or refund marketplace purchases?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          When a child purchases a privilege from their tablet:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 pl-1">
          <li>The price is deducted from their card, and an order appears in the <strong>Orders &amp; Redemptions</strong> tab of the Teacher Marketplace.</li>
          <li>When you grant the privilege during class, click <strong>Fulfill</strong> to mark the order complete.</li>
          <li>If an item was ordered by mistake or cannot be redeemed, click <strong>Refund</strong> to instantly restore the exact pence to the child&apos;s card balance.</li>
        </ol>
      </div>
    ),
  },

  // ==========================================
  // 6. SAFEGUARDING & ZERO-PII
  // ==========================================
  {
    id: "faq-gdpr-compliance",
    category: "safeguarding",
    categoryLabel: "Safeguarding & Zero-PII",
    question: "How does PocketPot comply with UK GDPR and DfE data protection standards?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          PocketPot is built specifically for UK Key Stage 2 (Ages 7–11) education and adheres strictly to both <strong>UK/EU GDPR</strong> and <strong>DfE Cloud Services Guidance</strong> through our Zero Personal Identifiable Information (Zero-PII) architecture.
        </p>
        <p>
          Under this standard, no pupil surnames, personal email addresses, telephone numbers, home addresses, dates of birth, or photographs are ever collected, transmitted to, or stored on remote cloud database servers.
        </p>
      </div>
    ),
  },
  {
    id: "faq-pupil-names",
    category: "safeguarding",
    categoryLabel: "Safeguarding & Zero-PII",
    question: "Where are pupils' real names stored, and why are surnames prohibited?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Any pupil first names entered by teachers into the Class Setup roster remain <strong>exclusively in local browser storage on your computer</strong>.
        </p>
        <p>
          In cloud storage, pupils exist solely under randomized UUID v4 identifiers paired with friendly nature codenames (such as <em>Calm River Otter</em> or <em>Curious Forest Fox</em>).
        </p>
        <p>
          Surnames are strictly forbidden across the platform. If a teacher accidentally enters a surname, PocketPot automatically strips it out before saving, preventing accidental PII exposure.
        </p>
      </div>
    ),
  },
  {
    id: "faq-account-permissions",
    category: "safeguarding",
    categoryLabel: "Safeguarding & Zero-PII",
    question: "Can pupils access teacher controls or view other children's balances?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          No. PocketPot enforces strict account and routing boundaries:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1">
          <li>
            <strong>Pupil View:</strong> Children can only access their personal contactless debit card, their personal savings pots, and the classroom jobs board.
          </li>
          <li>
            <strong>Teacher View:</strong> Class-wide roster administration, monetary policies, job management, and bonus allocations require authenticated teacher credentials and are inaccessible to student routes.
          </li>
          <li>
            <strong>Peer Privacy:</strong> Pupils have zero visibility into other children&apos;s balances, savings pot totals, or job application statements.
          </li>
        </ul>
      </div>
    ),
  },

  // ==========================================
  // 7. DEVICES & MULTI-TEACHER
  // ==========================================
  {
    id: "faq-devices-supported",
    category: "devices",
    categoryLabel: "Devices & Multi-Teacher",
    question: "Which classroom devices and interactive whiteboards are supported?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          PocketPot is a responsive progressive web application that runs directly in any modern browser without installing any software or app store downloads:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li><strong>Front-of-Class:</strong> Interactive touchscreens and whiteboards (SMART Boards, Promethean, ViewSonic, Clevertouch).</li>
          <li><strong>Pupil Devices:</strong> iPads, Android tablets, Chromebooks, and PC/Mac laptops.</li>
          <li><strong>Teacher Devices:</strong> Laptops and desktop browsers (Google Chrome, Microsoft Edge, Safari, Firefox).</li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-multi-teacher-sharing",
    category: "devices",
    categoryLabel: "Devices & Multi-Teacher",
    question: "Can multiple teachers (e.g., job-share partners or TAs) manage the same class?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Yes! PocketPot is built for collaborative primary school teams:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>In the <strong>Admin Portal</strong>, school administrators can assign multiple teachers to a single classroom.</li>
          <li>Job-share partners, co-teachers, and teaching assistants have full access to view pupil balances, post jobs, award whiteboard bonuses, and adjust settings from their own accounts.</li>
          <li>Supply teachers can also be linked to provide seamless classroom continuity.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "faq-offline-readiness",
    category: "devices",
    categoryLabel: "Devices & Multi-Teacher",
    question: "What happens if our school Wi-Fi or internet connection drops?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          PocketPot includes robust offline-first local persistence:
        </p>
        <p>
          If your classroom internet connection is interrupted during a lesson, the teacher whiteboard and pupil card views continue operating seamlessly from local storage.
        </p>
        <p>
          All pending actions, bonus awards, and pot transfers reconcile automatically with Google Cloud and Firebase as soon as connectivity is restored.
        </p>
      </div>
    ),
  },
  {
    id: "faq-admin-vs-teacher",
    category: "devices",
    categoryLabel: "Devices & Multi-Teacher",
    question: "How does the School Administrator view differ from the Teacher view?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          PocketPot provides clean, role-tailored dashboards:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>
            <strong>Teacher Level:</strong> Strictly scoped to the classes assigned to that educator, keeping day-to-day focus clean and distraction-free.
          </li>
          <li>
            <strong>School Administrator Level:</strong> Intended for Headteachers, Deputy Heads, and Year Leaders. It provides whole-school governance across all classrooms, teacher directory management, multi-class allocations, and cross-cohort metrics.
          </li>
        </ul>
      </div>
    ),
  },
];

export function TeacherFaqs() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>("faq-setup-class");

  const categories: Array<{ id: string; label: string; icon: React.ReactNode }> = [
    { id: "all", label: "All Questions", icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { id: "setup", label: "Class Setup & Pupils", icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { id: "cards", label: "Debit Cards & Logins", icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: "money", label: "Money, Pots & Payday", icon: <Coins className="w-3.5 h-3.5" /> },
    { id: "jobs", label: "Jobs & Bonuses", icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: "marketplace", label: "Class Marketplace", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { id: "safeguarding", label: "Safeguarding & Zero-PII", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: "devices", label: "Devices & Multi-Teacher", icon: <Laptop className="w-3.5 h-3.5" /> },
  ];

  const filteredFaqs = useMemo(() => {
    return FAQS_DATA.filter((faq) => {
      const matchesCategory =
        selectedCategory === "all" || faq.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.categoryLabel.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getCategoryTheme = (category: FaqCategory) => {
    switch (category) {
      case "setup":
        return {
          bg: "bg-tealSurface",
          text: "text-brandPrimary",
          icon: <GraduationCap className="w-4 h-4" />,
        };
      case "cards":
        return {
          bg: "bg-amberSurface",
          text: "text-brandSecondary",
          icon: <CreditCard className="w-4 h-4" />,
        };
      case "money":
        return {
          bg: "bg-greenSurface",
          text: "text-positiveState",
          icon: <Coins className="w-4 h-4" />,
        };
      case "jobs":
        return {
          bg: "bg-indigoSurface",
          text: "text-focusIndicator",
          icon: <Briefcase className="w-4 h-4" />,
        };
      case "marketplace":
        return {
          bg: "bg-purple-100",
          text: "text-purple-700",
          icon: <ShoppingBag className="w-4 h-4" />,
        };
      case "safeguarding":
        return {
          bg: "bg-tealSurface",
          text: "text-brandPrimary",
          icon: <ShieldCheck className="w-4 h-4" />,
        };
      case "devices":
        return {
          bg: "bg-sky-100",
          text: "text-sky-700",
          icon: <Laptop className="w-4 h-4" />,
        };
      default:
        return {
          bg: "bg-tealSurface",
          text: "text-brandPrimary",
          icon: <HelpCircle className="w-4 h-4" />,
        };
    }
  };

  return (
    <div className="space-y-6 text-left font-lexend">
      {/* 1. Header Banner */}
      <div className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard flex flex-wrap items-center justify-between gap-4 text-left">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-tealSurface text-brandPrimary flex items-center justify-center shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-bold text-primaryText">Frequently Asked Questions</h2>
          </div>
          <p className="text-sm text-primaryText/70 mt-1 max-w-2xl font-medium">
            Essential guidance for educators on classroom setup, printed cards, automated payday, savings pots, jobs, and safeguarding.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-brandPrimary bg-tealSurface px-3.5 py-2 rounded-2xl border border-brandPrimary/30 shadow-xs">
          <GraduationCap className="w-4 h-4 flex-shrink-0" />
          <span>UK KS2 Safeguarding Standard</span>
        </div>
      </div>

      {/* 2. Search & Category Filters */}
      <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-borderMuted shadow-xs space-y-3.5 text-left">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-primaryText/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs (e.g., CSV upload, print cards, PIN reset, basic income, jobs, pots, GDPR)..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted text-primaryText focus:outline-none focus:ring-2 focus:ring-brandPrimary font-medium"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-brandPrimary text-white shadow-xs"
                    : "bg-canvas border border-borderMuted text-primaryText/70 hover:text-primaryText hover:bg-tealSurface/40"
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FAQ Accordion List */}
      <div className="space-y-3 text-left">
        {filteredFaqs.length === 0 ? (
          <div className="bg-surface rounded-2xl p-8 border border-borderMuted text-center text-primaryText/60 space-y-2">
            <p className="text-sm font-semibold">No questions found matching your search.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="text-xs text-brandPrimary font-bold hover:underline"
            >
              Reset filters &amp; view all questions
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = expandedId === faq.id;
            const theme = getCategoryTheme(faq.category);
            return (
              <div
                key={faq.id}
                className={`bg-surface rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? "border-brandPrimary/40 shadow-sm"
                    : "border-borderMuted hover:border-borderMuted/80 shadow-xs"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full p-4.5 text-left flex items-center justify-between gap-4 transition-colors hover:bg-canvas/50"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${theme.bg} ${theme.text}`}
                    >
                      {theme.icon}
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primaryText/50 block mb-0.5">
                        {faq.categoryLabel}
                      </span>
                      <h4 className="text-sm font-bold text-primaryText leading-snug">
                        {faq.question}
                      </h4>
                    </div>
                  </div>

                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? "rotate-180 bg-tealSurface text-brandPrimary" : "bg-canvas text-primaryText/50"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-borderMuted/50 bg-canvas/30 text-left">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Quick Architecture Summary Card */}
      <div className="bg-tealSurface/50 rounded-pot p-4 sm:p-6 md:p-8 border border-brandPrimary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div className="flex items-start gap-3.5">
          <ShieldCheck className="w-6 h-6 text-brandPrimary flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary block">
              PocketPot Safeguarding &amp; Non-Punitive Philosophy
            </span>
            <p className="text-xs text-primaryText/80 leading-relaxed font-medium">
              PocketPot is designed to nurture positive, lifelong financial capability in Key Stage 2 pupils. We never collect pupil surnames or personal identifiable information, and balances are strictly non-punitive—overdrafts, interest charges, and punitive deductions are prohibited by design.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
