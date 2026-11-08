"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  School,
  Sparkles,
  ArrowRight,
  Lock,
  Coins,
  Briefcase,
  Users,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function RootGatewayPage() {
  return (
    <main className="min-h-screen bg-canvas text-primaryText p-4 sm:p-6 md:p-10 font-lexend text-left flex flex-col justify-between">
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderMuted/60 pb-6 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brandPrimary flex items-center justify-center text-white font-bold text-xl shadow-md">
                P
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-primaryText">PocketPot</h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-tealSurface text-brandPrimary font-bold border border-brandPrimary/30">
                    UK Key Stage 2
                  </span>
                </div>
                <p className="text-xs text-primaryText/70 font-medium">
                  Invest in the Future &bull; Educational Savings &amp; Classroom Economy Platform
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tealSurface text-brandPrimary text-xs font-bold border border-brandPrimary/20">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Zero-PII Safeguarded</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="space-y-3 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary block">
            Role-Based Access Control (RBAC) &bull; Level Separation
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-primaryText leading-tight">
            Select Your Account Level Portal
          </h2>
          <p className="text-sm text-primaryText/75 max-w-2xl font-medium leading-relaxed">
            In compliance with strict school safeguarding and least privilege architecture, <strong>Admin</strong>, <strong>Teacher</strong>, and <strong>Pupil</strong> accounts are segregated into separate security levels. Teachers are strictly restricted to their classrooms and cannot access the admin governance view.
          </p>
        </div>

        {/* The 3 Separate Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* LEVEL 1: SCHOOL ADMIN */}
          <div className="p-6 rounded-pot bg-surface border-2 border-brandSecondary/40 shadow-islandCard flex flex-col justify-between space-y-5 hover:border-brandSecondary transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigoSurface flex items-center justify-center text-2xl shadow-xs">
                  👑
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigoSurface text-focusIndicator font-bold border border-focusIndicator/30 uppercase">
                  Level 1: Admin
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-primaryText group-hover:text-brandSecondary transition-colors">
                  School Admin Portal
                </h3>
                <span className="text-xs font-semibold text-focusIndicator block mt-0.5">
                  Senior Leadership &bull; Headteacher Level
                </span>
              </div>

              <p className="text-xs text-primaryText/70 leading-relaxed font-medium">
                Whole-school governance hub. Manage the teaching staff directory, enforce institutional email domain whitelisting, assign educators to classes, and upload whole-school MIS CSVs.
              </p>

              <div className="space-y-2 pt-2 border-t border-borderMuted/60 text-xs text-primaryText/80 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positiveState shrink-0" />
                  <span>Teaching Staff Directory &amp; Whitelist</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positiveState shrink-0" />
                  <span>Multi-Class Allocation &amp; Teacher Setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positiveState shrink-0" />
                  <span>SIMS / Arbor Whole-School CSV Upload</span>
                </div>
              </div>
            </div>

            <Link
              href="/admin"
              className="w-full py-3 px-4 rounded-xl bg-focusIndicator hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Enter School Admin Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* LEVEL 2: CLASSROOM TEACHER */}
          <div className="p-6 rounded-pot bg-surface border-2 border-brandPrimary/40 shadow-islandCard flex flex-col justify-between space-y-5 hover:border-brandPrimary transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-tealSurface flex items-center justify-center text-2xl shadow-xs">
                  👨‍🏫
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-tealSurface text-brandPrimary font-bold border border-brandPrimary/30 uppercase">
                  Level 2: Teacher
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-primaryText group-hover:text-brandPrimary transition-colors">
                  Teacher Portal
                </h3>
                <span className="text-xs font-semibold text-brandPrimary block mt-0.5">
                  Classroom Educator &bull; Zero Admin Access
                </span>
              </div>

              <p className="text-xs text-primaryText/70 leading-relaxed font-medium">
                Strictly scoped to assigned classrooms. Teachers manage pupil rosters, launch interactive smartboard mode, award micro-rewards, and manage classroom job applications.
              </p>

              <div className="space-y-2 pt-2 border-t border-borderMuted/60 text-xs text-primaryText/80 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positiveState shrink-0" />
                  <span>Scoped strictly to assigned classroom(s)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positiveState shrink-0" />
                  <span>Interactive Whiteboard Mode &amp; Bonuses</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positiveState shrink-0" />
                  <span>Classroom Jobs Board &amp; Wage Payouts</span>
                </div>
                <div className="flex items-center gap-2 text-warningState">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-semibold">Zero access to admin governance</span>
                </div>
              </div>
            </div>

            <Link
              href="/teacher"
              className="w-full py-3 px-4 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Enter Teacher Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* LEVEL 3: PUPIL */}
          <div className="p-6 rounded-pot bg-surface border-2 border-positiveState/40 shadow-islandCard flex flex-col justify-between space-y-5 hover:border-positiveState transition-all group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amberSurface flex items-center justify-center text-2xl shadow-xs">
                  🎓
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-amberSurface text-brandSecondary font-bold border border-brandSecondary/30 uppercase">
                  Level 3: Pupil
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-primaryText group-hover:text-positiveState transition-colors">
                  Pupil Card Portal
                </h3>
                <span className="text-xs font-semibold text-positiveState block mt-0.5">
                  Key Stage 2 Learner &bull; Tablet Interface
                </span>
              </div>

              <p className="text-xs text-primaryText/70 leading-relaxed font-medium">
                Child-friendly, dyslexia-conscious tablet experience. Physical-style bank card, British coins and banknotes visualizer, savings pots, and job applications.
              </p>

              <div className="space-y-2 pt-2 border-t border-borderMuted/60 text-xs text-primaryText/80 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positiveState shrink-0" />
                  <span>Child Bank Card &amp; Animal Codenames</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positiveState shrink-0" />
                  <span>Realistic British Money Breakdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positiveState shrink-0" />
                  <span>Curriculum Savings Pots &amp; Goals</span>
                </div>
              </div>
            </div>

            <Link
              href="/pupil/pupil-1"
              className="w-full py-3 px-4 rounded-xl bg-positiveState hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <span>Enter Pupil Portal (Leo &bull; #101)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

        {/* Security & Multi-Tenant Assurance Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-borderMuted shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-primaryText/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-tealSurface flex items-center justify-center text-brandPrimary shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>
              <strong>Cryptographic Tenant Boundary:</strong> St Mary's Primary (URN: 100123) &bull; Allowed Staff Domains: <code className="font-bold text-brandPrimary">@st-marys.sch.uk</code>
            </span>
          </div>
          <span className="text-[11px] text-primaryText/50 font-semibold whitespace-nowrap">
            PocketPot v1.0 Production
          </span>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-primaryText/50 pt-8 border-t border-borderMuted/60 mt-8">
        PocketPot Educational Savings &bull; Key Stage 2 Financial Mathematics &bull; Compliant with DfE Safeguarding Standards
      </footer>
    </main>
  );
}
