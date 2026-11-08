"use client";

import React, { useState, useEffect } from "react";
import {
  MarketplaceRewardDocument,
  MarketplacePurchaseDocument,
  RewardTier,
} from "@/lib/firebase/types";
import {
  getSavedRewards,
  createReward,
  updateReward,
  deleteReward,
  getSavedPurchases,
  fulfillPurchase,
  refundPurchase,
  normalizeClassId,
} from "@/lib/services/marketplace-service";
import { formatCurrency } from "@/lib/firebase/zero-pii";
import {
  ShoppingBag,
  Sparkles,
  PlusCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
  Edit2,
  Lightbulb,
  ShieldCheck,
  Package,
  Layers,
  PoundSterling,
} from "lucide-react";

interface TeacherMarketplaceProps {
  classId?: string;
}

const PRESET_ICONS = ["🚀", "🪑", "🎵", "🧸", "☕", "🎟️", "⚽", "📚", "🎨", "🌟", "👑", "🍕"];

export const TeacherMarketplace: React.FC<TeacherMarketplaceProps> = ({
  classId = "class-year-4-teal",
}) => {
  const normalizedClassId = normalizeClassId(classId);
  const [rewards, setRewards] = useState<MarketplaceRewardDocument[]>([]);
  const [purchases, setPurchases] = useState<MarketplacePurchaseDocument[]>([]);
  const [activeTab, setActiveTab] = useState<"catalog" | "orders">("catalog");

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<MarketplaceRewardDocument | null>(null);

  // Form State (Price in cents/pence internally, shown in £/p)
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriceCents, setFormPriceCents] = useState<number>(150); // Default £1.50
  const [formIcon, setFormIcon] = useState("🚀");
  const [formTier, setFormTier] = useState<RewardTier>("short_term");
  const [formStock, setFormStock] = useState<string>("");

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = () => {
    const loadedRewards = getSavedRewards(normalizedClassId);
    const loadedPurchases = getSavedPurchases(normalizedClassId);
    setRewards(loadedRewards);
    setPurchases(loadedPurchases);
  };

  useEffect(() => {
    loadData();

    // Listen to real-time marketplace events and storage changes
    const handleSync = () => loadData();
    window.addEventListener("pocketpot_marketplace_updated", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("pocketpot_marketplace_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [normalizedClassId]);

  const handleOpenAddModal = () => {
    setEditingReward(null);
    setFormTitle("");
    setFormDescription("");
    setFormPriceCents(150); // £1.50
    setFormIcon("🚀");
    setFormTier("short_term");
    setFormStock("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (reward: MarketplaceRewardDocument) => {
    setEditingReward(reward);
    setFormTitle(reward.title);
    setFormDescription(reward.description);
    setFormPriceCents(reward.priceCoins);
    setFormIcon(reward.icon);
    setFormTier(reward.tier);
    setFormStock(reward.stockQuantity !== undefined ? String(reward.stockQuantity) : "");
    setIsModalOpen(true);
  };

  const handleSaveReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const stock = formStock.trim() ? parseInt(formStock, 10) : undefined;

    if (editingReward) {
      updateReward(editingReward.rewardId, {
        title: formTitle.trim(),
        description: formDescription.trim(),
        priceCoins: Number(formPriceCents),
        icon: formIcon,
        tier: formTier,
        stockQuantity: isNaN(stock as number) ? undefined : stock,
      });
      showToast(`Updated reward "${formTitle}"!`);
    } else {
      // Inactive by default until teacher explicitly activates it
      createReward({
        classId: normalizedClassId,
        title: formTitle.trim(),
        description: formDescription.trim(),
        priceCoins: Number(formPriceCents),
        icon: formIcon,
        tier: formTier,
        stockQuantity: isNaN(stock as number) ? undefined : stock,
        isAvailable: false, // Default inactive
      });
      showToast(`Added "${formTitle}" (Inactive by default - click Activate when ready)`);
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleDeleteReward = (reward: MarketplaceRewardDocument) => {
    if (confirm(`Remove "${reward.title}" from the marketplace?`)) {
      deleteReward(reward.rewardId);
      loadData();
      showToast(`Removed "${reward.title}".`);
    }
  };

  const handleToggleAvailability = (reward: MarketplaceRewardDocument) => {
    const nextState = !reward.isAvailable;
    updateReward(reward.rewardId, { isAvailable: nextState });
    loadData();
    showToast(
      nextState
        ? `"${reward.title}" is now ACTIVE on pupil accounts!`
        : `"${reward.title}" is now INACTIVE (hidden from pupils).`
    );
  };

  const handleFulfillOrder = (purchaseId: string) => {
    fulfillPurchase(purchaseId);
    loadData();
    showToast("Reward marked as delivered to pupil!");
  };

  const handleRefundOrder = (purchase: MarketplacePurchaseDocument) => {
    const cashStr = formatCurrency(purchase.priceCoins);
    const reason = prompt(
      `Issue refund of ${cashStr} for ${purchase.pupilCodename}? (Optional reason):`,
      "Privilege rescheduled or pupil request"
    );
    if (reason !== null) {
      const res = refundPurchase(purchase.purchaseId, reason);
      if (res.success) {
        loadData();
        showToast(
          `Refunded ${cashStr} back to ${purchase.pupilCodename}'s card balance!`
        );
      }
    }
  };

  const pendingOrders = purchases.filter((p) => p.status === "pending");
  const activeCount = rewards.filter((r) => r.isAvailable).length;

  return (
    <div className="space-y-6 text-left font-lexend">
      {/* 1. PEDAGOGICAL EXPLAINER BANNER (Calming Teal #0D9488) */}
      <div className="p-5 sm:p-6 rounded-pot bg-tealSurface border-2 border-brandPrimary/30 shadow-islandCard flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-brandPrimary text-white flex items-center justify-center shrink-0 shadow-xs">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-brandPrimary">
                Pedagogical Guidance &bull; Delayed Gratification
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-brandPrimary font-bold border border-brandPrimary/20">
                Key Stage 2 PSHE
              </span>
            </div>
            <h3 className="text-lg font-bold text-primaryText">
              Teaching Financial Goal-Setting &amp; Delayed Gratification
            </h3>
            <p className="text-xs sm:text-sm text-primaryText/75 max-w-3xl leading-relaxed font-medium">
              Intentionally configure a balanced mix of <strong>Quick Wins (50p–£1.50)</strong> for short-term motivation and <strong>Big Goals (£3.00–£8.00+)</strong>. When pupils encounter unaffordable items, PocketPot seamlessly guides them to <strong>Set Up a Dedicated Savings Pot</strong>, learning that patience and weekly budget discipline unlock greater rewards.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Reward</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-borderMuted pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "catalog"
                ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-xs"
                : "text-primaryText/60 hover:text-primaryText"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Classroom Reward Catalog ({rewards.length})</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-brandPrimary font-bold border border-brandPrimary/20">
              {activeCount} Active on Pupil App
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
              activeTab === "orders"
                ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30 shadow-xs"
                : "text-primaryText/60 hover:text-primaryText"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Redeemed Orders &amp; Fulfillment</span>
            {pendingOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-brandSecondary text-white text-[10px] font-bold flex items-center justify-center">
                {pendingOrders.length}
              </span>
            )}
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-primaryText/60 font-medium">
          <ShieldCheck className="w-4 h-4 text-positiveState" />
          <span>Zero-PII Ledger Audited</span>
        </div>
      </div>

      {/* TAB 1: REWARD CATALOG GRID */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward) => {
            const isShortTerm = reward.tier === "short_term";
            return (
              <div
                key={reward.rewardId}
                className={`p-5 rounded-pot bg-surface border transition-all flex flex-col justify-between space-y-4 shadow-islandCard ${
                  reward.isAvailable
                    ? "border-brandPrimary/40 ring-1 ring-brandPrimary/20"
                    : "opacity-75 border-dashed border-borderMuted bg-canvas/40"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-canvas flex items-center justify-center text-2xl shadow-xs border border-borderMuted">
                      {reward.icon}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          isShortTerm
                            ? "bg-tealSurface text-brandPrimary border-brandPrimary/30"
                            : "bg-amberSurface text-brandSecondary border-brandSecondary/30"
                        }`}
                      >
                        {isShortTerm ? "⚡ Quick Win" : "🏔️ Long-Term Goal"}
                      </span>
                      <span className="text-sm font-extrabold text-primaryText">
                        {formatCurrency(reward.priceCoins)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-primaryText">{reward.title}</h4>
                    <p className="text-xs text-primaryText/70 mt-1 leading-relaxed">
                      {reward.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-borderMuted flex items-center justify-between text-xs">
                  <div className="text-[11px] text-primaryText/60">
                    <span>Redeemed: <strong>{reward.purchasesCount || 0} times</strong></span>
                    {reward.stockQuantity && (
                      <span className="block text-[10px] text-primaryText/50">
                        Cap: {reward.stockQuantity} spots
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Explicit Activate / Inactive Toggle (Requirement 4) */}
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(reward)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                        reward.isAvailable
                          ? "bg-tealSurface text-brandPrimary border border-brandPrimary/30 hover:bg-tealSurface/80"
                          : "bg-brandPrimary text-white hover:bg-teal-700"
                      }`}
                      title={reward.isAvailable ? "Click to deactivate" : "Click to activate for pupils"}
                    >
                      {reward.isAvailable ? "✓ Active in Market" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(reward)}
                      className="p-1.5 rounded-lg bg-canvas hover:bg-tealSurface text-primaryText/70 hover:text-brandPrimary border border-borderMuted transition-colors"
                      title="Edit reward"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReward(reward)}
                      className="p-1.5 rounded-lg bg-canvas hover:bg-amberSurface text-primaryText/70 hover:text-warningState border border-borderMuted transition-colors"
                      title="Delete reward"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: REDEEMED ORDERS & FULFILLMENT TRACKER */}
      {activeTab === "orders" && (
        <div className="bg-surface rounded-pot border border-borderMuted shadow-islandCard overflow-hidden text-left">
          <div className="p-4 sm:p-5 border-b border-borderMuted flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-primaryText">Redeemed Market Privileges</h4>
              <p className="text-xs text-primaryText/60">
                Track delivery of pupil privileges or issue instant cash refunds to card balance.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-tealSurface text-brandPrimary border border-brandPrimary/30">
              {purchases.length} Total Orders
            </span>
          </div>

          {purchases.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-primaryText/30 mx-auto" />
              <p className="text-sm font-bold text-primaryText/70">No rewards redeemed yet</p>
              <p className="text-xs text-primaryText/50">
                When pupils purchase marketplace privileges, they will appear here for fulfillment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-canvas border-b border-borderMuted text-primaryText/70 uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 font-bold">Pupil (Zero-PII Codename)</th>
                    <th className="p-3.5 font-bold">Reward Item</th>
                    <th className="p-3.5 font-bold">Cost</th>
                    <th className="p-3.5 font-bold">Date</th>
                    <th className="p-3.5 font-bold">Status</th>
                    <th className="p-3.5 font-bold text-right">Teacher Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderMuted/60">
                  {purchases.map((purchase) => {
                    const isPending = purchase.status === "pending";
                    const isFulfilled = purchase.status === "fulfilled";
                    const isRefunded = purchase.status === "refunded";

                    return (
                      <tr key={purchase.purchaseId} className="hover:bg-canvas/50 transition-colors">
                        <td className="p-3.5 font-bold text-primaryText">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-brandPrimary inline-block" />
                            {purchase.pupilCodename}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="flex items-center gap-2 font-semibold text-primaryText">
                            <span>{purchase.rewardIcon}</span>
                            <span>{purchase.rewardTitle}</span>
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-brandPrimary">
                          {formatCurrency(purchase.priceCoins)}
                        </td>
                        <td className="p-3.5 text-primaryText/60">
                          {new Date(purchase.purchasedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3.5">
                          {isPending && (
                            <span className="px-2.5 py-1 rounded-full bg-amberSurface text-brandSecondary font-bold text-[10px] border border-brandSecondary/30">
                              🟡 Pending Delivery
                            </span>
                          )}
                          {isFulfilled && (
                            <span className="px-2.5 py-1 rounded-full bg-tealSurface text-positiveState font-bold text-[10px] border border-positiveState/30">
                              🟢 Delivered / Enjoyed
                            </span>
                          )}
                          {isRefunded && (
                            <span className="px-2.5 py-1 rounded-full bg-canvas text-primaryText/60 font-bold text-[10px] border border-borderMuted">
                              🔵 Refunded to Balance
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleFulfillOrder(purchase.purchaseId)}
                                className="px-2.5 py-1 rounded-lg bg-positiveState text-white font-bold text-[11px] hover:bg-green-700 transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Mark Delivered</span>
                              </button>
                            )}
                            {!isRefunded && (
                              <button
                                type="button"
                                onClick={() => handleRefundOrder(purchase)}
                                className="px-2.5 py-1 rounded-lg bg-canvas hover:bg-amberSurface text-primaryText/70 hover:text-warningState border border-borderMuted transition-colors text-[11px] font-bold flex items-center gap-1"
                                title="Refund cash value to pupil"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Refund</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT REWARD MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-primaryText/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-surface rounded-pot border border-borderMuted shadow-2xl p-5 sm:p-6 md:p-8 space-y-5 max-w-lg w-full text-left">
            <div className="flex items-start justify-between border-b border-borderMuted pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brandPrimary">
                  Classroom Economy
                </span>
                <h3 className="text-xl font-bold text-primaryText mt-0.5">
                  {editingReward ? "Edit Market Reward" : "Create Market Reward"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-primaryText/40 hover:text-primaryText text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="space-y-4">
              {/* Title with Placeholders */}
              <div>
                <label className="block text-xs font-bold text-primaryText uppercase tracking-wider mb-1">
                  Reward Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Move to the front of the line for a week or Choose your own desk"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-borderMuted text-primaryText text-xs font-medium focus:outline-brandPrimary focus:ring-1 focus:ring-brandPrimary"
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-bold text-primaryText uppercase tracking-wider mb-1.5">
                  Select Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setFormIcon(ico)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition-all ${
                        formIcon === ico
                          ? "bg-tealSurface border-brandPrimary scale-105 shadow-xs"
                          : "bg-canvas border-borderMuted hover:border-brandPrimary/40"
                      }`}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price in Cash (£ and p) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-primaryText uppercase tracking-wider mb-1">
                    Price (£) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-primaryText/60">£</span>
                    <input
                      type="number"
                      required
                      min={0.10}
                      step={0.05}
                      value={(formPriceCents / 100).toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setFormPriceCents(Math.round(val * 100));
                      }}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-canvas border border-borderMuted text-primaryText text-xs font-bold focus:outline-brandPrimary"
                    />
                  </div>
                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[50, 100, 150, 200, 300, 500].map((cents) => (
                      <button
                        key={cents}
                        type="button"
                        onClick={() => setFormPriceCents(cents)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold border transition-colors ${
                          formPriceCents === cents
                            ? "bg-tealSurface text-brandPrimary border-brandPrimary"
                            : "bg-canvas text-primaryText/60 border-borderMuted hover:bg-borderMuted"
                        }`}
                      >
                        {formatCurrency(cents)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-primaryText uppercase tracking-wider mb-1">
                    Pedagogical Tier *
                  </label>
                  <select
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value as RewardTier)}
                    className="w-full px-3 py-2.5 rounded-xl bg-canvas border border-borderMuted text-primaryText text-xs font-bold focus:outline-brandPrimary"
                  >
                    <option value="short_term">⚡ Quick Win (50p–£1.50)</option>
                    <option value="long_term">🏔️ Long-Term Goal (£3.00+)</option>
                  </select>
                  <span className="text-[11px] text-primaryText/60 block mt-1">
                    {formTier === "short_term" ? "Teaches short-term reward" : "Teaches delayed gratification"}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-primaryText uppercase tracking-wider mb-1">
                  Privilege Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Explain when and how the pupil can enjoy this privilege..."
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-borderMuted text-primaryText text-xs font-medium focus:outline-brandPrimary"
                />
              </div>

              {/* Optional Stock Limit */}
              <div>
                <label className="block text-xs font-bold text-primaryText uppercase tracking-wider mb-1">
                  Availability Limit (Optional)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  placeholder="e.g. 2 pupils per week (leave blank for unlimited)"
                  className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-borderMuted text-primaryText text-xs font-medium focus:outline-brandPrimary"
                />
              </div>

              <div className="p-3 rounded-xl bg-tealSurface/50 border border-brandPrimary/20 text-xs text-primaryText/70">
                ℹ️ <strong>Note:</strong> Newly created rewards start as <strong>Inactive</strong> by default. You can activate them whenever you are ready for pupils to see and buy them.
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-borderMuted flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-canvas hover:bg-borderMuted text-primaryText/70 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brandPrimary hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all"
                >
                  {editingReward ? "Save Changes" : "Create Reward"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primaryText text-white px-4 py-3 rounded-2xl shadow-xl border border-white/10 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-brandSecondary" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
