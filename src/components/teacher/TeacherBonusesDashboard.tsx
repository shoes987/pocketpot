"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PositiveBehaviourDocument,
  PupilDocument,
  BonusAwardDocument,
} from "@/lib/firebase/types";
import {
  getSavedBehaviours,
  createBehaviour,
  updateBehaviour,
  deleteBehaviour,
  awardBonusToPupils,
  getSavedBonusAwards,
  DEFAULT_POSITIVE_BEHAVIOURS,
} from "@/lib/services/bonus-service";
import {
  getSavedPupils,
  getSavedClasses,
  getSavedClassesForUser,
} from "@/lib/services/class-service";
import { getCurrentTeacherUser, isUserAdmin } from "@/lib/services/auth-service";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  Volume2,
  VolumeX,
  Users,
  X,
  Coins,
  Search,
  Award,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const ICON_OPTIONS = ["🤝", "🎯", "⭐", "💡", "🧹", "🌱", "👂", "💬", "💖", "🎨", "📚", "🏆", "🚀", "👏", "🌟", "🌈"];

const THEME_STYLES: Record<string, { bg: string; border: string; text: string; badge: string; shadow: string }> = {
  sageGreen: {
    bg: "bg-[#F0FDF4]",
    border: "border-[#86EFAC]",
    text: "text-[#15803D]",
    badge: "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]",
    shadow: "hover:shadow-[0_8px_20px_rgba(21,128,61,0.12)]",
  },
  calmingTeal: {
    bg: "bg-[#F0FDFA]",
    border: "border-[#99F6E4]",
    text: "text-[#0D9488]",
    badge: "bg-[#CCFBF1] text-[#0D9488] border-[#99F6E4]",
    shadow: "hover:shadow-[0_8px_20px_rgba(13,148,136,0.12)]",
  },
  warmAmber: {
    bg: "bg-[#FFFBEB]",
    border: "border-[#FDE68A]",
    text: "text-[#D97706]",
    badge: "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]",
    shadow: "hover:shadow-[0_8px_20px_rgba(217,119,6,0.12)]",
  },
  electricIndigo: {
    bg: "bg-[#EEF2FF]",
    border: "border-[#C7D2FE]",
    text: "text-[#4338CA]",
    badge: "bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE]",
    shadow: "hover:shadow-[0_8px_20px_rgba(67,56,202,0.12)]",
  },
};

export interface TeacherBonusesDashboardProps {
  classes?: import("@/lib/firebase/types").ClassDocument[];
  activeClassId?: string;
}

