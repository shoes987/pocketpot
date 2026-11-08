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
  ExternalLink,
  GraduationCap,
} from "lucide-react";

interface FaqItem {
  id: string;
  category: "privacy" | "security" | "cloud" | "classroom";
  categoryLabel: string;
  question: string;
  answer: React.ReactNode;
}

const FAQS_DATA: FaqItem[] = [
  // 1. DATA PRIVACY & GDPR
  {
    id: "faq-gdpr-compliance",
    category: "privacy",
    categoryLabel: "Data Privacy & GDPR",
    question: "How does PocketPot comply with GDPR and COPPA regulations?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          PocketPot is engineered specifically for UK Key Stage 2 (Ages 7–11) education and adheres strictly to both <strong>UK/EU GDPR</strong> and <strong>COPPA</strong> data protection principles through our zero personal identifiable information (Zero-PII) architecture.
        </p>
        <p>
          Under this standard, no pupil real names, surnames, email addresses, telephone numbers, home addresses, dates of birth, or photographs are ever collected, transmitted to, or stored on remote cloud database servers.
        </p>
      </div>
    ),
  },
  {
    id: "faq-pupil-names",
    category: "privacy",
    categoryLabel: "Data Privacy & GDPR",
    question: "Where are pupils' real names stored?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          Any pupil names entered by teachers into the Class Setup roster boxes remain <strong>exclusively in local browser storage on the teacher&apos;s computer</strong>.
        </p>
        <p>
          In cloud storage, pupil accounts are stored strictly under randomized UUID v4 identifiers paired with friendly nature codenames (such as <em>Calm River Otter</em> or <em>Curious Forest Fox</em>). This ensures teachers have immediate classroom recognition without transmitting pupil identities across external networks.
        </p>
      </div>
    ),
  },
  {
    id: "faq-student-logins",
    category: "privacy",
    categoryLabel: "Data Privacy & GDPR",
    question: "Do students require personal email accounts or passwords to log in?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          No. Students never use email addresses or passwords. In line with school safeguarding guidelines, children log in simply using their secure <strong>Desk Badge Number</strong> and classroom join code provided by their teacher.
        </p>
        <p>
          This completely eliminates password recovery vulnerabilities, phishing risks, and account credential leakage.
        </p>
      </div>
    ),
  },

  // 2. SAFEGUARDING & SECURITY
  {
    id: "faq-account-permissions",
    category: "security",
    categoryLabel: "Safeguarding & Security",
    question: "Can pupils access teacher controls or view other children's balances?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          No. PocketPot enforces strict account boundary permissions:
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
  {
    id: "faq-peer-transfers",
    category: "security",
    categoryLabel: "Safeguarding & Security",
    question: "Are child-to-child monetary transfers permitted?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          No. To protect pupils from classroom coercion, peer pressure, or accidental transfers, PocketPot intentionally prohibits peer-to-peer transfers.
        </p>
        <p>
          All account movements are strictly educational: basic income and wages from the school system, instant behavioural bonuses from the teacher, and deposits or withdrawals between the pupil&apos;s debit card and their own savings pots.
        </p>
      </div>
    ),
  },
  {
    id: "faq-non-punitive",
    category: "security",
    categoryLabel: "Safeguarding & Security",
    question: "Can a pupil's account balance ever go negative or receive monetary fines?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          In accordance with educational safeguarding and PocketPot Brand Guidelines, negative balances and punitive fines are strictly forbidden.
        </p>
        <p>
          Balances never drop below £0.00, and withdrawals cannot exceed the available balance on the card. This ensures financial learning remains encouraging, constructive, and stress-free.
        </p>
      </div>
    ),
  },

  // 3. CLOUD INFRASTRUCTURE & FIREBASE
  {
    id: "faq-cloud-sync",
    category: "cloud",
    categoryLabel: "Cloud & Firebase",
    question: "How does PocketPot synchronize classroom data in real time?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          PocketPot is backed by <strong>Google Cloud</strong> and <strong>Firebase</strong> cloud infrastructure.
        </p>
        <p>
          Class aggregate settings, job advertisements, active terms, behaviour definitions, and anonymized savings pots synchronize in real time across the interactive whiteboard, teacher laptop, and pupil classroom tablets.
        </p>
      </div>
    ),
  },
  {
    id: "faq-offline-readiness",
    category: "cloud",
    categoryLabel: "Cloud & Firebase",
    question: "What happens if the school Wi-Fi or internet connection is interrupted?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          PocketPot includes offline-first local persistence. If your classroom internet connection is interrupted, the teacher whiteboard and pupil card views continue operating seamlessly from local storage.
        </p>
        <p>
          All pending actions reconcile automatically with Firebase cloud storage as soon as connectivity is restored.
        </p>
      </div>
    ),
  },
  {
    id: "faq-scheduled-payouts",
    category: "cloud",
    categoryLabel: "Cloud & Firebase",
    question: "How does automated weekly basic income work without teacher manual input?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          PocketPot features a real-world automated payout engine. During class setup, the teacher configures a weekly payout amount (e.g. £2.00) and designated payout day (e.g. Monday).
        </p>
        <p>
          The cloud reconciliation engine automatically verifies the schedule and credits each pupil&apos;s main account on that day without requiring teachers to remember or click any manual payout buttons.
        </p>
      </div>
    ),
  },

  // 4. CLASSROOM ECONOMY (JOBS & BONUSES)
  {
    id: "faq-jobs-board",
    category: "classroom",
    categoryLabel: "Classroom Economy",
    question: "How does the Jobs Board and CV application process work?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          The Jobs Board introduces pupils to real-world career application concepts in a supportive environment:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 pl-1">
          <li><strong>Posting:</strong> Teachers post classroom jobs with a weekly wage, role description, term length (in weeks), and required qualities.</li>
          <li><strong>Application:</strong> Pupils apply by writing a short statement (CV) and highlighting qualities they offer.</li>
          <li><strong>Hiring:</strong> Teachers review applications from their Jobs Board tab and hire a pupil. A celebratory notification is sent to the hired pupil, and encouraging positive rejection notifications are sent to others.</li>
          <li><strong>Wage Automation:</strong> The weekly wage is paid automatically on the class payout day for the duration of the term.</li>
        </ol>
      </div>
    ),
  },
  {
    id: "faq-completed-jobs-references",
    category: "classroom",
    categoryLabel: "Classroom Economy",
    question: "What happens when a job term completes?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          One week before and upon term completion, automated reminders notify both the teacher and the pupil.
        </p>
        <p>
          Upon completion, the teacher selects a positive reference from a pre-populated list personalized with the child&apos;s name. The job is then archived into the child&apos;s <em>Completed Jobs Portfolio</em>, and automatically attaches along with their teacher reference to any future job applications they submit!
        </p>
      </div>
    ),
  },
  {
    id: "faq-bonuses-whiteboard",
    category: "classroom",
    categoryLabel: "Classroom Economy",
    question: "How do instant bonuses work on the Interactive Whiteboard?",
    answer: (
      <div className="space-y-2 text-primaryText/90 leading-relaxed text-sm">
        <p>
          The <strong>Bonuses</strong> section is built specifically for classroom interactive whiteboards and tablets:
        </p>
        <ul className="list-disc list-inside space-y-1.5 pl-1">
          <li><strong>Large Touch Cards:</strong> Display positive behaviours (e.g. <em>Kind Helper</em>, <em>Great Focus</em>, <em>Team Player</em>) with 1–2 word definitions and micro-rewards (e.g. 10p, 15p, 20p).</li>
          <li><strong>Quick Multi-Select:</strong> Tap any card to open a whiteboard overlay, tap one or multiple pupils, and hit confirm.</li>
          <li><strong>Celebration Feedback:</strong> Plays an ascending 4-note musical chime via the Web Audio API and triggers a celebratory confetti burst.</li>
          <li><strong>Automatic Ledger Entry:</strong> The bonus amount credits directly to the child&apos;s card balance and appears in their transaction ledger as <code>Bonus - (description)</code> (e.g. <code>Bonus - Kindness</code>).</li>
        </ul>
      </div>
    ),
  },
];

