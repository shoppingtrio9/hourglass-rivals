import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameScreen, type GameMode } from "@/components/GameScreen";
import {
  HelpScreen,
  HomeScreen,
  LoadingScreen,
  ModeSelectScreen,
  SettingsScreen,
} from "@/components/MenuScreens";
import type { RuleSet } from "@/lib/game";
import { useSettings } from "@/hooks/use-settings";
import { initAds, showBannerAd, hideBannerAd } from "@/lib/ads";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hourglass Duel — 2-Player Dice Board Game" },
      {
        name: "description",
        content:
          "A pass-and-play mobile board game: roll 1-3, split your points across pieces, dodge safe zones and race all 8 pieces home. Play a friend or a smart bot.",
      },
      { property: "og:title", content: "Hourglass Duel — 2-Player Board Game" },
      {
        property: "og:description",
        content:
          "Pass-and-play dice board game on an hourglass grid. Split dice points, capture rivals and get all 8 pieces home — or challenge the bot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Screen = "loading" | "home" | "modes" | "settings" | "help" | "game";

function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [mode, setMode] = useState<GameMode>("local");
  const [rules, setRules] = useState<RuleSet>("race");
  const [gameKey, setGameKey] = useState(0);
  const { settings, update } = useSettings();

  useEffect(() => {
    initAds();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setScreen("home"), 1600);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (screen === "home") {
      showBannerAd();
    } else {
      hideBannerAd();
    }
  }, [screen]);

  const chooseMode = (m: GameMode) => {
    setMode(m);
    setScreen("modes");
  };

  const start = (r: RuleSet) => {
    setRules(r);
    setGameKey((k) => k + 1);
    setScreen("game");
  };

  if (screen === "loading") return <LoadingScreen />;
  if (screen === "settings")
    return (
      <SettingsScreen settings={settings} onChange={update} onBack={() => setScreen("home")} />
    );
  if (screen === "help") return <HelpScreen onBack={() => setScreen("home")} />;
  if (screen === "modes")
    return (
      <ModeSelectScreen
        heading={mode === "bot" ? "Play vs Bot" : "Play 1v1"}
        onPick={start}
        onBack={() => setScreen("home")}
      />
    );
  if (screen === "game")
    return (
      <GameScreen
        key={gameKey}
        mode={mode}
        rules={rules}
        settings={settings}
        onExit={() => setScreen("home")}
      />
    );

  return (
    <HomeScreen
      onPlayLocal={() => chooseMode("local")}
      onPlayBot={() => chooseMode("bot")}
      onSettings={() => setScreen("settings")}
      onHelp={() => setScreen("help")}
    />
  );

}
