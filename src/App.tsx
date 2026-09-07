import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  OfflineDraftManager,
  PickRecord,
  KeeperAssignment,
  PickTrade,
} from "./draftEngine";
import { MASTER_PLAYER_DATABASE, RankedPlayer } from "./playersData";

const DEFAULT_TEAM_NAMES = Array.from(
  { length: 12 },
  (_, i) => `Team ${i + 1}`
);

const STORAGE_KEYS = {
  TEAM_NAMES: "fantasy_draft_team_names",
  KEEPERS: "fantasy_draft_keepers",
  TRADED_PICKS: "fantasy_draft_traded_picks",
  DRAFT_ACTIVE: "fantasy_draft_is_active",
  PICK_HISTORY: "fantasy_draft_pick_history",
  USER_TEAM_INDEX: "fantasy_draft_user_team_idx",
  CUSTOM_PLAYERS: "fantasy_draft_custom_players",
  TARGET_LIST: "fantasy_draft_target_list",
};

const POS_COLORS: Record<
  string,
  { badge: string; border: string; glow: string }
> = {
  QB: {
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    border: "border-l-rose-500",
    glow: "text-rose-400",
  },
  RB: {
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    border: "border-l-emerald-500",
    glow: "text-emerald-400",
  },
  WR: {
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    border: "border-l-sky-500",
    glow: "text-sky-400",
  },
  TE: {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    border: "border-l-amber-500",
    glow: "text-amber-400",
  },
  K: {
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    border: "border-l-purple-500",
    glow: "text-purple-400",
  },
  DST: {
    badge: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    border: "border-l-slate-400",
    glow: "text-slate-400",
  },
};

