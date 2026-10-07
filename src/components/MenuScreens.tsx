import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgePercent,
  Bot,
  Dices,
  Flag,
  Globe,
  HelpCircle,
  Lock,
  Music,
  RotateCcw,
  Settings as SettingsIcon,
  Shield,
  Skull,
  Swords,
  Coins,
  Gift,
  Timer,
  ShoppingBag,
  Check,
  Palette,
  User,
  Pencil,
  History,
  Users,
  Sparkles,
  Trophy,
  Mail,
  Diamond,
  Volume2,
  Share2,
} from "lucide-react";
import {
  emptyProgress,
  readProgress,
  writeProgress,
  type Progress,
  type Settings,
} from "@/hooks/use-settings";
import { PIECES_PER_PLAYER, type RuleSet } from "@/lib/game";
import { getCoins, getGems, claimDaily, canClaimDaily, msUntilNextDaily, rewardForAd, rewardGemsForAd, gemCostForStake, STAKE_OPTIONS, COIN_AMOUNTS } from "@/lib/coins";
import { spendCoins } from "@/lib/coins";
import { SKINS, getUnlockedSkins, unlockSkin, getSelectedSkin, selectSkin } from "@/lib/skins";
import {
  FRAMES,
  getProfileName,
  setProfileName,
  getUnlockedFrames,
  unlockFrame,
  getSelectedFrame,
  selectFrame,
  getFrameById,
  getMatchHistory,
  getCurrentTitle,
  getUnlockedTitles,
  TITLES,
} from "@/lib/profile";
import { areAdsRemoved, showRewardedAd } from "@/lib/ads";

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        background:
          "radial-gradient(120% 60% at 50% 0%, color-mix(in oklab, var(--p1) 35%, transparent), transparent 70%), radial-gradient(120% 60% at 50% 100%, color-mix(in oklab, var(--p2) 30%, transparent), transparent 70%)",
      }}
    />
    <div className="relative z-10 flex min-h-[100dvh] flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      {children}
    </div>
  </main>
);

export function LoadingScreen() {
  return (
    <Shell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 animate-fade-in">
        <div className="grid h-24 w-24 place-items-center rounded-3xl border-2 border-primary bg-card shadow-lg">
          <Dices className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-center font-display text-2xl tracking-wide text-primary">
          Hourglass Duel
        </h1>
        <div className="h-2 w-48 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/3 animate-loading-bar rounded-full bg-primary" />
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Loading…</p>
      </div>
    </Shell>
  );
}

type MenuButtonProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  locked?: boolean;
  accent?: boolean;
};

function MenuButton({ icon, title, subtitle, onClick, locked, accent }: MenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[68px] w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-transform active:scale-[0.98] ${
        locked
          ? "border-border bg-secondary/40 opacity-60"
          : accent
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
          accent && !locked ? "bg-primary-foreground/15" : "bg-secondary"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base">{title}</span>
        <span
          className={`block truncate text-xs ${
            accent && !locked ? "text-primary-foreground/80" : "text-muted-foreground"
          }`}
        >
          {subtitle}
        </span>
      </span>
      {locked && <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />}
    </button>
  );
}

