"use client";

import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { PotAccentTheme } from "@/lib/firebase/types";

interface CreatePotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePot: (payload: {
    title: string;
    targetAmountCents: number;
    categoryLabel?: string;
    theme?: PotAccentTheme;
  }) => void;
}

export const CreatePotModal: React.FC<CreatePotModalProps> = ({
  isOpen,
  onClose,
  onCreatePot,
}) => {
  const [title, setTitle] = useState("");
  const [targetPounds, setTargetPounds] = useState("10.00");
  const [categoryLabel, setCategoryLabel] = useState("School Adventures");
  const [theme, setTheme] = useState<PotAccentTheme>("calmingTeal");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const targetCents = Math.round((parseFloat(targetPounds) || 10) * 100);

    onCreatePot({
      title: title.trim(),
      targetAmountCents: Math.max(100, targetCents),
      categoryLabel: categoryLabel.trim() || "School Adventures",
      theme,
    });

    setTitle("");
    setTargetPounds("10.00");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-pot-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primaryText/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-surface w-full max-w-lg rounded-[2rem] border-2 border-brandPrimary shadow-2xl overflow-hidden flex flex-col text-left">
        {/* Header */}
        <div className="bg-tealSurface border-b border-brandPrimary/20 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-8 h-8 rounded-full bg-brandPrimary text-white flex items-center justify-center font-bold text-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-brandPrimary uppercase tracking-wider block text-left">
                New Goal
              </span>
              <h3 id="create-pot-title" className="text-xl font-extrabold text-primaryText text-left">
                Create a Savings Pot
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-primaryText/60 hover:text-primaryText hover:bg-canvas transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-left">
          {/* Pot Name */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="pot-title-input" className="text-xs font-bold text-primaryText/70 uppercase tracking-wider block">
              Pot Goal Name:
            </label>
            <input
              id="pot-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., School Book Fair, Zoo Visit, Football Kit"
              className="w-full p-3 rounded-xl border-2 border-borderMuted focus:border-brandPrimary bg-canvas text-primaryText font-bold text-base focus:outline-none"
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="pot-target-input" className="text-xs font-bold text-primaryText/70 uppercase tracking-wider block">
              Target Amount (£):
            </label>
            <div className="relative rounded-xl border-2 border-borderMuted focus-within:border-brandPrimary bg-canvas p-1 flex items-center">
              <span className="pl-3 pr-1 text-lg font-bold text-primaryText">£</span>
              <input
                id="pot-target-input"
                type="number"
                step="0.50"
                min="1.00"
                required
                value={targetPounds}
                onChange={(e) => setTargetPounds(e.target.value)}
                className="w-full py-2 px-2 text-lg font-bold text-primaryText bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Theme Color Choice */}
          <div className="space-y-1.5 text-left pt-1">
            <span className="text-xs font-bold text-primaryText/70 uppercase tracking-wider block">
              Pot Color Accent:
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-borderMuted hover:bg-canvas cursor-pointer flex-1">
                <input
                  type="radio"
                  name="pot-theme"
                  checked={theme === "calmingTeal"}
                  onChange={() => setTheme("calmingTeal")}
                  className="accent-[#0D9488]"
                />
                <span className="w-3.5 h-3.5 rounded-full bg-[#0D9488] inline-block" />
                <span className="text-xs font-bold text-primaryText">Calming Teal</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-borderMuted hover:bg-canvas cursor-pointer flex-1">
                <input
                  type="radio"
                  name="pot-theme"
                  checked={theme === "warmAmber"}
                  onChange={() => setTheme("warmAmber")}
                  className="accent-[#D97706]"
                />
                <span className="w-3.5 h-3.5 rounded-full bg-[#D97706] inline-block" />
                <span className="text-xs font-bold text-primaryText">Warm Amber</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 text-left">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-borderMuted hover:bg-canvas text-sm font-bold text-primaryText transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="py-2.5 px-5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white text-sm font-bold shadow-md transition-all disabled:opacity-40"
            >
              Create Pot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
