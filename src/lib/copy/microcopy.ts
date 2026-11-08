/**
 * PocketPot KS2 Non-Punitive Microcopy Framework
 * 
 * Strict Guidelines:
 * 1. Terminology: All savings containers must be styled and referred to strictly as "Pots" or "Savings Pots" (never "jars" or "piggy banks").
 * 2. Zero punitive vocabulary (no "denied", "error", "failed", "insufficient", "violation").
 * 3. Growth mindset and agency: Reframe constraints as thoughtful pauses, resting, or planting seeds.
 * 4. Clear, direct language strictly left-aligned for dyslexic-friendly readability.
 */

export interface MicrocopyItem {
  headline: string;
  body: string;
  actionPrompt?: string;
  badgeText: string;
}

export const NON_PUNITIVE_MICROCOPY = {
  // Reframing deposit or frequency limits
  takingAPause: {
    headline: "Taking a pause",
    body: "Your Savings Pot has gathered all its seeds for today. Let's take a calm pause so your savings have time to settle.",
    actionPrompt: "Savings Pots refresh each school morning",
    badgeText: "Taking a Pause",
  },

  // Reframing a low or zero balance
  readyForNewSeeds: {
    headline: "Ready for new seeds",
    body: "This Savings Pot is clean, calm, and ready to welcome its first savings step.",
    actionPrompt: "Add your first seed to this Pot whenever you are ready",
    badgeText: "Fresh Pot",
  },

  // Reframing a goal reached
  goalCelebration: {
    headline: "Goal reached together",
    body: "Your Savings Pot is fully balanced and full of seeds! You took steady steps to reach this milestone.",
    actionPrompt: "Celebrate or set a new milestone for this Pot",
    badgeText: "Goal Complete",
  },

  // Reframing an over-allocation or calculation conflict
  reflectionCheck: {
    headline: "Taking a mindful breath",
    body: "Let's review the seeds in each Savings Pot. Taking a moment allows us to choose which goal matters most today.",
    actionPrompt: "Adjust seeds between Savings Pots",
    badgeText: "Reflection Time",
  },

  // Daily allocation guide
  steadyPace: {
    headline: "Steady pace wins",
    body: "Small amounts added steadily to your Savings Pot help big ideas grow.",
    actionPrompt: "Keep growing your Pot step-by-step",
    badgeText: "Steady Journey",
  },
} as const;