export function TeacherBonusesDashboard({
  classes: propsClasses,
  activeClassId,
}: TeacherBonusesDashboardProps = {}) {
  const [behaviours, setBehaviours] = useState<PositiveBehaviourDocument[]>([]);
  const [pupils, setPupils] = useState<PupilDocument[]>([]);
  const [recentAwards, setRecentAwards] = useState<BonusAwardDocument[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(activeClassId || "");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isWhiteboardMode, setIsWhiteboardMode] = useState<boolean>(false);
  const [isLogOpen, setIsLogOpen] = useState<boolean>(false);

  // Fullscreen Interactive Whiteboard Mode Launch/Exit Handlers
  const enterWhiteboardMode = () => {
    setIsWhiteboardMode(true);
    try {
      if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
  };

  const exitWhiteboardMode = () => {
    setIsWhiteboardMode(false);
    try {
      if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (typeof document !== "undefined" && !document.fullscreenElement && isWhiteboardMode) {
        setIsWhiteboardMode(false);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }
  }, [isWhiteboardMode]);

  // Active Award Modal State
  const [awardingBehaviour, setAwardingBehaviour] = useState<PositiveBehaviourDocument | null>(null);
  const [selectedPupilIds, setSelectedPupilIds] = useState<string[]>([]);
  const [pupilSearch, setPupilSearch] = useState<string>("");

  // Edit / Create Modal State
  const [isEditingModalOpen, setIsEditingModalOpen] = useState<boolean>(false);
  const [editingBehaviourId, setEditingBehaviourId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDefinition, setFormDefinition] = useState<string>("");
  const [formAmountPence, setFormAmountPence] = useState<number>(10);
  const [formIcon, setFormIcon] = useState<string>("⭐");
  const [formTheme, setFormTheme] = useState<"calmingTeal" | "warmAmber" | "sageGreen" | "electricIndigo">("calmingTeal");
  const [formError, setFormError] = useState<string | null>(null);

  // Celebration state (Confetti & Audio Toast)
  const [celebrationToast, setCelebrationToast] = useState<{
    visible: boolean;
    title: string;
    amountFormatted: string;
    recipientsText: string;
    icon: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load Data
  const loadData = () => {
    const currentTeacher = getCurrentTeacherUser();
    const loadedClasses =
      propsClasses && propsClasses.length > 0
        ? propsClasses
        : isUserAdmin()
        ? getSavedClasses()
        : getSavedClassesForUser(currentTeacher);

    const activeClass =
      (activeClassId && loadedClasses.find((c) => c.classId === activeClassId)) ||
      loadedClasses[0];
    const classId = activeClass ? activeClass.classId : "class-year4-teal";
    setSelectedClassId(classId);

    setBehaviours(getSavedBehaviours(classId));
    setPupils(getSavedPupils());
    setRecentAwards(getSavedBonusAwards(classId, 10));
  };

  useEffect(() => {
    loadData();
  }, [propsClasses, activeClassId]);

  // Audio Synthesizer Chime (Web Audio API - 100% reliable, zero network latency)
  const playCelebrationChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      // Joyful ascending arpeggio: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);

        gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.08);
        osc.stop(ctx.currentTime + index * 0.08 + 0.5);
      });
    } catch {
      // Gracefully continue if browser autoplay policy restricts audio
    }
  };

  // Confetti Animation on Interactive Whiteboard
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#0D9488", "#D97706", "#15803D", "#4338CA", "#F59E0B", "#10B981"];
    const particles: Array<{
      x: number;
      y: number;
      r: number;
      color: string;
      vx: number;
      vy: number;
      rot: number;
      vRot: number;
      life: number;
    }> = [];

    for (let i = 0; i < 75; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.35 + (Math.random() - 0.5) * 80,
        r: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 12 - 4,
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        life: 1.0,
      });
    }

    let animationFrameId: number;
    const startTime = Date.now();

    const render = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 2500) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // Gravity
        p.rot += p.vRot;
        p.life -= 0.012;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
  };

  // Open Award Modal for a Behaviour Card (Whiteboard Tap)
  const handleCardTap = (behaviour: PositiveBehaviourDocument) => {
    setAwardingBehaviour(behaviour);
    setSelectedPupilIds([]);
    setPupilSearch("");
  };

  // Toggle Pupil Selection
  const togglePupilSelect = (pupilId: string) => {
    setSelectedPupilIds((prev) =>
      prev.includes(pupilId) ? prev.filter((id) => id !== pupilId) : [...prev, pupilId]
    );
  };

  // Select / Deselect All
  const handleSelectAll = () => {
    const visibleIds = filteredPupils.map((p) => p.pupilId);
    if (selectedPupilIds.length === visibleIds.length) {
      setSelectedPupilIds([]);
    } else {
      setSelectedPupilIds(visibleIds);
    }
  };

  // Confirm Award Execution
  const handleExecuteAward = () => {
    if (!awardingBehaviour) return;
    if (selectedPupilIds.length === 0) {
      alert("Please select at least one pupil on the whiteboard to receive this bonus.");
      return;
    }

    try {
      const result = awardBonusToPupils({
        behaviourId: awardingBehaviour.behaviourId,
        pupilIds: selectedPupilIds,
        classId: selectedClassId,
      });

      // Play Sound & Trigger Confetti!
      playCelebrationChime();
      triggerConfetti();

      // Show Celebratory Banner Toast
      const namesString =
        result.pupilDisplayNames.length <= 2
          ? result.pupilDisplayNames.join(" & ")
          : `${result.pupilDisplayNames.slice(0, 2).join(", ")} +${result.pupilDisplayNames.length - 2} more`;

      setCelebrationToast({
        visible: true,
        title: result.behaviour.title,
        amountFormatted: formatCurrency(result.behaviour.amountCents),
        recipientsText: namesString,
        icon: result.behaviour.icon,
      });

      // Auto-hide celebration banner
      setTimeout(() => {
        setCelebrationToast(null);
      }, 4000);

      // Close modal & reload data
      setAwardingBehaviour(null);
      setSelectedPupilIds([]);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to award bonus.");
    }
  };

  // Open Edit / Create Behaviour Modal
  const handleOpenEditModal = (b?: PositiveBehaviourDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormError(null);
    if (b) {
      setEditingBehaviourId(b.behaviourId);
      setFormTitle(b.title);
      setFormDefinition(b.definition);
      setFormAmountPence(b.amountCents);
      setFormIcon(b.icon);
      setFormTheme(b.colorTheme || "calmingTeal");
    } else {
      setEditingBehaviourId(null);
      setFormTitle("");
      setFormDefinition("");
      setFormAmountPence(10);
      setFormIcon("⭐");
      setFormTheme("calmingTeal");
    }
    setIsEditingModalOpen(true);
  };

  // Save Behaviour (Create or Update)
  const handleSaveBehaviourForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Please enter a behaviour name.");
      return;
    }
    if (!formDefinition.trim()) {
      setFormError("Please enter a 1 or 2 word definition (e.g. Kindness, Focus).");
      return;
    }
    if (formAmountPence <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    try {
      if (editingBehaviourId) {
        updateBehaviour(editingBehaviourId, {
          title: formTitle.trim(),
          definition: formDefinition.trim(),
          amountCents: formAmountPence,
          icon: formIcon,
          colorTheme: formTheme,
        });
      } else {
        createBehaviour({
          classId: selectedClassId,
          title: formTitle.trim(),
          definition: formDefinition.trim(),
          amountCents: formAmountPence,
          icon: formIcon,
          colorTheme: formTheme,
        });
      }
      setIsEditingModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error saving behaviour.");
    }
  };

  // Delete Behaviour
  const handleDeleteBehaviour = (behaviourId: string) => {
    if (window.confirm("Are you sure you want to remove this positive behaviour?")) {
      deleteBehaviour(behaviourId);
      setIsEditingModalOpen(false);
      loadData();
    }
  };

  const filteredPupils = pupils.filter((p) => {
    const name = (p.localDisplayName || p.educationalCodename).toLowerCase();
    const badge = String(p.deskBadgeNumber);
    return name.includes(pupilSearch.toLowerCase()) || badge.includes(pupilSearch);
  });

  return (
    <div className="space-y-6 text-left relative font-lexend">
      {/* Confetti Celebration Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-[65] w-full h-full"
      />

      {/* Floating Celebratory Toast Banner */}
      {celebrationToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[70] bg-surface border-2 border-positiveState shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-4 animate-bounce">
          <span className="text-4xl">{celebrationToast.icon}</span>
          <div className="text-left">
            <span className="text-xs font-bold text-positiveState uppercase tracking-wider block">
              Instant Classroom Bonus Awarded!
            </span>
            <strong className="text-lg text-primaryText block">
              {celebrationToast.amountFormatted} for {celebrationToast.title}
            </strong>
            <span className="text-xs text-primaryText/75">
              Credited to: <strong>{celebrationToast.recipientsText}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCelebrationToast(null)}
            className="text-primaryText/50 hover:text-primaryText p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 0. FULLSCREEN INTERACTIVE WHITEBOARD MODE (Requirement 1) */}
      {isWhiteboardMode && (
        <div className="fixed inset-0 z-40 bg-[#F8F9FA] p-6 md:p-10 flex flex-col justify-between overflow-y-auto select-none animate-in fade-in duration-200">
          {/* Subtle Exit Whiteboard button at top right */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-positiveState" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-positiveState">
                Interactive Whiteboard Mode
              </span>
            </div>
            <button
              type="button"
              onClick={exitWhiteboardMode}
              className="px-4 py-2 rounded-2xl bg-surface border border-borderMuted hover:bg-canvas text-primaryText/75 hover:text-primaryText text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              title="Exit Whiteboard Mode"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Exit Whiteboard</span>
            </button>
          </div>

          {/* Cards Grid: Perfectly centered, generous whiteboard touch cards, NO edit options, NO other info */}
          <div className="my-auto w-full max-w-7xl mx-auto py-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {behaviours.map((b) => {
                const theme = THEME_STYLES[b.colorTheme || "calmingTeal"] || THEME_STYLES.calmingTeal;
                return (
                  <div
                    key={b.behaviourId}
                    onClick={() => handleCardTap(b)}
                    className={`group relative ${theme.bg} border-3 ${theme.border} rounded-[2rem] p-6 md:p-8 cursor-pointer transition-all duration-200 transform active:scale-95 hover:-translate-y-1.5 ${theme.shadow} flex flex-col justify-between text-left select-none min-h-[220px] md:min-h-[260px] shadow-islandCard`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleCardTap(b);
                    }}
                  >
                    {/* Top Row: Huge Icon and Definition (NO edit button) */}
                    <div className="flex items-start justify-between">
                      <span className="text-5xl md:text-6xl p-3 rounded-2xl bg-surface shadow-sm border border-borderMuted/60 inline-block transform group-hover:scale-110 transition-transform">
                        {b.icon}
                      </span>

                      <span className={`text-xs px-3 py-1 rounded-full font-bold border ${theme.badge}`}>
                        {b.definition}
                      </span>
                    </div>

                    {/* Content: Title */}
                    <div className="space-y-1 mt-4 text-left">
                      <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-primaryText group-hover:text-positiveState transition-colors leading-tight">
                        {b.title}
                      </h3>
                    </div>

                    {/* Bottom Row: Amount */}
                    <div className="mt-5 pt-4 border-t border-borderMuted/60 flex items-center justify-between">
                      <div className="bg-surface px-4 py-2 rounded-2xl border border-borderMuted shadow-xs">
                        <span className={`text-xl md:text-2xl font-black ${theme.text} block leading-none`}>
                          +{formatCurrency(b.amountCents)}
                        </span>
                      </div>

                      <span className="text-xs md:text-sm font-bold text-positiveState flex items-center gap-1.5">
                        <span>Tap to Award</span>
                        <Sparkles className="w-4 h-4 text-brandSecondary" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center text-xs text-primaryText/40 py-2">
            Tap any card on the board to reward pupils
          </div>
        </div>
      )}

      {/* 1. INTERACTIVE WHITEBOARD HEADER BAR */}
      <header className="bg-surface rounded-pot p-4 sm:p-6 md:p-8 border border-borderMuted shadow-islandCard flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2.5 text-left">
            <span className="p-2 rounded-xl bg-tealSurface text-brandPrimary border border-brandPrimary/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-primaryText">
              Bonuses &amp; Instant Recognition
            </h2>
            <span className="text-xs px-3 py-1 rounded-full bg-tealSurface text-brandPrimary font-bold border border-brandPrimary/30 hidden sm:inline-block">
              Interactive Whiteboard Ready
            </span>
          </div>
          <p className="text-body text-primaryText/75 text-left font-medium">
            Tap any positive behaviour card on the board to instantly reward pupils with a celebratory sound and confetti!
          </p>
        </div>

        {/* Right Whiteboard Controls: Whiteboard Launch, Sound Toggle & Add Behaviour */}
        <div className="flex items-center gap-3">
          {/* Launch Fullscreen Interactive Whiteboard Mode Button */}
          <button
            type="button"
            onClick={enterWhiteboardMode}
            className="px-4 py-2.5 rounded-2xl bg-positiveState hover:bg-green-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
            title="Launch Fullscreen Interactive Whiteboard Mode"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Interactive Whiteboard Mode</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3.5 py-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
              soundEnabled
                ? "bg-tealSurface text-brandPrimary border-brandPrimary/30"
                : "bg-canvas text-primaryText/50 border-borderMuted"
            }`}
            title={soundEnabled ? "Celebration Sound: ON" : "Celebration Sound: MUTED"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-brandPrimary" /> : <VolumeX className="w-4 h-4 text-primaryText/50" />}
            <span className="hidden sm:inline">{soundEnabled ? "Sound On" : "Muted"}</span>
          </button>

          {/* Add Positive Behaviour Button */}
          <button
            type="button"
            onClick={() => handleOpenEditModal()}
            className="px-4 py-2.5 rounded-2xl bg-brandPrimary text-white hover:bg-teal-700 font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Behaviour</span>
          </button>
        </div>
      </header>

      {/* 2. WHITEBOARD CARDS GRID (Fits screen cleanly, large touch targets) */}
      <section className="space-y-3 text-left">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-primaryText/60">
            Available Positive Behaviours ({behaviours.length})
          </span>
          <span className="text-[11px] text-primaryText/55 font-medium">
            Tap any card on the interactive whiteboard to select pupil(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {behaviours.map((b) => {
            const theme = THEME_STYLES[b.colorTheme || "calmingTeal"] || THEME_STYLES.calmingTeal;

            return (
              <div
                key={b.behaviourId}
                onClick={() => handleCardTap(b)}
                className={`group relative ${theme.bg} border-2 ${theme.border} rounded-[1.75rem] p-5 cursor-pointer transition-all duration-200 transform active:scale-95 hover:-translate-y-1 ${theme.shadow} flex flex-col justify-between text-left select-none`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleCardTap(b);
                }}
              >
                {/* Top Row: Icon & Quick Edit */}
                <div className="flex items-start justify-between">
                  <span className="text-4xl p-2 rounded-2xl bg-surface shadow-xs border border-borderMuted/60 inline-block transform group-hover:scale-110 transition-transform">
                    {b.icon}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleOpenEditModal(b, e)}
                    className="p-2 rounded-xl bg-surface/80 hover:bg-surface text-primaryText/50 hover:text-primaryText border border-borderMuted/60 transition-colors shadow-xs"
                    title={`Edit ${b.title} reward amount or definition`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Content: Title & 1-2 Word Definition */}
                <div className="space-y-1.5 mt-4 text-left">
                  <h3 className="text-xl font-bold tracking-tight text-primaryText group-hover:text-brandPrimary transition-colors text-left leading-tight">
                    {b.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${theme.badge}`}>
                      {b.definition}
                    </span>
                    {b.isCustom && (
                      <span className="text-[10px] text-primaryText/45 font-medium">Custom</span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Amount Island in Isolated Card */}
                <div className="mt-5 pt-3 border-t border-borderMuted/60 flex items-center justify-between">
                  <div className="bg-surface px-3 py-1.5 rounded-xl border border-borderMuted shadow-xs">
                    <span className={`text-island font-bold ${theme.text} block leading-none`}>
                      +{formatCurrency(b.amountCents)}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-primaryText/70 group-hover:text-brandPrimary transition-colors flex items-center gap-1">
                    <span>Tap to Award</span>
                    <Sparkles className="w-3.5 h-3.5 text-brandSecondary" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. RECENT AWARDS HISTORY LOG (COLLAPSIBLE ACCORDION) */}
      {recentAwards.length > 0 && (
        <section className="bg-surface rounded-pot border border-borderMuted shadow-islandCard overflow-hidden text-left transition-all">
          <button
            type="button"
            onClick={() => setIsLogOpen(!isLogOpen)}
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-canvas/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPrimary"
            aria-expanded={isLogOpen}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-tealSurface text-brandPrimary border border-brandPrimary/30">
                <Award className="w-4 h-4 text-brandSecondary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primaryText">
                    Recent Classroom Recognition Activity
                  </h3>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-tealSurface text-brandPrimary font-bold border border-brandPrimary/30">
                    {recentAwards.length} recent
                  </span>
                </div>
                <p className="text-[11px] text-primaryText/60 font-medium mt-0.5">
                  {isLogOpen ? "Click to collapse awards log" : "Click to review recent pupil bonus credits"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-brandPrimary">
              <span>{isLogOpen ? "Hide Recent Log" : "View Recent Log"}</span>
              {isLogOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isLogOpen && (
            <div className="px-4 sm:px-6 md:px-8 pb-5 pt-2 border-t border-borderMuted/60 divide-y divide-borderMuted/60 animate-in fade-in duration-150">
              {recentAwards.slice(0, 10).map((award) => {
                const timeStr = new Date(award.awardedAt).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={award.awardId} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-positiveState inline-block" />
                      <div>
                        <strong className="text-primaryText font-bold">
                          {award.behaviourTitle} ({award.definition})
                        </strong>
                        <span className="text-primaryText/60 ml-2">
                          awarded to {award.pupilIds.length} pupil{award.pupilIds.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="font-bold text-positiveState">
                        +{formatCurrency(award.amountCents * award.pupilIds.length)}
                      </span>
                      <span className="text-primaryText/45">{timeStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 4. MODAL A: QUICK PUPIL SELECTION WHITEBOARD OVERLAY (Requirement 2: All Green, Names/Pseudonyms Only) */}
      {awardingBehaviour && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-pot border border-positiveState/30 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-left overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-borderMuted bg-greenSurface/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="text-4xl p-2 rounded-2xl bg-surface border border-positiveState/30 shadow-xs">
                  {awardingBehaviour.icon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-positiveState">
                      Awarding Positive Behaviour
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#DCFCE7] text-positiveState border border-positiveState/30">
                      {awardingBehaviour.definition}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-primaryText">
                    {awardingBehaviour.title}
                  </h3>
                  <span className="text-xs text-primaryText/70 font-medium">
                    Reward Value: <strong className="text-positiveState">+{formatCurrency(awardingBehaviour.amountCents)}</strong> credited per selected pupil
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAwardingBehaviour(null)}
                className="text-primaryText/50 hover:text-primaryText text-3xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Quick Controls Bar: Search + Select All */}
            <div className="px-6 py-3 bg-surface border-b border-borderMuted flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3.5 py-1.5 rounded-xl bg-[#DCFCE7] hover:bg-green-200 text-positiveState border border-positiveState/40 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {selectedPupilIds.length === filteredPupils.length && filteredPupils.length > 0
                      ? "Deselect All"
                      : "Select All Class"}
                  </span>
                </button>

                <span className="text-xs text-primaryText/70 font-medium">
                  Selected: <strong className="text-positiveState font-bold">{selectedPupilIds.length}</strong> of {pupils.length} pupils
                </span>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-positiveState/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter pupils by name..."
                  value={pupilSearch}
                  onChange={(e) => setPupilSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-greenSurface/40 rounded-xl border border-positiveState/30 focus:outline-none focus:ring-2 focus:ring-positiveState text-primaryText font-medium"
                />
              </div>
            </div>

            {/* Pupil Touch Selection Grid: Showing ONLY pupil names or pseudonyms, NO numbers, NO balances, ALL GREEN */}
            <div className="p-6 overflow-y-auto max-h-[50vh] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredPupils.map((pupil) => {
                const isSelected = selectedPupilIds.includes(pupil.pupilId);
                const displayName = pupil.localDisplayName || pupil.educationalCodename;

                return (
                  <button
                    key={pupil.pupilId}
                    type="button"
                    onClick={() => togglePupilSelect(pupil.pupilId)}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all duration-150 transform active:scale-95 flex items-center justify-between gap-3 min-h-[64px] ${
                      isSelected
                        ? "bg-positiveState border-positiveState text-white shadow-md scale-[1.02]"
                        : "bg-[#F0FDF4] border-[#86EFAC]/70 hover:border-positiveState hover:bg-[#DCFCE7] text-primaryText"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-[#DCFCE7] text-positiveState"
                        }`}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      <span
                        className={`text-sm font-bold truncate block ${
                          isSelected ? "text-white" : "text-[#15803D]"
                        }`}
                      >
                        {displayName}
                      </span>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border flex-shrink-0 transition-all ${
                        isSelected
                          ? "bg-white text-positiveState border-white font-bold"
                          : "border-positiveState/40 bg-surface"
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-positiveState" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-positiveState/30" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Action Footer */}
            <div className="p-6 border-t border-borderMuted bg-canvas/40 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setAwardingBehaviour(null)}
                className="px-5 py-3 rounded-2xl bg-surface hover:bg-canvas text-primaryText font-bold text-sm border border-borderMuted transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteAward}
                disabled={selectedPupilIds.length === 0}
                className={`px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2.5 shadow-md transition-all ${
                  selectedPupilIds.length > 0
                    ? "bg-positiveState hover:bg-green-700 text-white cursor-pointer transform hover:scale-[1.02]"
                    : "bg-borderMuted text-primaryText/40 cursor-not-allowed"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {selectedPupilIds.length > 0
                    ? `Award ${formatCurrency(awardingBehaviour.amountCents)} to ${selectedPupilIds.length} Pupil${
                        selectedPupilIds.length > 1 ? "s" : ""
                      } (+${formatCurrency(awardingBehaviour.amountCents * selectedPupilIds.length)})`
                    : "Select at least 1 pupil"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL B: CREATE OR EDIT BEHAVIOUR */}
      {isEditingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl w-full max-w-lg p-5 sm:p-6 md:p-8 space-y-4 sm:space-y-5 text-left animate-fadeIn">
            <div className="flex items-center justify-between border-b border-borderMuted pb-3">
              <div>
                <h3 className="text-xl font-bold text-primaryText">
                  {editingBehaviourId ? "Edit Positive Behaviour" : "Create New Behaviour"}
                </h3>
                <p className="text-xs text-primaryText/60">
                  Configure the behaviour definition and classroom monetary reward
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="text-primaryText/50 hover:text-primaryText text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-amberSurface text-[#C2410C] border border-amber-300 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveBehaviourForm} className="space-y-4 text-left">
              {/* Behaviour Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-primaryText/70 block">
                  Behaviour Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kind Helper, Active Listener, Tidy Desk"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted focus:outline-none focus:ring-2 focus:ring-brandPrimary text-primaryText font-medium"
                />
              </div>

              {/* 1 or 2 Word Definition (Requirement 3) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-primaryText/70 block">
                    One or Two Word Definition
                  </label>
                  <span className="text-[11px] text-primaryText/50 font-medium">Shows on child card</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Kindness, Focus, Teamwork, Effort"
                  value={formDefinition}
                  onChange={(e) => setFormDefinition(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted focus:outline-none focus:ring-2 focus:ring-brandPrimary text-primaryText font-medium"
                />
              </div>

              {/* Reward Amount (Pence) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-primaryText/70 block">
                  Reward Amount Given (in pence)
                </label>
                <div className="flex items-center gap-2">
                  {[10, 15, 20, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFormAmountPence(amt)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                        formAmountPence === amt
                          ? "bg-brandPrimary text-white border-brandPrimary"
                          : "bg-canvas text-primaryText/70 border-borderMuted hover:border-brandPrimary/40"
                      }`}
                    >
                      {amt < 100 ? `${amt}p` : `£${(amt / 100).toFixed(2)}`}
                    </button>
                  ))}
                </div>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={formAmountPence}
                    onChange={(e) => setFormAmountPence(Number(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 text-sm bg-canvas rounded-xl border border-borderMuted focus:outline-none focus:ring-2 focus:ring-brandPrimary text-primaryText font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primaryText/60">
                    pence ({formatCurrency(formAmountPence)})
                  </span>
                </div>
              </div>

              {/* Icon / Emoji Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-primaryText/70 block">
                  Choose Icon / Emoji
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-canvas rounded-xl border border-borderMuted">
                  {ICON_OPTIONS.map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setFormIcon(ico)}
                      className={`text-xl p-2 rounded-xl transition-transform ${
                        formIcon === ico
                          ? "bg-surface shadow-xs scale-125 border border-brandPrimary"
                          : "hover:scale-110"
                      }`}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-primaryText/70 block">
                  Card Theme Accent
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["calmingTeal", "warmAmber", "sageGreen", "electricIndigo"] as const).map((th) => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => setFormTheme(th)}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all ${
                        formTheme === th
                          ? "border-brandPrimary bg-tealSurface text-brandPrimary shadow-xs"
                          : "border-borderMuted bg-canvas text-primaryText/70"
                      }`}
                    >
                      {th === "calmingTeal" && "Teal"}
                      {th === "warmAmber" && "Amber"}
                      {th === "sageGreen" && "Green"}
                      {th === "electricIndigo" && "Indigo"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-borderMuted">
                {editingBehaviourId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteBehaviour(editingBehaviourId)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#C2410C] hover:bg-amberSurface transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-primaryText/70 hover:bg-canvas"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brandPrimary text-white font-bold text-xs hover:bg-teal-700 shadow-xs"
                  >
                    {editingBehaviourId ? "Update Behaviour" : "Create Behaviour"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