export function HomeScreen({
  onPlayOffline,
  onPlayOnline,
  onProfile,
  onSettings,
  onEquipment,
  onTrophies,
  onCoinsClick,
  onGemsClick,
  onLuckyShot,
  luckyAvailable,
  coins,
  gems,
}: {
  onPlayOffline: () => void;
  onPlayOnline: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onEquipment: () => void;
  onTrophies: () => void;
  onCoinsClick: () => void;
  onGemsClick: () => void;
  onLuckyShot: () => void;
  luckyAvailable: boolean;
  coins: number;
  gems: number;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const name = getProfileName();
  const activeFrame = getFrameById(getSelectedFrame());

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <Shell>
      <div className="flex shrink-0 items-center justify-between pb-3">
        <button type="button" onClick={onProfile} className="flex items-center gap-2 active:scale-95">
          <span
            className="grid h-9 w-9 place-items-center rounded-full border-2 bg-card"
            style={{ borderColor: activeFrame.borderColor }}
          >
            <User className="h-4 w-4 text-primary" />
          </span>
          <span className="text-xs font-semibold">{name}</span>
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCoinsClick}
            className="flex items-center gap-1 rounded-full border border-primary/50 bg-card px-2.5 py-1.5 active:scale-95"
          >
            <Coins className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">{coins.toLocaleString()}</span>
          </button>
          <button
            type="button"
            onClick={onGemsClick}
            className="flex items-center gap-1 rounded-full border border-sky-400/50 bg-card px-2.5 py-1.5 active:scale-95"
          >
            <Diamond className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-xs font-semibold">{gems.toLocaleString()}</span>
          </button>
          <button
            type="button"
            onClick={onSettings}
            className="grid h-8 w-8 place-items-center rounded-full bg-secondary active:scale-95"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-2 animate-fade-in">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onCoinsClick}
            className="rounded-xl border border-border bg-card p-2.5 text-center active:scale-95"
          >
            <Gift className="mx-auto h-4 w-4 text-primary" />
            <p className="mt-1 text-[9px] font-semibold">Free Rewards</p>
          </button>
          <button
            type="button"
            onClick={() => (luckyAvailable ? onLuckyShot() : setToast("Come back tomorrow for another Lucky Match!"))}
            className={`relative rounded-xl border border-border bg-card p-2.5 text-center active:scale-95 ${luckyAvailable ? "" : "opacity-50"}`}
          >
            <Sparkles className="mx-auto h-4 w-4 text-primary" />
            <p className="mt-1 text-[9px] font-semibold">Lucky Match</p>
            {!luckyAvailable && <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-muted-foreground" />}
          </button>
          <button
            type="button"
            onClick={() => setToast("Leaderboards unlock after online play!")}
            className="relative rounded-xl border border-border bg-card p-2.5 text-center active:scale-95"
          >
            <Trophy className="mx-auto h-4 w-4 text-muted-foreground" />
            <p className="mt-1 text-[9px] font-semibold text-muted-foreground">Leaderboard</p>
            <Lock className="absolute right-1 top-1 h-2.5 w-2.5 text-muted-foreground" />
          </button>
        </div>

        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border-2 border-primary bg-card">
            <Dices className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-2 font-display text-xl tracking-wide text-primary">
            Hourglass Duel
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Roll, split your points, race all {PIECES_PER_PLAYER} pieces home.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onPlayOnline}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.98]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <Globe className="h-5 w-5 text-primary" />
            </span>
            <div className="flex-1">
              <p className="font-display text-base">Play Online</p>
              <p className="text-xs text-muted-foreground">Create or join a room with a friend</p>
            </div>
          </button>
          <button
            type="button"
            onClick={onPlayOffline}
            className="flex w-full items-center gap-3 rounded-2xl border border-primary bg-primary p-4 text-left text-primary-foreground active:scale-[0.98]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-foreground/15">
              <Swords className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-display text-base">Play Offline</p>
              <p className="text-xs text-primary-foreground/80">1v1 or vs Bot on this phone</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setToast("Events are coming soon!")}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-4 text-left opacity-60"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-display text-base">Events</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1" />
        <div className="h-[50px] shrink-0" aria-hidden />
      </div>

      <BottomNav
        active="home"
        onHome={() => {}}
        onFriends={() => setToast("Connect Facebook to add friends!")}
        onEquipment={onEquipment}
        onTrophies={onTrophies}
      />

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6 animate-fade-in">
          <div className="rounded-full border border-border bg-card px-5 py-3 text-sm">{toast}</div>
        </div>
      )}
    </Shell>
  );
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-secondary active:scale-95"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="flex-1 text-center font-display text-lg text-primary">{title}</h1>
      <span className="h-11 w-11" />
    </div>
  );
}

