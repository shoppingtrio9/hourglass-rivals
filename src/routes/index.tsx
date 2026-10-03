    recordLuckyMatchPlayed();
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameScreen, type GameMode } from "@/components/GameScreen";
import {
  HelpScreen,
  HomeScreen,
  LoadingScreen,
  ModeSelectScreen,
  SettingsScreen,
  StakeSelectScreen,
  CoinsScreen,
  GemsScreen,
  EquipmentScreen,
  TrophiesScreen,
  ProfileScreen,
  OfflineModeScreen,
} from "@/components/MenuScreens";
import type { RuleSet } from "@/lib/game";
import { useSettings } from "@/hooks/use-settings";
import { initAds, showBannerAd, hideBannerAd } from "@/lib/ads";
import { StatusBar, Style } from "@capacitor/status-bar";
import { getCoins, getGems, placeStake, placeStakeWithGems, canPlayLuckyMatch, recordLuckyMatchPlayed } from "@/lib/coins";


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

type Screen =
  | "loading"
  | "home"
  | "offline"
  | "modes"
  | "stake"
  | "coins"
  | "gems"
  | "equipment"
  | "trophies"
  | "profile"
  | "settings"
  | "help"
  | "game";

function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [mode, setMode] = useState<GameMode>("local");
  const [rules, setRules] = useState<RuleSet>("race");
  const [gameKey, setGameKey] = useState(0);
  const [coins, setCoins] = useState(0);
  const [gems, setGems] = useState(0);
  const [stake, setStake] = useState<number | undefined>(undefined);
  const [luckyShot, setLuckyShot] = useState(false);
  const [luckyAvailable, setLuckyAvailable] = useState(true);
  const { settings, update } = useSettings();

  useEffect(() => {
    initAds();
    StatusBar.hide().catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    setCoins(getCoins());
    setGems(getGems());
      setLuckyAvailable(canPlayLuckyMatch());
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setScreen("home"), 1600);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (screen === "home") {
      setCoins(getCoins());
      setGems(getGems());
      showBannerAd();
    } else {
      hideBannerAd();
    }
  }, [screen]);

  const pickRules = (r: RuleSet) => {
    setRules(r);
    setLuckyShot(false);
    if (mode === "bot") {
      setScreen("stake");
    } else {
      setStake(undefined);
      setGameKey((k) => k + 1);
      setScreen("game");
    }
  };

  const pickStake = (amount: number) => {
    if (!placeStake(amount)) return;
    setCoins(getCoins());
    setStake(amount);
    setGameKey((k) => k + 1);
    setScreen("game");
  };

  const pickStakeWithGems = (amount: number) => {
    if (!placeStakeWithGems(amount)) return;
    setGems(getGems());
    setStake(amount);
    setGameKey((k) => k + 1);
    setScreen("game");
  };

  const startLuckyShot = () => {
    if (!canPlayLuckyMatch()) return;
    setMode("bot");
    setRules("elimination");
    setStake(undefined);
    setLuckyShot(true);
    setGameKey((k) => k + 1);
    setScreen("game");
  };

  if (screen === "loading") return <LoadingScreen />;
  if (screen === "settings")
    return (
      <SettingsScreen
        settings={settings}
        onChange={update}
        onHelp={() => setScreen("help")}
        onBack={() => setScreen("home")}
      />
    );
  if (screen === "help") return <HelpScreen onBack={() => setScreen("settings")} />;
  if (screen === "coins")
    return (
      <CoinsScreen coins={coins} onCoinsChange={setCoins} onBack={() => setScreen("home")} />
    );
  if (screen === "gems")
    return <GemsScreen gems={gems} onGemsChange={setGems} onBack={() => setScreen("home")} />;
  if (screen === "equipment")
    return (
      <EquipmentScreen coins={coins} onCoinsChange={setCoins} onBack={() => setScreen("home")} />
    );
  if (screen === "trophies") return <TrophiesScreen onBack={() => setScreen("home")} />;
  if (screen === "profile")
    return (
      <ProfileScreen coins={coins} onCoinsChange={setCoins} onBack={() => setScreen("home")} />
    );
  if (screen === "offline")
    return (
      <OfflineModeScreen
        onPlayLocal={() => {
          setMode("local");
          setScreen("modes");
        }}
        onPlayBot={() => {
          setMode("bot");
          setScreen("modes");
        }}
        onBack={() => setScreen("home")}
      />
    );
  if (screen === "modes")
    return (
      <ModeSelectScreen
        heading={mode === "bot" ? "Play vs Bot" : "Play 1v1"}
        onPick={pickRules}
        onBack={() => setScreen("offline")}
      />
    );
  if (screen === "stake")
    return (
      <StakeSelectScreen coins={coins} gems={gems} onPick={pickStake} onPickWithGems={pickStakeWithGems} onBack={() => setScreen("modes")} />
    );
  if (screen === "game")
    return (
      <GameScreen
        key={gameKey}
        mode={mode}
        rules={rules}
        settings={settings}
        stake={stake}
        luckyShot={luckyShot}
        onExit={() => setScreen("home")}
      />
    );

  return (
    <HomeScreen
      onPlayOffline={() => setScreen("offline")}
      onProfile={() => setScreen("profile")}
      onSettings={() => setScreen("settings")}
      onEquipment={() => setScreen("equipment")}
      onTrophies={() => setScreen("trophies")}
      onCoinsClick={() => setScreen("coins")}
      onGemsClick={() => setScreen("gems")}
      onLuckyShot={startLuckyShot}
      luckyAvailable={luckyAvailable}
      coins={coins}
      gems={gems}
    />
  );

}
