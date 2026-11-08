/**
 * PocketPot Money Breakdown & KS2 Mathematical Fraction Utilities
 * 
 * Provides:
 * 1. British currency breakdown into actual notes (£20, £10, £5) and coins (£2, £1, 50p, 20p, 10p, 5p, 2p, 1p)
 * 2. Simplified fraction calculator with pictorial segmented bar for KS2 math progression (e.g., £20/£50 = 2/5)
 */

export interface CurrencyItem {
  type: "note" | "coin";
  valuePence: number;
  label: string;
  count: number;
  themeColor: string;
  borderColor: string;
  textColor: string;
}

const BRITISH_DENOMINATIONS: Array<{
  type: "note" | "coin";
  valuePence: number;
  label: string;
  themeColor: string;
  borderColor: string;
  textColor: string;
}> = [
  {
    type: "note",
    valuePence: 2000,
    label: "£20 Note",
    themeColor: "bg-[#E9D5FF]",
    borderColor: "border-[#C084FC]",
    textColor: "text-focusIndicator",
  },
  {
    type: "note",
    valuePence: 1000,
    label: "£10 Note",
    themeColor: "bg-[#FEF3C7]",
    borderColor: "border-[#FDE68A]",
    textColor: "text-brandSecondary",
  },
  {
    type: "note",
    valuePence: 500,
    label: "£5 Note",
    themeColor: "bg-[#CCFBF1]",
    borderColor: "border-[#5EEAD4]",
    textColor: "text-brandPrimary",
  },
  {
    type: "coin",
    valuePence: 200,
    label: "£2",
    themeColor: "bg-amber-100",
    borderColor: "border-amber-400",
    textColor: "text-primaryText",
  },
  {
    type: "coin",
    valuePence: 100,
    label: "£1",
    themeColor: "bg-amber-100",
    borderColor: "border-amber-500",
    textColor: "text-primaryText",
  },
  {
    type: "coin",
    valuePence: 50,
    label: "50p",
    themeColor: "bg-slate-200",
    borderColor: "border-slate-400",
    textColor: "text-primaryText",
  },
  {
    type: "coin",
    valuePence: 20,
    label: "20p",
    themeColor: "bg-slate-200",
    borderColor: "border-slate-400",
    textColor: "text-primaryText",
  },
  {
    type: "coin",
    valuePence: 10,
    label: "10p",
    themeColor: "bg-slate-200",
    borderColor: "border-slate-400",
    textColor: "text-primaryText",
  },
  {
    type: "coin",
    valuePence: 5,
    label: "5p",
    themeColor: "bg-slate-200",
    borderColor: "border-slate-400",
    textColor: "text-primaryText",
  },
  {
    type: "coin",
    valuePence: 2,
    label: "2p",
    themeColor: "bg-amber-700 text-white",
    borderColor: "border-amber-900",
    textColor: "text-white",
  },
  {
    type: "coin",
    valuePence: 1,
    label: "1p",
    themeColor: "bg-amber-700 text-white",
    borderColor: "border-amber-900",
    textColor: "text-white",
  },
];

/**
 * Breaks down an amount in pence into British currency denominations in simplest form.
 */
export function breakdownBritishCurrency(amountPence: number): CurrencyItem[] {
  if (amountPence <= 0) return [];

  let remaining = Math.round(amountPence);
  const items: CurrencyItem[] = [];

  for (const denom of BRITISH_DENOMINATIONS) {
    if (remaining >= denom.valuePence) {
      const count = Math.floor(remaining / denom.valuePence);
      remaining %= denom.valuePence;
      items.push({
        type: denom.type,
        valuePence: denom.valuePence,
        label: denom.label,
        count,
        themeColor: denom.themeColor,
        borderColor: denom.borderColor,
        textColor: denom.textColor,
      });
    }
    if (remaining === 0) break;
  }

  return items;
}

/**
 * Computes greatest common divisor (Euclidean Algorithm)
 */
function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export interface SimplifiedFractionResult {
  numerator: number;
  denominator: number;
  fractionString: string;
  percentage: number;
  segments: boolean[];
}

/**
 * Calculates a simplified fraction and segmented pictorial representation for KS2 math.
 * E.g., £20 of £50 -> 2/5 (with a 5-segment bar having 2 filled).
 */
export function getSimplifiedFraction(
  currentCents: number,
  targetCents: number
): SimplifiedFractionResult {
  const percentage = Math.min(
    100,
    targetCents > 0 ? Math.round((currentCents / targetCents) * 100) : 0
  );

  if (targetCents <= 0 || currentCents <= 0) {
    return {
      numerator: 0,
      denominator: 5,
      fractionString: "0/5",
      percentage: 0,
      segments: [false, false, false, false, false],
    };
  }

  if (currentCents >= targetCents) {
    return {
      numerator: 1,
      denominator: 1,
      fractionString: "1/1",
      percentage: 100,
      segments: [true],
    };
  }

  // Find exact GCD
  const commonDivisor = gcd(currentCents, targetCents);
  let num = currentCents / commonDivisor;
  let den = targetCents / commonDivisor;

  // If denominator is clean for KS2 (<= 12), use it directly!
  if (den <= 12) {
    const segments: boolean[] = [];
    for (let i = 0; i < den; i++) {
      segments.push(i < num);
    }
    return {
      numerator: num,
      denominator: den,
      fractionString: `${num}/${den}`,
      percentage,
      segments,
    };
  }

  // If exact denominator is unwieldy (e.g. 17/50 or prime), simplify to nearest standard tenths or fifths
  const standardDenom = 10;
  const standardNum = Math.round((currentCents / targetCents) * standardDenom);
  const segments: boolean[] = [];
  for (let i = 0; i < standardDenom; i++) {
    segments.push(i < standardNum);
  }

  // Reduce standardNum/standardDenom if possible (e.g. 4/10 -> 2/5)
  const approxGcd = gcd(standardNum, standardDenom);
  const finalNum = standardNum / approxGcd;
  const finalDen = standardDenom / approxGcd;

  return {
    numerator: finalNum,
    denominator: finalDen,
    fractionString: `${finalNum}/${finalDen}`,
    percentage,
    segments,
  };
}
