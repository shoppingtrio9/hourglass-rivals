import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Dices,
  Globe,
  HelpCircle,
  Lock,
  Music,
  RotateCcw,
  Settings as SettingsIcon,
  Shield,
  Swords,
  Trophy,
  Volume2,
} from "lucide-react";
import {
  emptyProgress,
  readProgress,
  writeProgress,
  type Progress,
  type Settings,
} from "@/hooks/use-settings";
import { PIECES_PER_PLAYER } from "@/lib/game";

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
          <div className="h-full w-1/3 animate-[loading-bar_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
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
  onPlayLocal,
  onPlayBot,
  onSettings,
  onHelp,
}: {
  onPlayLocal: () => void;
  onPlayBot: () => void;
  onSettings: () => void;
  onHelp: () => void;
}) {
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(false), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <Shell>
      <div className="flex flex-1 flex-col justify-center gap-6 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border-2 border-primary bg-card">
            <Dices className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-3 font-display text-2xl tracking-wide text-primary">
            Hourglass Duel
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Roll, split your points, race all {PIECES_PER_PLAYER} pieces home.
          </p>
        </div>

        <div className="space-y-3">
          <MenuButton
            accent
            icon={<Swords className="h-5 w-5" />}
            title="Play 1v1"
            subtitle="Pass-and-play on this phone"
            onClick={onPlayLocal}
          />
          <MenuButton
            locked
            icon={<Globe className="h-5 w-5" />}
            title="Play Online"
            subtitle="Coming soon"
            onClick={() => setToast(true)}
          />
          <MenuButton
            icon={<Bot className="h-5 w-5" />}
            title="Play vs Bot"
            subtitle="Challenging computer opponent"
            onClick={onPlayBot}
          />
          <MenuButton
            icon={<SettingsIcon className="h-5 w-5" />}
            title="Settings"
            subtitle="Music, sound, progress"
            onClick={onSettings}
          />
          <MenuButton
            icon={<HelpCircle className="h-5 w-5" />}
            title="How to Play"
            subtitle="Rules in 60 seconds"
            onClick={onHelp}
          />
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6 animate-fade-in">
          <div className="rounded-full border border-border bg-card px-5 py-3 text-sm">
            Online play is coming soon!
          </div>
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
  onBack,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
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