export default function App() {
  const [playersList, setPlayersList] = useState<RankedPlayer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_PLAYERS);
    return saved ? JSON.parse(saved) : MASTER_PLAYER_DATABASE;
  });

  const [teamNames, setTeamNames] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEAM_NAMES);
    return saved ? JSON.parse(saved) : DEFAULT_TEAM_NAMES;
  });

  const [userTeamIndex, setUserTeamIndex] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_TEAM_INDEX);
    return saved ? JSON.parse(saved) : 0;
  });

  const [keepers, setKeepers] = useState<KeeperAssignment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.KEEPERS);
    return saved ? JSON.parse(saved) : [];
  });

  const [tradedPicks, setTradedPicks] = useState<PickTrade[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRADED_PICKS);
    return saved ? JSON.parse(saved) : [];
  });

  const [isDraftActive, setIsDraftActive] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DRAFT_ACTIVE);
    return saved ? JSON.parse(saved) : false;
  });

  const [targetPlayerIds, setTargetPlayerIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TARGET_LIST);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<
    "draft" | "teams" | "scorecard" | "editor"
  >("draft");

  const [selectedTeam, setSelectedTeam] = useState<number>(0);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const [tradeRound, setTradeRound] = useState<number>(1);
  const [tradeFromTeam, setTradeFromTeam] = useState<number>(0);
  const [tradeToTeam, setTradeToTeam] = useState<number>(1);

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPos, setNewPlayerPos] = useState<
    "QB" | "RB" | "WR" | "TE" | "K" | "DST"
  >("WR");
  const [newPlayerTeam, setNewPlayerTeam] = useState("");
  const [newPlayerBye, setNewPlayerBye] = useState<number>(6);
  const [newPlayerPoints, setNewPlayerPoints] = useState<number>(180);
  const [newPlayerAdp, setNewPlayerAdp] = useState<number>(100);
  const [newPlayerInjuryStatus, setNewPlayerInjuryStatus] = useState<
    "Q" | "D" | "O" | "IR" | "PUP" | "SUSP" | ""
  >("");
  const [newPlayerSos, setNewPlayerSos] = useState<number>(3);

  const [editorSearch, setEditorSearch] = useState("");
  const [manager, setManager] = useState<OfflineDraftManager | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [pickHistory, setPickHistory] = useState<PickRecord[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const draftMgr = new OfflineDraftManager(
      12,
      18,
      playersList,
      keepers,
      tradedPicks
    );

    const savedPicks = localStorage.getItem(STORAGE_KEYS.PICK_HISTORY);
    if (savedPicks) {
      try {
        const parsedPicks: PickRecord[] = JSON.parse(savedPicks);
        parsedPicks.forEach((p) => {
          draftMgr.makePick(p.player.id);
        });
      } catch (e) {
        console.error("Failed to restore previous picks", e);
      }
    }

    setManager(draftMgr);
    setPickHistory([...draftMgr.history]);
  }, [playersList, keepers, tradedPicks]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.CUSTOM_PLAYERS,
      JSON.stringify(playersList)
    );
  }, [playersList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEAM_NAMES, JSON.stringify(teamNames));
  }, [teamNames]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.USER_TEAM_INDEX,
      JSON.stringify(userTeamIndex)
    );
  }, [userTeamIndex]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.KEEPERS, JSON.stringify(keepers));
  }, [keepers]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.TRADED_PICKS,
      JSON.stringify(tradedPicks)
    );
  }, [tradedPicks]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.DRAFT_ACTIVE,
      JSON.stringify(isDraftActive)
    );
  }, [isDraftActive]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.TARGET_LIST,
      JSON.stringify(targetPlayerIds)
    );
  }, [targetPlayerIds]);

  useEffect(() => {
    if (isDraftActive) {
      localStorage.setItem(
        STORAGE_KEYS.PICK_HISTORY,
        JSON.stringify(pickHistory)
      );
    }
  }, [pickHistory, isDraftActive]);

  const toggleTargetPlayer = (id: string) => {
    setTargetPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleTeamNameChange = (index: number, newName: string) => {
    const updated = [...teamNames];
    updated[index] = newName;
    setTeamNames(updated);
  };

  const startDraft = () => {
    setIsDraftActive(true);
    setActiveTab("draft");
  };

  const resetEntireDraft = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset the draft? This wipes all saved picks and rosters."
    );
    if (!confirmReset) return;

    localStorage.removeItem(STORAGE_KEYS.TEAM_NAMES);
    localStorage.removeItem(STORAGE_KEYS.KEEPERS);
    localStorage.removeItem(STORAGE_KEYS.TRADED_PICKS);
    localStorage.removeItem(STORAGE_KEYS.DRAFT_ACTIVE);
    localStorage.removeItem(STORAGE_KEYS.PICK_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.USER_TEAM_INDEX);
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_PLAYERS);
    localStorage.removeItem(STORAGE_KEYS.TARGET_LIST);

    setPlayersList(MASTER_PLAYER_DATABASE);
    setTeamNames(DEFAULT_TEAM_NAMES);
    setUserTeamIndex(0);
    setKeepers([]);
    setTradedPicks([]);
    setPickHistory([]);
    setTargetPlayerIds([]);
    setIsDraftActive(false);

    const freshMgr = new OfflineDraftManager(
      12,
      18,
      MASTER_PLAYER_DATABASE,
      [],
      []
    );
    setManager(freshMgr);
    setActiveTab("draft");
  };

  const getNaturalPickNumber = (round: number, teamIdx: number) => {
    const isEvenRound = round % 2 === 0;
    const slot = isEvenRound ? 12 - teamIdx : teamIdx + 1;
    return (round - 1) * 12 + slot;
  };

  const handleAddTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (tradeFromTeam === tradeToTeam) {
      alert("A team cannot trade a pick to itself.");
      return;
    }

    const overallPick = getNaturalPickNumber(tradeRound, tradeFromTeam);
    const existing = tradedPicks.filter((t) => t.overallPick !== overallPick);

    setTradedPicks([
      ...existing,
      {
        overallPick,
        originalTeamIndex: tradeFromTeam,
        newTeamIndex: tradeToTeam,
      },
    ]);
  };

  const handleRemoveTrade = (overallPick: number) => {
    setTradedPicks(tradedPicks.filter((t) => t.overallPick !== overallPick));
  };

  const currentPick = manager ? manager.currentOverallPick : 1;
  const currentTeamIndex = manager ? manager.getCurrentTeamIndex() : 0;
  const currentRound = manager
    ? Math.ceil(currentPick / manager.totalTeams)
    : 1;
  const nextKeeper = manager?.scheduledKeepers.get(currentPick);

  const nextUserPick = useMemo(() => {
    if (!manager) return null;
    return manager.getNextPickForTeam(userTeamIndex, currentPick);
  }, [manager, userTeamIndex, currentPick]);

  const myRoster = useMemo(() => {
    return pickHistory
      .filter((p) => p.teamIndex === userTeamIndex)
      .map((p) => p.player);
  }, [pickHistory, userTeamIndex]);

  const slottedLineup = useMemo(() => {
    const qbs = myRoster.filter((p) => p.pos === "QB");
    const rbs = myRoster.filter((p) => p.pos === "RB");
    const wrs = myRoster.filter((p) => p.pos === "WR");
    const tes = myRoster.filter((p) => p.pos === "TE");
    const ks = myRoster.filter((p) => p.pos === "K");
    const dsts = myRoster.filter((p) => p.pos === "DST");

    const starterQB = qbs[0] || null;
    const starterRB1 = rbs[0] || null;
    const starterRB2 = rbs[1] || null;
    const starterWR1 = wrs[0] || null;
    const starterWR2 = wrs[1] || null;
    const starterTE = tes[0] || null;

    const remainingFlex = [
      ...rbs.slice(2),
      ...wrs.slice(2),
      ...tes.slice(1),
    ].sort((a, b) => b.projectedPoints - a.projectedPoints);

    const starterFlex = remainingFlex[0] || null;
    const starterK = ks[0] || null;
    const starterDST = dsts[0] || null;

    return [
      { label: "QB", player: starterQB },
      { label: "WR", player: starterWR1 },
      { label: "WR", player: starterWR2 },
      { label: "RB", player: starterRB1 },
      { label: "RB", player: starterRB2 },
      { label: "TE", player: starterTE },
      { label: "W/R/T", player: starterFlex },
      { label: "K", player: starterK },
      { label: "DEF", player: starterDST },
    ];
  }, [myRoster]);

  const teamRosters = useMemo(() => {
    const map: Record<number, PickRecord[]> = {};
    for (let i = 0; i < 12; i++) {
      map[i] = [];
    }
    pickHistory.forEach((pick) => {
      if (map[pick.teamIndex]) {
        map[pick.teamIndex].push(pick);
      }
    });
    return map;
  }, [pickHistory]);

  const upcomingInterveningTeams = useMemo(() => {
    if (!manager || !nextUserPick) return [];
    const teams: number[] = [];
    for (let p = currentPick + 1; p < nextUserPick; p++) {
      const t = manager.getTeamAtPick(p);
      if (t !== userTeamIndex && !teams.includes(t)) {
        teams.push(t);
      }
    }
    return teams;
  }, [manager, currentPick, nextUserPick, userTeamIndex]);

  const opponentRunAlerts = useMemo(() => {
    if (upcomingInterveningTeams.length === 0) return [];
    const neededCounts: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };

    upcomingInterveningTeams.forEach((tIdx) => {
      const picks = teamRosters[tIdx] || [];
      const posCounts: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
      picks.forEach((p) => {
        if (posCounts[p.player.pos] !== undefined) posCounts[p.player.pos]++;
      });

      if (posCounts.QB < 1) neededCounts.QB++;
      if (posCounts.TE < 1) neededCounts.TE++;
      if (posCounts.RB < 2) neededCounts.RB++;
      if (posCounts.WR < 2) neededCounts.WR++;
    });

    const alerts: { pos: string; teamsCount: number }[] = [];
    ["QB", "TE", "RB", "WR"].forEach((pos) => {
      if (neededCounts[pos] >= 3) {
        alerts.push({ pos, teamsCount: neededCounts[pos] });
      }
    });

    return alerts;
  }, [upcomingInterveningTeams, teamRosters]);

  const evaluatedAvailable = useMemo(() => {
    if (!manager) return [];
    return manager.getRankedAvailable(userTeamIndex, myRoster, targetPlayerIds);
  }, [manager, pickHistory, userTeamIndex, myRoster, targetPlayerIds]);

  const availableRanked = useMemo(() => {
    if (positionFilter === "TARGETS") {
      return evaluatedAvailable.filter((p) => targetPlayerIds.includes(p.id));
    }
    if (positionFilter === "ALL") return evaluatedAvailable;
    return evaluatedAvailable.filter((p) => p.pos === positionFilter);
  }, [evaluatedAvailable, positionFilter, targetPlayerIds]);

  const activeTargetPlayers = useMemo(() => {
    return evaluatedAvailable.filter((p) => targetPlayerIds.includes(p.id));
  }, [evaluatedAvailable, targetPlayerIds]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !manager) return [];
    return evaluatedAvailable
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 6);
  }, [searchQuery, evaluatedAvailable, manager]);

  const draftRecommendations = useMemo(() => {
    if (evaluatedAvailable.length === 0) return null;

    const skillPool =
      currentRound < 14
        ? evaluatedAvailable.filter((p) => p.pos !== "K" && p.pos !== "DST")
        : evaluatedAvailable;

    const sortedByDynamic = [...skillPool].sort(
      (a, b) => b.dynamicScore - a.dynamicScore
    );
    const optimal = sortedByDynamic[0] || skillPool[0];

    const sortedBySlip = [...skillPool].sort((a, b) => b.valueGap - a.valueGap);
    const bestValue = sortedBySlip[0] || skillPool[0];

    const tierOrSurvivalRisk = skillPool.find(
      (p) => p.isLastInTier || p.survivalProb < 20
    );

    return {
      optimal,
      bestValue,
      tierOrSurvivalRisk,
    };
  }, [evaluatedAvailable, currentRound]);

  const leagueScorecard = useMemo(() => {
    return teamNames
      .map((name, tIndex) => {
        const picks = teamRosters[tIndex] || [];
        const totalPoints = picks.reduce(
          (sum, p) => sum + p.player.projectedPoints,
          0
        );

        const steals = picks
          .map((p) => ({
            player: p.player,
            value: Number((p.overallPick - (p.player as any).adp).toFixed(1)),
          }))
          .sort((a, b) => b.value - a.value);

        const reaches = picks
          .map((p) => ({
            player: p.player,
            value: Number(((p.player as any).adp - p.overallPick).toFixed(1)),
          }))
          .sort((a, b) => b.value - a.value);

        let grade = "B";
        if (totalPoints > 2800) grade = "A+";
        else if (totalPoints > 2650) grade = "A";
        else if (totalPoints > 2500) grade = "B+";
        else if (totalPoints > 2350) grade = "B";
        else if (totalPoints > 2200) grade = "C+";
        else grade = "C";

        return {
          teamIndex: tIndex,
          teamName: name,
          picksCount: picks.length,
          totalPoints,
          grade,
          bestSteal: steals[0] && steals[0].value > 2 ? steals[0] : null,
          biggestReach: reaches[0] && reaches[0].value > 2 ? reaches[0] : null,
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [teamNames, teamRosters]);

  const filteredEditorPlayers = useMemo(() => {
    if (!editorSearch.trim()) return playersList.slice(0, 300);
    return playersList
      .filter(
        (p) =>
          p.name.toLowerCase().includes(editorSearch.toLowerCase()) ||
          p.team.toLowerCase().includes(editorSearch.toLowerCase())
      )
      .slice(0, 300);
  }, [playersList, editorSearch]);

  const handleDraft = (playerId: string) => {
    if (!manager) return;
    try {
      if (!isDraftActive) {
        setIsDraftActive(true);
      }
      manager.makePick(playerId);
      setPickHistory([...manager.history]);
      setSearchQuery("");
      if (searchInputRef.current) searchInputRef.current.focus();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleConfirmKeeper = () => {
    if (!nextKeeper) return;
    handleDraft(nextKeeper.player.id);
  };

  const handleUndo = () => {
    if (!manager) return;
    manager.undoLastPick();
    setPickHistory([...manager.history]);
  };

  const handleAddKeeper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) {
      alert("Please select a player to keep.");
      return;
    }
    const filtered = keepers.filter((k) => k.teamIndex !== selectedTeam);
    setKeepers([
      ...filtered,
      {
        teamIndex: selectedTeam,
        round: selectedRound,
        playerId: selectedPlayerId,
      },
    ]);
    setSelectedPlayerId("");
  };

  const handleRemoveKeeper = (teamIndex: number) => {
    setKeepers(keepers.filter((k) => k.teamIndex !== teamIndex));
  };

  const handleAddCustomPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      alert("Enter player name.");
      return;
    }
    const newId = `custom_${Date.now()}`;
    const newPlayer: RankedPlayer = {
      id: newId,
      name: newPlayerName.trim(),
      pos: newPlayerPos,
      team: newPlayerTeam.toUpperCase().trim() || "FA",
      bye: Number(newPlayerBye),
      projectedPoints: Number(newPlayerPoints),
      consensusRank: playersList.length + 1,
      adp: Number(newPlayerAdp),
      injuryStatus: newPlayerInjuryStatus || undefined,
      sos: Number(newPlayerSos),
      tier: 15,
    };
    setPlayersList([...playersList, newPlayer]);
    setNewPlayerName("");
    setNewPlayerTeam("");
    alert(`Added ${newPlayer.name} to player pool.`);
  };

  const handleUpdatePlayer = (
    id: string,
    field: keyof RankedPlayer,
    val: any
  ) => {
    const updated = playersList.map((p) => {
      if (p.id === id) {
        return { ...p, [field]: val };
      }
      return p;
    });
    setPlayersList(updated);
  };

  const handleDeletePlayer = (id: string) => {
    if (window.confirm("Delete this player from the database?")) {
      setPlayersList(playersList.filter((p) => p.id !== id));
      setKeepers(keepers.filter((k) => k.playerId !== id));
      setTargetPlayerIds(targetPlayerIds.filter((tId) => tId !== id));
    }
  };

  const assignedPlayerIds = useMemo(
    () => new Set(keepers.map((k) => k.playerId)),
    [keepers]
  );
  const currentTeamName = teamNames[currentTeamIndex];
  const isMyTurn = currentTeamIndex === userTeamIndex;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-6 antialiased selection:bg-cyan-500 selection:text-black">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl text-black shadow-lg shadow-cyan-500/20">
              FD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Draft Engine
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  12 Team Snake · PPR
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isDraftActive ? (
                  <>
                    Round{" "}
                    <span className="text-white font-semibold">
                      {currentRound}
                    </span>{" "}
                    of 18 · Overall Pick{" "}
                    <span className="text-white font-semibold">
                      #{currentPick}
                    </span>{" "}
                    · Next Turn:{" "}
                    <span className="text-cyan-400 font-semibold">
                      {nextUserPick
                        ? `Pick #${nextUserPick}`
                        : "Draft Complete"}
                    </span>
                  </>
                ) : (
                  "Offline Draft Suite · Pre-Draft Configuration"
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 flex">
              <button
                onClick={() => setActiveTab("draft")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "draft"
                    ? "bg-cyan-500 text-black shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Draft Board
              </button>
              <button
                onClick={() => setActiveTab("teams")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "teams"
                    ? "bg-cyan-500 text-black shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Team Rosters
              </button>
              <button
                onClick={() => setActiveTab("scorecard")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "scorecard"
                    ? "bg-cyan-500 text-black shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Grades
              </button>
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "editor"
                    ? "bg-cyan-500 text-black shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Settings
              </button>
            </nav>

            {!isDraftActive ? (
              <button
                onClick={startDraft}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition active:scale-95"
              >
                Launch Draft
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={pickHistory.length === 0}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-xs font-semibold text-slate-300 rounded-lg border border-slate-700 transition"
                >
                  Undo
                </button>
                <button
                  onClick={resetEntireDraft}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg transition"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </header>

        {isDraftActive && (
          <div
            className={`rounded-2xl p-4 border transition-all shadow-xl flex flex-wrap items-center justify-between gap-4 ${
              isMyTurn
                ? "bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/70 border-cyan-500/50 shadow-cyan-500/10"
                : "bg-slate-900/60 border-slate-800"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-3 h-3 rounded-full ${
                  isMyTurn ? "bg-cyan-400 animate-ping" : "bg-slate-500"
                }`}
              />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  {isMyTurn ? "YOUR PICK IS LIVE" : "Currently Drafting"}
                </span>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  {currentTeamName}
                  {isMyTurn && (
                    <span className="text-xs font-semibold bg-cyan-500 text-black px-2 py-0.5 rounded-full">
                      YOUR TEAM
                    </span>
                  )}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Snake Slot
                </span>
                <p className="text-sm font-bold text-white">
                  Pick #{currentPick}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Round Progress
                </span>
                <p className="text-sm font-bold text-cyan-400">
                  Round {currentRound} of 18
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "draft" && (
          <>
            {opponentRunAlerts.length > 0 && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3.5 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-bold text-rose-300">
                    Positional Run Warning:
                  </span>
                  <span className="text-xs text-rose-200/80">
                    {opponentRunAlerts
                      .map(
                        (a) =>
                          `${a.teamsCount} teams picking before your turn still need a starting ${a.pos}`
                      )
                      .join(" · ")}
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                  Run Risk
                </span>
              </div>
            )}

            {nextKeeper && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                    Reserved Keeper Pick
                  </span>
                  <p className="text-sm text-slate-200">
                    Slot assigned to{" "}
                    <strong className="text-white">
                      {teamNames[nextKeeper.teamIndex]}
                    </strong>
                    : {nextKeeper.player.name} ({nextKeeper.player.pos})
                  </p>
                </div>
                <button
                  onClick={handleConfirmKeeper}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition shadow-md"
                >
                  Confirm Keeper
                </button>
              </div>
            )}

            {draftRecommendations && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        Top Strategic Fit
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        Score: {draftRecommendations.optimal.dynamicScore}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          toggleTargetPlayer(draftRecommendations.optimal.id)
                        }
                        className={`text-base transition ${
                          targetPlayerIds.includes(
                            draftRecommendations.optimal.id
                          )
                            ? "text-amber-400"
                            : "text-slate-600 hover:text-amber-300"
                        }`}
                      >
                        {targetPlayerIds.includes(
                          draftRecommendations.optimal.id
                        )
                          ? "★"
                          : "☆"}
                      </button>
                      <h3 className="text-lg font-black text-white truncate">
                        {draftRecommendations.optimal.name}
                      </h3>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          POS_COLORS[draftRecommendations.optimal.pos]?.badge ||
                          "bg-slate-800"
                        }`}
                      >
                        {draftRecommendations.optimal.pos}
                      </span>
                    </div>

                    <ul className="text-xs text-slate-300 space-y-1">
                      {draftRecommendations.optimal.intelReasons
                        .slice(0, 2)
                        .map((r, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-1.5 text-slate-300"
                          >
                            <span className="text-cyan-400 font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                    </ul>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      +{draftRecommendations.optimal.vorp} VORP
                    </span>
                    <button
                      onClick={() =>
                        handleDraft(draftRecommendations.optimal.id)
                      }
                      disabled={!!nextKeeper}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-30 text-black font-extrabold text-xs rounded-xl shadow-md transition"
                    >
                      Draft Fit
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Top Market Slip
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        +{draftRecommendations.bestValue.valueGap} Picks Early
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          toggleTargetPlayer(draftRecommendations.bestValue.id)
                        }
                        className={`text-base transition ${
                          targetPlayerIds.includes(
                            draftRecommendations.bestValue.id
                          )
                            ? "text-amber-400"
                            : "text-slate-600 hover:text-amber-300"
                        }`}
                      >
                        {targetPlayerIds.includes(
                          draftRecommendations.bestValue.id
                        )
                          ? "★"
                          : "☆"}
                      </button>
                      <h3 className="text-lg font-black text-white truncate">
                        {draftRecommendations.bestValue.name}
                      </h3>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          POS_COLORS[draftRecommendations.bestValue.pos]
                            ?.badge || "bg-slate-800"
                        }`}
                      >
                        {draftRecommendations.bestValue.pos}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      Sliding past ADP {draftRecommendations.bestValue.adp} vs
                      Current Pick #{currentPick}. Premium market value.
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ADP {draftRecommendations.bestValue.adp}
                    </span>
                    <button
                      onClick={() =>
                        handleDraft(draftRecommendations.bestValue.id)
                      }
                      disabled={!!nextKeeper}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-black font-extrabold text-xs rounded-xl shadow-md transition"
                    >
                      Draft Value
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Tier Scarcity Alert
                      </span>
                      <span className="text-[10px] font-mono font-bold text-rose-400">
                        {draftRecommendations.tierOrSurvivalRisk?.survivalProb}%
                        Survival
                      </span>
                    </div>

                    {draftRecommendations.tierOrSurvivalRisk ? (
                      <>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              toggleTargetPlayer(
                                draftRecommendations.tierOrSurvivalRisk!.id
                              )
                            }
                            className={`text-base transition ${
                              targetPlayerIds.includes(
                                draftRecommendations.tierOrSurvivalRisk.id
                              )
                                ? "text-amber-400"
                                : "text-slate-600 hover:text-amber-300"
                            }`}
                          >
                            {targetPlayerIds.includes(
                              draftRecommendations.tierOrSurvivalRisk.id
                            )
                              ? "★"
                              : "☆"}
                          </button>
                          <h3 className="text-lg font-black text-white truncate">
                            {draftRecommendations.tierOrSurvivalRisk.name}
                          </h3>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              POS_COLORS[
                                draftRecommendations.tierOrSurvivalRisk.pos
                              ]?.badge || "bg-slate-800"
                            }`}
                          >
                            {draftRecommendations.tierOrSurvivalRisk.pos}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300">
                          {draftRecommendations.tierOrSurvivalRisk.isLastInTier
                            ? `Last available ${draftRecommendations.tierOrSurvivalRisk.pos} in Tier ${draftRecommendations.tierOrSurvivalRisk.tier}. Dropoff is steep.`
                            : `High likelihood of being selected before your pick #${nextUserPick}.`}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">
                        No immediate tier cliffs detected at this pick.
                      </p>
                    )}
                  </div>

                  {draftRecommendations.tierOrSurvivalRisk && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        Tier {draftRecommendations.tierOrSurvivalRisk.tier}
                      </span>
                      <button
                        onClick={() =>
                          handleDraft(
                            draftRecommendations.tierOrSurvivalRisk!.id
                          )
                        }
                        disabled={!!nextKeeper}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black font-extrabold text-xs rounded-xl shadow-md transition"
                      >
                        Lock Tier
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[240px]">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search player name or team..."
                      disabled={!!nextKeeper}
                      className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 shadow-inner"
                      autoFocus
                    />

                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30 divide-y divide-slate-800/60">
                        {searchResults.map((p) => (
                          <div
                            key={p.id}
                            className="flex justify-between items-center p-3 hover:bg-slate-800/70 transition"
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTargetPlayer(p.id);
                                }}
                                className={`text-base leading-none transition ${
                                  targetPlayerIds.includes(p.id)
                                    ? "text-amber-400"
                                    : "text-slate-600 hover:text-amber-300"
                                }`}
                              >
                                {targetPlayerIds.includes(p.id) ? "★" : "☆"}
                              </button>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  POS_COLORS[p.pos]?.badge || "bg-slate-800"
                                }`}
                              >
                                {p.pos}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">
                                  {p.name}
                                </span>
                                {p.injuryStatus && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${
                                      p.injuryStatus === "IR" ||
                                      p.injuryStatus === "O" ||
                                      p.injuryStatus === "PUP"
                                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                    }`}
                                  >
                                    {p.injuryStatus}
                                  </span>
                                )}
                                <span className="text-xs text-slate-400 ml-1">
                                  {p.team} · Bye {p.bye}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDraft(p.id)}
                              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 px-2 py-1 bg-slate-800/60 rounded"
                            >
                              Draft
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                    {["ALL", "TARGETS", "QB", "RB", "WR", "TE", "K", "DST"].map(
                      (pos) => (
                        <button
                          key={pos}
                          onClick={() => setPositionFilter(pos)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            positionFilter === pos
                              ? "bg-cyan-500 text-black shadow-sm"
                              : pos === "TARGETS"
                              ? targetPlayerIds.length > 0
                                ? "text-amber-300 hover:text-white"
                                : "text-slate-500 hover:text-slate-300"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {pos === "TARGETS"
                            ? `★ Targets (${targetPlayerIds.length})`
                            : pos}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      Available Board{" "}
                      <span className="text-slate-500">
                        ({availableRanked.length} Players Available)
                      </span>
                    </h2>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Ranked by Replacement Value (VORP)
                    </span>
                  </div>

                  <div className="max-h-[620px] overflow-y-auto space-y-2 pr-1">
                    {availableRanked.slice(0, 300).map((player, idx) => {
                      const isTarget = targetPlayerIds.includes(player.id);
                      const isValue = player.valueGap >= 3;
                      const isSevereCliff = player.nextPickDropoff >= 14;

                      return (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-3 rounded-xl transition ${
                            isTarget
                              ? "bg-amber-950/20 border border-amber-500/50 shadow-sm"
                              : "bg-slate-950/60 border border-slate-800/80 hover:border-slate-700"
                          } ${POS_COLORS[player.pos]?.border} border-l-4`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={() => toggleTargetPlayer(player.id)}
                              className={`text-base leading-none transition ${
                                isTarget
                                  ? "text-amber-400"
                                  : "text-slate-600 hover:text-amber-300"
                              }`}
                              title={isTarget ? "Remove target" : "Add target"}
                            >
                              {isTarget ? "★" : "☆"}
                            </button>
                            <span className="font-mono text-xs font-bold text-slate-500 w-5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-white text-sm leading-none">
                                  {player.name}
                                </span>

                                {player.injuryStatus && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${
                                      player.injuryStatus === "IR" ||
                                      player.injuryStatus === "O" ||
                                      player.injuryStatus === "PUP"
                                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                    }`}
                                    title={
                                      player.injuryDetails ||
                                      player.injuryStatus
                                    }
                                  >
                                    {player.injuryStatus}
                                  </span>
                                )}

                                {player.isLastInTier &&
                                  player.tier &&
                                  player.tier <= 6 && (
                                    <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold rounded">
                                      LAST IN TIER {player.tier}
                                    </span>
                                  )}

                                {isValue && (
                                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold rounded">
                                    +{player.valueGap} SLIP
                                  </span>
                                )}

                                {isSevereCliff && (
                                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold rounded">
                                    CLIFF (-{player.nextPickDropoff} PTS)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                <span
                                  className={`font-bold ${
                                    POS_COLORS[player.pos]?.glow
                                  }`}
                                >
                                  {player.pos}
                                </span>
                                <span>
                                  · {player.team} · Bye {player.bye} · Consensus
                                  #{player.consensusRank}
                                  {player.tier && ` · Tier ${player.tier}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                {player.sos && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                    SOS: {"★".repeat(player.sos)}
                                    {"☆".repeat(5 - player.sos)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 shrink-0">
                            {nextUserPick && (
                              <div className="text-right">
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 block">
                                  Survival
                                </span>
                                <span
                                  className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                                    player.survivalProb > 60
                                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                      : player.survivalProb > 25
                                      ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                      : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                  }`}
                                >
                                  {player.survivalProb}%
                                </span>
                              </div>
                            )}

                            {player.vbd !== undefined && player.vbd > 0 && (
                              <div className="text-right hidden sm:block">
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 block">
                                  VBD
                                </span>
                                <span className="font-mono text-xs font-bold text-amber-400">
                                  +{player.vbd}
                                </span>
                              </div>
                            )}

                            {player.vols !== undefined && player.vols > 0 && (
                              <div className="text-right hidden md:block">
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 block">
                                  VOLS
                                </span>
                                <span className="font-mono text-xs font-bold text-cyan-400">
                                  +{player.vols}
                                </span>
                              </div>
                            )}

                            <div className="text-right">
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 block">
                                ADP
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-300">
                                {(player as any).adp}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 block">
                                VORP
                              </span>
                              <span className="font-mono text-xs font-bold text-emerald-400">
                                +{player.vorp}
                              </span>
                            </div>

                            <button
                              onClick={() => handleDraft(player.id)}
                              disabled={!!nextKeeper}
                              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-black font-extrabold rounded-lg text-xs transition shadow-sm"
                            >
                              Draft
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span>★</span> Target Queue
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30">
                      {activeTargetPlayers.length} Active
                    </span>
                  </div>

                  {activeTargetPlayers.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center italic">
                      Click the star icon (☆) next to any player to pin them to
                      your live targets queue.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                      {activeTargetPlayers.map((tp) => (
                        <div
                          key={tp.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-amber-500/20 text-xs hover:border-amber-500/40 transition"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <button
                              onClick={() => toggleTargetPlayer(tp.id)}
                              className="text-amber-400 hover:text-slate-400"
                              title="Unpin Target"
                            >
                              ★
                            </button>
                            <span
                              className={`text-[9px] font-bold px-1 rounded ${
                                POS_COLORS[tp.pos]?.badge || "bg-slate-800"
                              }`}
                            >
                              {tp.pos}
                            </span>
                            <span className="font-semibold text-slate-200 truncate">
                              {tp.name}
                            </span>
                            {tp.injuryStatus && (
                              <span className="text-[8px] font-extrabold px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                {tp.injuryStatus}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-[11px] text-slate-400">
                              ADP {(tp as any).adp}
                            </span>
                            <button
                              onClick={() => handleDraft(tp.id)}
                              className="px-2 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[10px] rounded"
                            >
                              Draft
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      {teamNames[userTeamIndex]} Lineup
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {myRoster.length} / 18
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {slottedLineup.map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                      >
                        <span className="font-mono font-bold text-slate-400 w-12">
                          {slot.label}
                        </span>
                        {slot.player ? (
                          <span className="font-medium text-white truncate text-right">
                            {slot.player.name}{" "}
                            <span className="text-[10px] text-slate-400">
                              ({slot.player.team})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">Open</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                    <span>Bench Slots:</span>
                    <span className="font-bold text-white">
                      {Math.max(0, myRoster.length - 9)} / 9 Filled
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl h-[340px] flex flex-col">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Recent Selections
                  </h3>
                  <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
                    {pickHistory.length === 0 ? (
                      <p className="text-xs text-slate-500 py-10 text-center italic">
                        Waiting for initial pick...
                      </p>
                    ) : (
                      [...pickHistory].reverse().map((pick) => (
                        <div
                          key={pick.overallPick}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[10px] font-bold text-slate-500">
                              {pick.round}.{((pick.overallPick - 1) % 12) + 1}
                            </span>
                            <span className="font-semibold text-slate-200 truncate">
                              {pick.player.name}
                            </span>
                            <span
                              className={`text-[9px] px-1 rounded font-bold ${
                                POS_COLORS[pick.player.pos]?.badge ||
                                "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {pick.player.pos}
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-medium shrink-0 ml-2 ${
                              pick.teamIndex === userTeamIndex
                                ? "text-cyan-400 font-bold"
                                : "text-slate-400"
                            }`}
                          >
                            {teamNames[pick.teamIndex]}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "teams" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Full League Roster Board
                </h2>
                <p className="text-xs text-slate-400">
                  12 Teams · 18 Rounds · Arranged in Draft Order
                </p>
              </div>
              <button
                onClick={() => setActiveTab("draft")}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg transition"
              >
                Back to Board
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {teamNames.map((name, tIndex) => {
                const picks = teamRosters[tIndex] || [];
                const isUser = tIndex === userTeamIndex;

                return (
                  <div
                    key={tIndex}
                    className={`rounded-xl border p-4 bg-slate-950/60 flex flex-col justify-between ${
                      isUser
                        ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                        : "border-slate-800"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                        <div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            Slot #{tIndex + 1} {isUser && "· YOU"}
                          </span>
                          <h4 className="font-bold text-white text-sm truncate">
                            {name}
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {picks.length}/18
                        </span>
                      </div>

                      {picks.length === 0 ? (
                        <p className="text-xs text-slate-600 italic py-6 text-center">
                          No picks recorded.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {picks
                            .sort((a, b) => a.round - b.round)
                            .map((p) => (
                              <div
                                key={p.overallPick}
                                className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-mono text-[9px] text-slate-500">
                                    R{p.round}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1 rounded ${
                                      POS_COLORS[p.player.pos]?.badge ||
                                      "bg-slate-800"
                                    }`}
                                  >
                                    {p.player.pos}
                                  </span>
                                  <span className="text-slate-200 truncate font-medium">
                                    {p.player.name}
                                  </span>
                                </div>
                                {p.isKeeper && (
                                  <span className="text-[8px] font-extrabold bg-amber-500/20 text-amber-300 px-1 rounded">
                                    KEEP
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "scorecard" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white">
                Post Draft Scorecard & Grades
              </h2>
              <p className="text-xs text-slate-400">
                Total projected points, draft steal evaluations, and reaches
                across all squads.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leagueScorecard.map((sc, rank) => {
                const isUser = sc.teamIndex === userTeamIndex;
                return (
                  <div
                    key={sc.teamIndex}
                    className={`rounded-xl border p-4 bg-slate-950/60 ${
                      isUser
                        ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10"
                        : "border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          Rank #{rank + 1} {isUser && "· YOUR TEAM"}
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {sc.teamName}
                        </h4>
                      </div>
                      <span
                        className={`text-xl font-black px-2.5 py-0.5 rounded-lg ${
                          sc.grade.startsWith("A")
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : sc.grade.startsWith("B")
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {sc.grade}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 my-3 text-slate-400 border-y border-slate-800/80 py-2">
                      <div className="flex justify-between">
                        <span>Projected Points:</span>
                        <span className="font-mono font-bold text-white">
                          {sc.totalPoints.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Roster Slots Drafted:</span>
                        <span className="font-bold text-slate-300">
                          {sc.picksCount} / 18
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-emerald-400 block">
                          Best Steal
                        </span>
                        <p className="text-slate-300 font-medium">
                          {sc.bestSteal
                            ? `${sc.bestSteal.player.name} (+${sc.bestSteal.value} picks)`
                            : "None"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-rose-400 block">
                          Biggest Reach
                        </span>
                        <p className="text-slate-300 font-medium">
                          {sc.biggestReach
                            ? `${sc.biggestReach.player.name} (${sc.biggestReach.value} picks early)`
                            : "None"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "editor" && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-1">
                Draft Slots & Manager Names
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Click "You" on your slot to anchor personal team
                recommendations.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                {teamNames.map((name, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border bg-slate-950/60 ${
                      userTeamIndex === index
                        ? "border-cyan-500/60"
                        : "border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">
                        Slot #{index + 1}
                      </span>
                      <label className="text-[10px] font-bold text-cyan-400 flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="userSlot"
                          checked={userTeamIndex === index}
                          onChange={() => setUserTeamIndex(index)}
                        />
                        You
                      </label>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) =>
                        handleTeamNameChange(index, e.target.value)
                      }
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-3">
                Trade Draft Picks
              </h2>
              <form
                onSubmit={handleAddTrade}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"
              >
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Round
                  </label>
                  <select
                    value={tradeRound}
                    onChange={(e) => setTradeRound(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {Array.from({ length: 18 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Round {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    From Team (Original Owner)
                  </label>
                  <select
                    value={tradeFromTeam}
                    onChange={(e) => setTradeFromTeam(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {teamNames.map((name, i) => (
                      <option key={i} value={i}>
                        {name} (Slot {i + 1})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    To Team (Recipient)
                  </label>
                  <select
                    value={tradeToTeam}
                    onChange={(e) => setTradeToTeam(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {teamNames.map((name, i) => (
                      <option key={i} value={i}>
                        {name} (Slot {i + 1})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    Log Trade
                  </button>
                </div>
              </form>

              <div className="space-y-1.5">
                {tradedPicks.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">
                    No traded picks logged.
                  </p>
                ) : (
                  tradedPicks.map((trade) => {
                    const round = Math.ceil(trade.overallPick / 12);
                    return (
                      <div
                        key={trade.overallPick}
                        className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
                      >
                        <div>
                          <span className="text-slate-400 mr-2">
                            Round {round} (Pick #{trade.overallPick}):
                          </span>
                          <span className="text-slate-400 line-through mr-2">
                            {teamNames[trade.originalTeamIndex]}
                          </span>
                          <span className="text-emerald-400 font-bold">
                            → {teamNames[trade.newTeamIndex]}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveTrade(trade.overallPick)}
                          className="text-rose-400 hover:text-rose-300 text-[11px] font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-3">
                Assign Keeper Selections
              </h2>
              <form
                onSubmit={handleAddKeeper}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"
              >
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Team
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {teamNames.map((name, i) => (
                      <option key={i} value={i}>
                        {name} (Slot {i + 1})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Round Cost
                  </label>
                  <select
                    value={selectedRound}
                    onChange={(e) => setSelectedRound(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {Array.from({ length: 18 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Round {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Player
                  </label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">Select player...</option>
                    {playersList
                      .filter(
                        (p) =>
                          !assignedPlayerIds.has(p.id) ||
                          keepers.find(
                            (k) =>
                              k.teamIndex === selectedTeam &&
                              k.playerId === p.id
                          )
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.pos} · {p.team})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    Lock Keeper
                  </button>
                </div>
              </form>

              <div className="space-y-1.5">
                {keepers.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">
                    No keepers logged yet.
                  </p>
                ) : (
                  keepers
                    .sort((a, b) => a.teamIndex - b.teamIndex)
                    .map((k) => {
                      const player = playersList.find(
                        (p) => p.id === k.playerId
                      );
                      return (
                        <div
                          key={k.teamIndex}
                          className="flex justify-between items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
                        >
                          <div>
                            <span className="font-bold text-white mr-2">
                              {teamNames[k.teamIndex]}
                            </span>
                            <span className="text-slate-300">
                              {player?.name} ({player?.pos})
                            </span>
                            <span className="ml-2 font-mono text-cyan-400">
                              Round {k.round}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveKeeper(k.teamIndex)}
                            className="text-rose-400 hover:text-rose-300 text-[11px] font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-bold text-white mb-3">
                Add Custom Rookie or Free Agent
              </h2>
              <form
                onSubmit={handleAddCustomPlayer}
                className="grid grid-cols-2 md:grid-cols-8 gap-3"
              >
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Pos
                  </label>
                  <select
                    value={newPlayerPos}
                    onChange={(e) => setNewPlayerPos(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    {["QB", "RB", "WR", "TE", "K", "DST"].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Team
                  </label>
                  <input
                    type="text"
                    value={newPlayerTeam}
                    onChange={(e) => setNewPlayerTeam(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={newPlayerInjuryStatus}
                    onChange={(e) =>
                      setNewPlayerInjuryStatus(e.target.value as any)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="">Healthy</option>
                    <option value="Q">Q</option>
                    <option value="D">D</option>
                    <option value="O">O</option>
                    <option value="IR">IR</option>
                    <option value="PUP">PUP</option>
                    <option value="SUSP">SUSP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    SOS (1 to 5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newPlayerSos}
                    onChange={(e) => setNewPlayerSos(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    ADP
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPlayerAdp}
                    onChange={(e) => setNewPlayerAdp(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs transition"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Edit Player Values and Metrics
                  </h2>
                  <p className="text-xs text-slate-400">
                    Edit projections and ADPs directly inside the table rows.
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Search player or team..."
                  value={editorSearch}
                  onChange={(e) => setEditorSearch(e.target.value)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs w-56 text-white"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2">Player</th>
                      <th className="p-2">Pos</th>
                      <th className="p-2">Team</th>
                      <th className="p-2">Bye</th>
                      <th className="p-2">Proj Pts</th>
                      <th className="p-2">ADP</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">SOS</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredEditorPlayers.map((player) => (
                      <tr key={player.id} className="hover:bg-slate-800/30">
                        <td className="p-2 font-bold text-slate-100">
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) =>
                              handleUpdatePlayer(
                                player.id,
                                "name",
                                e.target.value
                              )
                            }
                            className="p-1 bg-slate-950 border border-slate-700 rounded text-xs w-40 font-medium text-white"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={player.pos}
                            onChange={(e) =>
                              handleUpdatePlayer(
                                player.id,
                                "pos",
                                e.target.value
                              )
                            }
                            className="p-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                          >
                            {["QB", "RB", "WR", "TE", "K", "DST"].map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={player.team}
                            onChange={(e) =>
                              handleUpdatePlayer(
                                player.id,
                                "team",
                                e.target.value
                              )
                            }
                            className="p-1 bg-slate-950 border border-slate-700 rounded text-xs w-14 uppercase text-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={player.bye}
                            onChange={(e) =>
                              handleUpdatePlayer(
                                player.id,
                                "bye",
                                Number(e.target.value)
                              )
                            }
                            className="p-1 bg-slate-950 border border-slate-700 rounded text-xs w-12 text-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={player.projectedPoints}
                            onChange={(e) =>
                              handleUpdatePlayer(
                                player.id,
                                "projectedPoints",
                                Number(e.target.value)
                              )
                            }
                            className="p-1 bg-slate-950 border border-slate-700 rounded text-xs w-16 text-white"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            value={(player as any).adp}
                            onChange={(e) =>
                              handleUpdatePlayer(
                                player.id,
                                "adp",
                                Number(e.target.value)
                              )
                            }
                            className="p-1 bg-slate-950 border border-slate-700 rounded text-xs w-14 text-white"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={player.injuryStatus || ""}
                            onChange={(e) =>
                              handleUpdatePlayer(
                                player.id,
                                "injuryStatus",
                                e.target.value || undefined
                              )
                            }
                            className="p-1 bg-slate-950 border border-slate-700 rounded text-xs text-white w-20"
                          >
                            <option value="">Healthy</option>
                            <option value="Q">Q</option>
                            <option value="D">D</option>
                            <option value="O">O</option>
                            <option value="IR">IR</option>
                            <option value="PUP">PUP</option>
                            <option value="SUSP">SUSP</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={player.sos || 3}
                            onChange={(e) =>
                              handleUpdatePlayer(
                                player.id,
                                "sos",
                                Number(e.target.value)
                              )
                            }
                            className="p-1 bg-slate-950 border border-slate-700 rounded text-xs w-12 text-white"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="text-rose-500 hover:text-rose-400 font-semibold text-[11px]"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