export function TeacherFaqs() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>("faq-gdpr-compliance");

  const categories = [
    { id: "all", label: "All Topics" },
    { id: "privacy", label: "Data Privacy & GDPR" },
    { id: "security", label: "Safeguarding & Security" },
    { id: "cloud", label: "Cloud & Firebase" },
    { id: "classroom", label: "Classroom Economy" },
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

  return (
    <div className="space-y-6 text-left">
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
            Guidance for educators on data privacy, safeguarding standards, cloud infrastructure, and classroom economy management in PocketPot.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-brandPrimary bg-tealSurface px-3.5 py-2 rounded-2xl border border-brandPrimary/30 shadow-xs">
          <GraduationCap className="w-4 h-4 flex-shrink-0" />
          <span>KS2 Safeguarding Standard</span>
        </div>
      </div>

      {/* 2. Search & Category Filters */}
      <div className="bg-surface rounded-2xl p-4 border border-borderMuted shadow-xs space-y-3.5 text-left">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-primaryText/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs (e.g., GDPR, Firebase, local storage, jobs, bonuses)..."
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-brandPrimary text-white shadow-xs"
                    : "bg-canvas border border-borderMuted text-primaryText/70 hover:text-primaryText hover:bg-tealSurface/40"
                }`}
              >
                {cat.label}
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
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        faq.category === "privacy"
                          ? "bg-tealSurface text-brandPrimary"
                          : faq.category === "security"
                          ? "bg-amberSurface text-brandSecondary"
                          : faq.category === "cloud"
                          ? "bg-indigoSurface text-focusIndicator"
                          : "bg-greenSurface text-positiveState"
                      }`}
                    >
                      {faq.category === "privacy" ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : faq.category === "security" ? (
                        <Lock className="w-4 h-4" />
                      ) : faq.category === "cloud" ? (
                        <Cloud className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
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
              PocketPot Data Protection Commitment
            </span>
            <p className="text-xs text-primaryText/80 leading-relaxed font-medium">
              We uphold strict Zero-PII standards across all school deployments. Student accounts remain pseudonymized, real names stay on your computer, and classroom data is protected with enterprise cloud security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