function Toggle({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 active:scale-[0.98]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">{icon}</span>
      <span className="flex-1 text-left text-sm font-semibold">{label}</span>
      <span
        className={`relative h-7 w-12 rounded-full transition-colors ${
          value ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-card transition-all ${
            value ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

export function SettingsScreen({
  settings,
  onChange,
  onHelp,
  onBack,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
  onHelp: () => void;
}) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  useEffect(() => setProgress(readProgress()), []);

  return (
    <Shell>
      <ScreenHeader title="Settings" onBack={onBack} />
      <div className="space-y-3 animate-fade-in">
        <Toggle
          icon={<Music className="h-5 w-5" />}
          label="Background music"
          value={settings.music}
          onChange={(v) => onChange({ music: v })}
        />
        <Toggle
          icon={<Volume2 className="h-5 w-5" />}
          label="Sound effects"
          value={settings.sfx}
          onChange={(v) => onChange({ sfx: v })}
        />

        <button
          type="button"
          onClick={onHelp}
          className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 active:scale-[0.98]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
            <HelpCircle className="h-5 w-5" />
          </span>
          <span className="flex-1 text-left">
            <span className="block text-sm font-semibold">How to Play</span>
            <span className="block text-xs text-muted-foreground">Rules in 60 seconds</span>
          </span>
        </button>

        <div
          aria-disabled
          className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 opacity-70"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
            <BadgePercent className="h-5 w-5" />
          </span>
          <span className="flex-1 text-left">
            <span className="block text-sm font-semibold">Remove Ads</span>
            <span className="block text-xs text-muted-foreground">
              One-time purchase — hides all ads
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-border bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Coming soon
          </span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-primary" /> Progress
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {progress.games} games played · Player 1 wins {progress.wins1} · Player 2 wins{" "}
            {progress.wins2}
          </p>
          <button
            type="button"
            onClick={() => {
              writeProgress(emptyProgress);
              setProgress(emptyProgress);
            }}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-destructive/60 bg-destructive/15 text-sm font-semibold active:scale-95"
          >
            <RotateCcw className="h-4 w-4" /> Reset Game Progress
          </button>
        </div>
      </div>
    </Shell>
  );
}

const RULES: Array<{ icon: React.ReactNode; title: string; body: string }> = [
  {
    icon: <Swords className="h-5 w-5 text-primary" />,
    title: "The board",
    body: "Seven rows in an hourglass shape: two 4-wide home rows for each player at the top and bottom, and wider 6-wide rows in the middle. Each player starts with 8 pieces.",
  },
  {
    icon: <Dices className="h-5 w-5 text-primary" />,
    title: "Rolling",
    body: "Each turn you roll a 1, 2 or 3. That number is your movement points for the whole turn.",
  },
  {
    icon: <Bot className="h-5 w-5 text-primary" />,
    title: "Moving & splitting",
    body: "Tap a piece, then tap a highlighted square. Moves go straight up, down, left or right — never diagonally. You can spend your points across several pieces, e.g. a 3 can be a 2-step move plus a 1-step move.",
  },
  {
    icon: <Trophy className="h-5 w-5 text-primary" />,
    title: "Capturing",
    body: "Land on an opponent's piece to send it back to its starting square. You cannot land on or jump over your own pieces.",
  },
  {
    icon: <Shield className="h-5 w-5 text-primary" />,
    title: "Safe zone",
    body: "A piece resting in its own two home rows is marked ✦ — it cannot be captured, and no one can move through it.",
  },
  {
    icon: <Globe className="h-5 w-5 text-primary" />,
    title: "Winning",
    body: `Reach the opponent's far rows and the piece vanishes into your score. First player to get all ${PIECES_PER_PLAYER} pieces across wins.`,
  },
];

export function HelpScreen({ onBack }: { onBack: () => void }) {
  return (
    <Shell>
      <ScreenHeader title="How to Play" onBack={onBack} />
      <div className="space-y-3 overflow-y-auto pb-4 animate-fade-in">
        {RULES.map((r) => (
          <div key={r.title} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary">
                {r.icon}
              </span>
              <h2 className="font-display text-sm">{r.title}</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function ModeSelectScreen({
  heading,
  onPick,
  onBack,
}: {
  heading: string;
  onPick: (rules: "race" | "elimination") => void;
  onBack: () => void;
}) {
  return (
    <Shell>
      <ScreenHeader title={heading} onBack={onBack} />
      <div className="flex flex-1 flex-col justify-center gap-4 pb-6 animate-fade-in">
        <p className="text-center text-xs text-muted-foreground">Choose how you want to play</p>
        <button
          type="button"
          onClick={() => onPick("race")}
          className="rounded-2xl border border-primary bg-primary p-4 text-left text-primary-foreground active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-foreground/15">
              <Flag className="h-5 w-5" />
            </span>
            <span className="font-display text-base">Race Mode</span>
          </div>
          <p className="mt-2 text-xs text-primary-foreground/80">
            Safe home rows are on. Get all {PIECES_PER_PLAYER} of your pieces across to the
            opponent's far rows to win.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onPick("elimination")}
          className="rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <Skull className="h-5 w-5 text-primary" />
            </span>
            <span className="font-display text-base">Elimination Mode</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            No safe zones. Captured pieces are gone for good — lose all 8 and you lose the
            match.
          </p>
        </button>
      </div>
    </Shell>
  );
}



export function StakeSelectScreen({
  coins,
  gems,
  onPick,
  onPickWithGems,
  onPickFree,
  onBack,
}: {
  coins: number;
  gems: number;
  onPick: (stake: number) => void;
  /** Omit to disable paying with gems (online rooms are coin-only). */
  onPickWithGems?: ((stake: number) => void) | undefined;
  /** When set, shows a "Free — no stake" option. */
  onPickFree?: (() => void) | undefined;
  onBack: () => void;
}) {
  return (
    <Shell>
      <ScreenHeader title="Choose Your Stake" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-6 animate-fade-in">
        <div className="mx-auto mb-2 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{coins}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-sky-400/50 bg-card px-4 py-2">
            <Diamond className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-semibold">{gems}</span>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Win to double your stake. Lose and the stake is gone.
        </p>
        {onPickFree && (
          <button
            type="button"
            onClick={onPickFree}
            className="rounded-2xl border border-border bg-card p-4 text-center font-display text-base active:scale-95"
          >
            Free — No Stake
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          {STAKE_OPTIONS.map((stake) => {
            const affordableByCoins = coins >= stake;
            const gemCost = gemCostForStake(stake);
            const affordableByGems = !!onPickWithGems && !affordableByCoins && gems >= gemCost;
            const affordable = affordableByCoins || affordableByGems;
            return (
              <button
                key={stake}
                type="button"
                disabled={!affordable}
                onClick={() => (affordableByCoins ? onPick(stake) : onPickWithGems?.(stake))}
                className={`rounded-2xl border p-4 text-center transition-transform active:scale-95 ${
                  affordable
                    ? affordableByCoins
                      ? "border-primary bg-card"
                      : "border-sky-400 bg-card"
                    : "border-border bg-secondary/40 opacity-40"
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-display text-base">{stake.toLocaleString()}</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Win {(stake * 2).toLocaleString()}
                </p>
                {affordableByGems && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-sky-400">
                    <Diamond className="h-3 w-3" />
                    Pay {gemCost} gems instead
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CoinsScreen({
  coins,
  onCoinsChange,
  onBack,
}: {
  coins: number;
  onCoinsChange: (coins: number) => void;
  onBack: () => void;
}) {
  const [remaining, setRemaining] = useState(msUntilNextDaily());
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setRemaining(msUntilNextDaily()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const canClaim = remaining <= 0;

  const handleClaim = () => {
    const amount = claimDaily();
    if (amount > 0) {
      onCoinsChange(getCoins());
      setRemaining(msUntilNextDaily());
    }
  };

  const handleWatchAd = () => {
    setWatching(true);
    showRewardedAd(
      () => {
        rewardForAd();
        onCoinsChange(getCoins());
      },
      () => setWatching(false),
    );
  };

  return (
    <Shell>
      <ScreenHeader title="Coins" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-6 animate-fade-in">
        <div className="rounded-2xl border border-primary bg-card p-5 text-center">
          <p className="text-xs text-muted-foreground">Your balance</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            <span className="font-display text-3xl text-primary">{coins.toLocaleString()}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <Gift className="h-5 w-5 text-primary" />
            </span>
            <div className="flex-1">
              <p className="font-display text-sm">Daily Reward</p>
              <p className="text-xs text-muted-foreground">
                {canClaim ? `Claim ${COIN_AMOUNTS.daily} free coins` : "Come back later"}
              </p>
            </div>
          </div>
          {canClaim ? (
            <button
              onClick={handleClaim}
              className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground active:scale-[0.98]"
            >
              Claim Now
            </button>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-secondary/50 py-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              {formatCountdown(remaining)}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <Gift className="h-5 w-5 text-primary" />
            </span>
            <div className="flex-1">
              <p className="font-display text-sm">Watch Ad for Coins</p>
              <p className="text-xs text-muted-foreground">
                Get {COIN_AMOUNTS.ad} coins per ad, no limit
              </p>
            </div>
          </div>
          <button
            onClick={handleWatchAd}
            disabled={watching}
            className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-50"
          >
            {watching ? "Loading ad..." : "Watch Ad"}
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="flex-1">
              <p className="font-display text-sm text-muted-foreground">Buy Coins</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function SkinsScreen({
  coins,
  onCoinsChange,
  onBack,
}: {
  coins: number;
  onCoinsChange: (coins: number) => void;
  onBack: () => void;
}) {
  const [unlocked, setUnlocked] = useState<string[]>(getUnlockedSkins());
  const [selected, setSelected] = useState(getSelectedSkin());
  const [confirming, setConfirming] = useState<(typeof SKINS)[number] | null>(null);

  const handleTap = (skin: (typeof SKINS)[number]) => {
    const owned = unlocked.includes(skin.id);
    if (owned) {
      selectSkin(skin.id);
      setSelected(skin.id);
    } else {
      setConfirming(skin);
    }
  };

  const confirmBuy = () => {
    if (!confirming) return;
    if (!spendCoins(confirming.price)) {
      setConfirming(null);
      return;
    }
    unlockSkin(confirming.id);
    setUnlocked(getUnlockedSkins());
    onCoinsChange(coins - confirming.price);
    selectSkin(confirming.id);
    setSelected(confirming.id);
    setConfirming(null);
  };

  return (
    <Shell>
      <ScreenHeader title="Piece Colors" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-6 animate-fade-in">
        <div className="mx-auto flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <Coins className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{coins.toLocaleString()}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SKINS.map((skin) => {
            const owned = unlocked.includes(skin.id);
            const isSelected = selected === skin.id;
            const swatch = skin.color || "var(--p1)";
            return (
              <button
                key={skin.id}
                type="button"
                onClick={() => handleTap(skin)}
                disabled={!owned && coins < skin.price}
                className={`rounded-2xl border p-4 text-center transition-transform active:scale-95 ${
                  isSelected
                    ? "border-primary bg-card"
                    : owned
                      ? "border-border bg-card"
                      : coins < skin.price
                        ? "border-border bg-secondary/40 opacity-40"
                        : "border-border bg-card"
                }`}
              >
                <div className="relative mx-auto grid h-12 w-12 place-items-center">
                  <span
                    className="h-9 w-9 rounded-full border-2"
                    style={{ backgroundColor: swatch, borderColor: skin.glow || "var(--p1-glow)" }}
                  />
                  {isSelected && (
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold">{skin.name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {owned ? (isSelected ? "Selected" : "Owned") : `${skin.price} coins`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 px-6 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-primary bg-card p-6 text-center">
            <div
              className="mx-auto mb-3 h-14 w-14 rounded-full border-2"
              style={{
                backgroundColor: confirming.color,
                borderColor: confirming.glow,
              }}
            />
            <p className="font-display text-lg text-primary">Buy {confirming.name}?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This will cost {confirming.price.toLocaleString()} coins.
            </p>
            <button
              type="button"
              onClick={confirmBuy}
              className="mt-6 h-14 w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground active:scale-95"
            >
              Confirm Purchase
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="mt-3 h-12 w-full rounded-2xl border border-border bg-secondary text-sm font-semibold active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

export function ProfileScreen({
  coins,
  onCoinsChange,
  onBack,
}: {
  coins: number;
  onCoinsChange: (coins: number) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(getProfileName());
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [unlocked, setUnlocked] = useState<string[]>(getUnlockedFrames());
  const [selected, setSelected] = useState(getSelectedFrame());
  const [confirming, setConfirming] = useState<(typeof FRAMES)[number] | null>(null);
  const history = getMatchHistory();
  const activeFrame = getFrameById(selected);
  const currentTitle = getCurrentTitle();
  const unlockedTitleIds = getUnlockedTitles().map((t) => t.id);

  const saveName = () => {
    setProfileName(draftName);
    setName(getProfileName());
    setEditing(false);
  };

  const handleTap = (frame: (typeof FRAMES)[number]) => {
    const owned = unlocked.includes(frame.id);
    if (owned) {
      selectFrame(frame.id);
      setSelected(frame.id);
    } else {
      setConfirming(frame);
    }
  };

  const confirmBuy = () => {
    if (!confirming) return;
    if (!spendCoins(confirming.price)) {
      setConfirming(null);
      return;
    }
    unlockFrame(confirming.id);
    setUnlocked(getUnlockedFrames());
    onCoinsChange(coins - confirming.price);
    selectFrame(confirming.id);
    setSelected(confirming.id);
    setConfirming(null);
  };

  const wins = history.filter((h) => h.result === "win").length;
  const losses = history.filter((h) => h.result === "loss").length;

  return (
    <Shell>
      <ScreenHeader title="Profile" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-6 animate-fade-in">
        <div className="text-center">
          <div
            className="mx-auto grid h-20 w-20 place-items-center rounded-full border-[3px] bg-card"
            style={{ borderColor: activeFrame.borderColor }}
          >
            <User className="h-9 w-9 text-primary" />
          </div>
          {editing ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={16}
                className="w-40 rounded-lg border border-border bg-secondary px-3 py-1.5 text-center text-sm"
                autoFocus
              />
              <button
                onClick={saveName}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setDraftName(name);
                setEditing(true);
              }}
              className="mt-3 flex items-center justify-center gap-1.5 text-lg font-display text-primary"
            >
              {name}
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          {currentTitle && (
            <p className="mt-1 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {currentTitle.name}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {wins} wins · {losses} losses
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Frames</p>
          <div className="grid grid-cols-3 gap-3">
            {FRAMES.map((frame) => {
              const owned = unlocked.includes(frame.id);
              const isSelected = selected === frame.id;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => handleTap(frame)}
                  disabled={!owned && coins < frame.price}
                  className={`rounded-2xl border p-3 text-center transition-transform active:scale-95 ${
                    isSelected
                      ? "border-primary bg-card"
                      : coins < frame.price && !owned
                        ? "border-border bg-secondary/40 opacity-40"
                        : "border-border bg-card"
                  }`}
                >
                  <div
                    className="mx-auto grid h-10 w-10 place-items-center rounded-full border-[3px] bg-secondary"
                    style={{ borderColor: frame.borderColor }}
                  >
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold">{frame.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {owned ? "Owned" : `${frame.price}`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Achievements
          </p>
          <div className="space-y-2">
            {TITLES.map((t) => {
              const done = unlockedTitleIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                    done ? "border-primary/40 bg-primary/10" : "border-border bg-card opacity-60"
                  }`}
                >
                  <span className={done ? "font-semibold text-primary" : "text-muted-foreground"}>
                    {t.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{t.requirement}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Match History
          </p>
          {history.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No matches played yet.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs"
                >
                  <span className={h.result === "win" ? "text-valid font-semibold" : "text-muted-foreground"}>
                    {h.result === "win" ? "Won" : "Lost"} · {h.mode === "bot" ? "vs Bot" : "1v1"}
                  </span>
                  {h.stake ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Coins className="h-3 w-3" />
                      {h.result === "win" ? `+${h.payout}` : `-${h.stake}`}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 px-6 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-primary bg-card p-6 text-center">
            <div
              className="mx-auto mb-3 h-14 w-14 rounded-full border-[3px] bg-secondary"
              style={{ borderColor: confirming.borderColor }}
            />
            <p className="font-display text-lg text-primary">Buy {confirming.name}?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This will cost {confirming.price.toLocaleString()} coins.
            </p>
            <button
              type="button"
              onClick={confirmBuy}
              className="mt-6 h-14 w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground active:scale-95"
            >
              Confirm Purchase
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="mt-3 h-12 w-full rounded-2xl border border-border bg-secondary text-sm font-semibold active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

export function BottomNav({
  active,
  onHome,
  onFriends,
  onEquipment,
  onTrophies,
}: {
  active: "home" | "friends" | "equipment" | "trophies";
  onHome: () => void;
  onFriends: () => void;
  onEquipment: () => void;
  onTrophies: () => void;
}) {
  const tabs = [
    { id: "home" as const, label: "Home", icon: <Dices className="h-5 w-5" />, onClick: onHome },
    { id: "friends" as const, label: "Friends", icon: <Users className="h-5 w-5" />, onClick: onFriends, locked: true },
    { id: "equipment" as const, label: "Equipment", icon: <Palette className="h-5 w-5" />, onClick: onEquipment },
    { id: "trophies" as const, label: "Trophies", icon: <Trophy className="h-5 w-5" />, onClick: onTrophies },
  ];
  return (
    <div className="flex shrink-0 items-center justify-around border-t border-border bg-card px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={tab.onClick}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 ${
            active === tab.id ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <span className="relative">
            {tab.icon}
            {tab.locked && (
              <Lock className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-card text-muted-foreground" />
            )}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wide">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export function EquipmentScreen({
  coins,
  onCoinsChange,
  onBack,
}: {
  coins: number;
  onCoinsChange: (coins: number) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"colors" | "frames">("colors");
  const [unlockedSkins, setUnlockedSkins] = useState<string[]>(getUnlockedSkins());
  const [selectedSkin, setSelectedSkin] = useState(getSelectedSkin());
  const [confirmingSkin, setConfirmingSkin] = useState<(typeof SKINS)[number] | null>(null);
  const [unlockedFrames, setUnlockedFrames] = useState<string[]>(getUnlockedFrames());
  const [selectedFrame, setSelectedFrame] = useState(getSelectedFrame());
  const [confirmingFrame, setConfirmingFrame] = useState<(typeof FRAMES)[number] | null>(null);

  const buySkin = () => {
    if (!confirmingSkin) return;
    if (!spendCoins(confirmingSkin.price)) {
      setConfirmingSkin(null);
      return;
    }
    unlockSkin(confirmingSkin.id);
    setUnlockedSkins(getUnlockedSkins());
    onCoinsChange(coins - confirmingSkin.price);
    selectSkin(confirmingSkin.id);
    setSelectedSkin(confirmingSkin.id);
    setConfirmingSkin(null);
  };

  const buyFrame = () => {
    if (!confirmingFrame) return;
    if (!spendCoins(confirmingFrame.price)) {
      setConfirmingFrame(null);
      return;
    }
    unlockFrame(confirmingFrame.id);
    setUnlockedFrames(getUnlockedFrames());
    onCoinsChange(coins - confirmingFrame.price);
    selectFrame(confirmingFrame.id);
    setSelectedFrame(confirmingFrame.id);
    setConfirmingFrame(null);
  };

  const confirming = confirmingSkin ?? confirmingFrame;

  return (
    <Shell>
      <ScreenHeader title="Equipment" onBack={onBack} />
      <div className="mb-3 flex gap-2 rounded-xl bg-secondary/50 p-1">
        <button
          onClick={() => setTab("colors")}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold ${tab === "colors" ? "bg-card text-primary" : "text-muted-foreground"}`}
        >
          Piece Colors
        </button>
        <button
          onClick={() => setTab("frames")}
          className={`flex-1 rounded-lg py-2 text-xs font-semibold ${tab === "frames" ? "bg-card text-primary" : "text-muted-foreground"}`}
        >
          Frames
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-6 animate-fade-in">
        {tab === "colors" ? (
          <div className="grid grid-cols-2 gap-3">
            {SKINS.map((skin) => {
              const owned = unlockedSkins.includes(skin.id);
              const isSelected = selectedSkin === skin.id;
              const swatch = skin.color || "var(--p1)";
              return (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() =>
                    owned
                      ? (selectSkin(skin.id), setSelectedSkin(skin.id))
                      : setConfirmingSkin(skin)
                  }
                  disabled={!owned && coins < skin.price}
                  className={`rounded-2xl border p-4 text-center transition-transform active:scale-95 ${
                    isSelected ? "border-primary bg-card" : coins < skin.price && !owned ? "border-border bg-secondary/40 opacity-40" : "border-border bg-card"
                  }`}
                >
                  <div className="relative mx-auto grid h-12 w-12 place-items-center">
                    <span className="h-9 w-9 rounded-full border-2" style={{ backgroundColor: swatch, borderColor: skin.glow || "var(--p1-glow)" }} />
                    {isSelected && (
                      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-semibold">{skin.name}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{owned ? (isSelected ? "Selected" : "Owned") : `${skin.price} coins`}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {FRAMES.map((frame) => {
              const owned = unlockedFrames.includes(frame.id);
              const isSelected = selectedFrame === frame.id;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() =>
                    owned
                      ? (selectFrame(frame.id), setSelectedFrame(frame.id))
                      : setConfirmingFrame(frame)
                  }
                  disabled={!owned && coins < frame.price}
                  className={`rounded-2xl border p-3 text-center transition-transform active:scale-95 ${
                    isSelected ? "border-primary bg-card" : coins < frame.price && !owned ? "border-border bg-secondary/40 opacity-40" : "border-border bg-card"
                  }`}
                >
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border-[3px] bg-secondary" style={{ borderColor: frame.borderColor }}>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold">{frame.name}</p>
                  <p className="text-[9px] text-muted-foreground">{owned ? "Owned" : `${frame.price}`}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 px-6 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-primary bg-card p-6 text-center">
            <p className="font-display text-lg text-primary">Buy {confirming.name}?</p>
            <p className="mt-2 text-sm text-muted-foreground">This will cost {confirming.price.toLocaleString()} coins.</p>
            <button type="button" onClick={confirmingSkin ? buySkin : buyFrame} className="mt-6 h-14 w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground active:scale-95">
              Confirm Purchase
            </button>
            <button type="button" onClick={() => { setConfirmingSkin(null); setConfirmingFrame(null); }} className="mt-3 h-12 w-full rounded-2xl border border-border bg-secondary text-sm font-semibold active:scale-95">
              Cancel
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

export function TrophiesScreen({ onBack }: { onBack: () => void }) {
  const unlockedIds = getUnlockedTitles().map((t) => t.id);
  return (
    <Shell>
      <ScreenHeader title="Trophies" onBack={onBack} />
      <div className="flex-1 space-y-2 overflow-y-auto pb-6 animate-fade-in">
        {TITLES.map((t) => {
          const done = unlockedIds.includes(t.id);
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                done ? "border-primary/40 bg-primary/10" : "border-border bg-card opacity-60"
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary">
                <Trophy className={`h-4 w-4 ${done ? "text-primary" : "text-muted-foreground"}`} />
              </span>
              <div className="flex-1">
                <p className={`text-xs font-semibold ${done ? "text-primary" : "text-muted-foreground"}`}>{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.requirement}</p>
              </div>
              {done && <Check className="h-4 w-4 text-primary" />}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

export function OfflineModeScreen({
  onPlayLocal,
  onPlayBot,
  onBack,
}: {
  onPlayLocal: () => void;
  onPlayBot: () => void;
  onBack: () => void;
}) {
  return (
    <Shell>
      <ScreenHeader title="Play Offline" onBack={onBack} />
      <div className="flex flex-1 flex-col justify-center gap-4 pb-6 animate-fade-in">
        <button
          type="button"
          onClick={onPlayLocal}
          className="rounded-2xl border border-primary bg-primary p-4 text-left text-primary-foreground active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-foreground/15">
              <Swords className="h-5 w-5" />
            </span>
            <span className="font-display text-base">Play 1v1</span>
          </div>
          <p className="mt-2 text-xs text-primary-foreground/80">Pass-and-play on this phone with a friend.</p>
        </button>
        <button
          type="button"
          onClick={onPlayBot}
          className="rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <Bot className="h-5 w-5 text-primary" />
            </span>
            <span className="font-display text-base">Play vs Bot</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Challenge the computer, stake coins or gems.</p>
        </button>
      </div>
    </Shell>
  );
}

export function GemsScreen({
  gems,
  onGemsChange,
  onBack,
}: {
  gems: number;
  onGemsChange: (gems: number) => void;
  onBack: () => void;
}) {
  const [watching, setWatching] = useState(false);

  const handleWatchAd = () => {
    setWatching(true);
    showRewardedAd(
      () => {
        rewardGemsForAd();
        onGemsChange(getGems());
      },
      () => setWatching(false),
    );
  };

  return (
    <Shell>
      <ScreenHeader title="Gems" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-6 animate-fade-in">
        <div className="rounded-2xl border border-sky-400 bg-card p-5 text-center">
          <p className="text-xs text-muted-foreground">Your balance</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <Diamond className="h-6 w-6 text-sky-400" />
            <span className="font-display text-3xl text-sky-400">{gems.toLocaleString()}</span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">1 gem = {COIN_AMOUNTS.win * 1} coins · worth {10}x saved value</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <Gift className="h-5 w-5 text-sky-400" />
            </span>
            <div className="flex-1">
              <p className="font-display text-sm">Watch Ad for Gems</p>
              <p className="text-xs text-muted-foreground">Get {COIN_AMOUNTS.adGems} gems per ad</p>
            </div>
          </div>
          <button
            onClick={handleWatchAd}
            disabled={watching}
            className="mt-3 w-full rounded-xl bg-sky-400 py-2 text-sm font-semibold text-background active:scale-[0.98] disabled:opacity-50"
          >
            {watching ? "Loading ad..." : "Watch Ad"}
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="flex-1">
              <p className="font-display text-sm text-muted-foreground">Buy Gems</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function OnlineModeScreen({
  onCreate,
  onJoin,
  onBack,
}: {
  onCreate: () => void;
  onJoin: () => void;
  onBack: () => void;
}) {
  return (
    <Shell>
      <ScreenHeader title="Play Online" onBack={onBack} />
      <div className="flex flex-1 flex-col justify-center gap-4 pb-6 animate-fade-in">
        <button
          type="button"
          onClick={onCreate}
          className="rounded-2xl border border-primary bg-primary p-4 text-left text-primary-foreground active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-foreground/15">
              <Globe className="h-5 w-5" />
            </span>
            <span className="font-display text-base">Create Room</span>
          </div>
          <p className="mt-2 text-xs text-primary-foreground/80">
            Get a room code and share it with a friend.
          </p>
        </button>
        <button
          type="button"
          onClick={onJoin}
          className="rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <Users className="h-5 w-5 text-primary" />
            </span>
            <span className="font-display text-base">Join Room</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Enter the 6-digit code your friend sent you.
          </p>
        </button>
      </div>
    </Shell>
  );
}

export function CreateRoomScreen({
  code,
  rules,
  stake = 0,
  onCancel,
}: {
  code: string;
  rules: RuleSet;
  stake?: number | undefined;
  onCancel: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = `Join my Hourglass Duel match! Room code: ${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* share dismissed */
    }
  };

  return (
    <Shell>
      <ScreenHeader title="Create Room" onBack={onCancel} />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 pb-6 text-center animate-fade-in">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {rules === "elimination" ? "Elimination Mode" : "Race Mode"} ·{" "}
          {stake > 0 ? `${stake.toLocaleString()} Coin Stake` : "Free"} · Room Code
        </p>
        <p className="font-display text-5xl tracking-[0.3em] text-primary">{code}</p>
        <button
          type="button"
          onClick={share}
          className="flex h-12 min-h-[44px] items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-6 text-sm font-semibold text-primary active:scale-95"
        >
          <Share2 className="h-4 w-4" />
          {copied ? "Copied!" : "Share Code"}
        </button>
        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Waiting for your friend to join…
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 h-12 min-h-[44px] w-full max-w-xs rounded-xl border border-destructive/60 bg-destructive/15 text-sm font-semibold active:scale-95"
        >
          Cancel Room
        </button>
      </div>
    </Shell>
  );
}

export function JoinRoomScreen({
  coins,
  onPeek,
  onJoin,
  onBack,
}: {
  coins: number;
  onPeek: (
    code: string,
  ) => Promise<{ rules: RuleSet; stake: number; hostName: string } | "not-found" | "full">;
  onJoin: (code: string) => Promise<"ok" | "not-found" | "full" | "no-coins">;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ rules: RuleSet; stake: number; hostName: string } | null>(null);

  const submit = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    if (!preview) {
      const info = await onPeek(code);
      setBusy(false);
      if (info === "not-found") setError("Room not found");
      else if (info === "full") setError("Room is full");
      else setPreview(info);
      return;
    }
    const result = await onJoin(code);
    setBusy(false);
    if (result === "not-found") setError("Room not found");
    else if (result === "full") setError("Room is full");
    else if (result === "no-coins") setError("Not enough coins for this room's stake");
  };
  const short = !!preview && preview.stake > coins;

  return (
    <Shell>
      <ScreenHeader title="Join Room" onBack={onBack} />
      <div className="flex flex-1 flex-col justify-center gap-4 pb-6 animate-fade-in">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Enter the 6-digit room code
        </p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError(null);
            setPreview(null);
          }}
          placeholder="••••••"
          className="h-16 w-full rounded-2xl border border-border bg-card text-center font-display text-3xl tracking-[0.3em] outline-none focus:border-primary"
        />
        {preview && (
          <div className="rounded-2xl border border-primary/50 bg-card p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {preview.hostName}'s room
            </p>
            <p className="mt-1 font-display text-base">
              {preview.rules === "elimination" ? "Elimination Mode" : "Race Mode"}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary">
              <Coins className="h-4 w-4" />
              {preview.stake > 0
                ? `${preview.stake.toLocaleString()} coin stake · Win ${(preview.stake * 2).toLocaleString()}`
                : "Free match"}
            </p>
            {short && (
              <p className="mt-2 text-sm font-semibold text-destructive">
                You need {preview.stake.toLocaleString()} coins to join (you have {coins.toLocaleString()}).
              </p>
            )}
          </div>
        )}
        {error && <p className="text-center text-sm font-semibold text-destructive">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={code.length !== 6 || busy || short}
          className="h-14 min-h-[44px] w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground active:scale-95 disabled:opacity-40"
        >
          {busy ? "Please wait…" : preview ? "Confirm & Join" : "Find Room"}
        </button>
      </div>
    </Shell>
  );
}

