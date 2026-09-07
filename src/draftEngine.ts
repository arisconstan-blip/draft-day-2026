export interface DraftPlayer {
  id: string;
  name: string;
  pos: "QB" | "RB" | "WR" | "TE" | "K" | "DST";
  team: string;
  bye: number;
  projectedPoints: number;
  adp?: number;
  consensusRank?: number;
  tier?: number;
  upsideTag?: "High Ceiling" | "High Floor" | "Rookie Breakout" | "Handcuff";
  injuryStatus?: "Q" | "D" | "O" | "IR" | "PUP" | "SUSP";
  injuryDetails?: string;
  sos?: number;
  vbd?: number;
  vols?: number;
  fpVorp?: number;
  vbdRank?: number;
}

export interface PickRecord {
  overallPick: number;
  round: number;
  teamIndex: number;
  player: DraftPlayer;
  isKeeper?: boolean;
}

export interface KeeperAssignment {
  teamIndex: number;
  round: number;
  playerId: string;
}

export interface PickTrade {
  overallPick: number;
  originalTeamIndex: number;
  newTeamIndex: number;
}

export interface EvaluatedPlayer extends DraftPlayer {
  vorp: number;
  nextPickDropoff: number;
  playersRemainingInTier: number;
  isLastInTier: boolean;
  valueGap: number;
  survivalProb: number;
  dynamicScore: number;
  intelReasons: string[];
}

const REPLACEMENT_BASELINES: Record<string, number> = {
  QB: 14,
  RB: 34,
  WR: 38,
  TE: 13,
  K: 12,
  DST: 12,
};

function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

export function calculateAvailabilityProbability(
  adp: number,
  targetPick: number
): number {
  const stdDev = Math.max(1.8, adp * 0.12);
  const z = (targetPick - adp) / stdDev;
  const cdf = 0.5 * (1 + erf(z / Math.sqrt(2)));
  const prob = (1 - cdf) * 100;
  return Math.min(99, Math.max(1, Math.round(prob)));
}

export class OfflineDraftManager {
  totalTeams: number;
  totalRounds: number;
  currentOverallPick: number;
  allPlayers: DraftPlayer[];
  draftedPlayerIds: Set<string>;
  history: PickRecord[];
  scheduledKeepers: Map<number, { teamIndex: number; player: DraftPlayer }>;
  tradedPicks: Map<number, number>;

  constructor(
    totalTeams: number = 12,
    totalRounds: number = 18,
    initialPlayers: DraftPlayer[] = [],
    keepers: KeeperAssignment[] = [],
    tradedPicksList: PickTrade[] = []
  ) {
    this.totalTeams = totalTeams;
    this.totalRounds = totalRounds;
    this.currentOverallPick = 1;
    this.allPlayers = initialPlayers;
    this.draftedPlayerIds = new Set();
    this.history = [];
    this.scheduledKeepers = new Map();
    this.tradedPicks = new Map();

    tradedPicksList.forEach((t) => {
      this.tradedPicks.set(t.overallPick, t.newTeamIndex);
    });

    for (const k of keepers) {
      const player = this.allPlayers.find((p) => p.id === k.playerId);
      if (!player) continue;

      let pickSlot = -1;
      const maxPicks = this.totalTeams * this.totalRounds;
      for (let p = 1; p <= maxPicks; p++) {
        const round = Math.ceil(p / this.totalTeams);
        if (round === k.round && this.getTeamAtPick(p) === k.teamIndex) {
          pickSlot = p;
          break;
        }
      }

      if (pickSlot === -1) {
        const pickInRound =
          k.round % 2 === 1 ? k.teamIndex + 1 : this.totalTeams - k.teamIndex;
        pickSlot = (k.round - 1) * this.totalTeams + pickInRound;
      }

      this.scheduledKeepers.set(pickSlot, {
        teamIndex: k.teamIndex,
        player,
      });
      this.draftedPlayerIds.add(player.id);
    }
  }

  getTeamAtPick(pickNumber: number): number {
    if (this.tradedPicks.has(pickNumber)) {
      return this.tradedPicks.get(pickNumber)!;
    }
    const round = Math.ceil(pickNumber / this.totalTeams);
    const pickInRound = (pickNumber - 1) % this.totalTeams;
    const isEvenRound = round % 2 === 0;
    return isEvenRound ? this.totalTeams - 1 - pickInRound : pickInRound;
  }

  getCurrentTeamIndex(): number {
    return this.getTeamAtPick(this.currentOverallPick);
  }

  getNextPickForTeam(teamIndex: number, afterPick: number): number | null {
    const maxPicks = this.totalTeams * this.totalRounds;
    for (let p = afterPick + 1; p <= maxPicks; p++) {
      if (this.getTeamAtPick(p) === teamIndex) {
        return p;
      }
    }
    return null;
  }

  getAvailablePlayers(): DraftPlayer[] {
    return this.allPlayers.filter((p) => !this.draftedPlayerIds.has(p.id));
  }

  getRankedAvailable(
    userTeamIndex: number = 0,
    userRoster: DraftPlayer[] = [],
    targetIds: string[] = []
  ): EvaluatedPlayer[] {
    const available = this.getAvailablePlayers();
    const currentRound = Math.ceil(this.currentOverallPick / this.totalTeams);
    const nextUserPick = this.getNextPickForTeam(
      userTeamIndex,
      this.currentOverallPick
    );

    const baselines: Record<string, number> = {};
    for (const [pos, cutoff] of Object.entries(REPLACEMENT_BASELINES)) {
      const posGroup = available
        .filter((p) => p.pos === pos)
        .sort((a, b) => b.projectedPoints - a.projectedPoints);
      const baselinePlayer =
        posGroup[cutoff - 1] || posGroup[posGroup.length - 1];
      baselines[pos] = baselinePlayer ? baselinePlayer.projectedPoints : 0;
    }

    const posCounts: Record<string, number> = {
      QB: 0,
      RB: 0,
      WR: 0,
      TE: 0,
      K: 0,
      DST: 0,
    };
    userRoster.forEach((p) => {
      if (posCounts[p.pos] !== undefined) posCounts[p.pos]++;
    });

    const tierCounts: Record<string, number> = {};
    available.forEach((p) => {
      if (p.tier) {
        const key = `${p.pos}_${p.tier}`;
        tierCounts[key] = (tierCounts[key] || 0) + 1;
      }
    });

    return available
      .map((p) => {
        const vorp = Number(
          (p.projectedPoints - (baselines[p.pos] || 0)).toFixed(1)
        );

        const posGroup = available
          .filter((x) => x.pos === p.pos)
          .sort((a, b) => b.projectedPoints - a.projectedPoints);

        const currentIndex = posGroup.findIndex((x) => x.id === p.id);
        const nextPlayer = posGroup[currentIndex + 1];
        const nextPickDropoff = nextPlayer
          ? Number((p.projectedPoints - nextPlayer.projectedPoints).toFixed(1))
          : 0;

        const tierKey = p.tier ? `${p.pos}_${p.tier}` : "";
        const playersRemainingInTier = tierKey ? tierCounts[tierKey] || 1 : 1;
        const isLastInTier = playersRemainingInTier === 1;

        const adp = (p as any).adp || 100;
        const valueGap = Number((this.currentOverallPick - adp).toFixed(1));
        const survivalProb = nextUserPick
          ? calculateAvailabilityProbability(adp, nextUserPick)
          : 50;

        let dynamicScore = Math.max(0, vorp * 0.25);
        const intelReasons: string[] = [];

        if (currentRound <= 4) {
          if (vorp > 80) dynamicScore += 20;
          if (isLastInTier) {
            dynamicScore += 18;
            intelReasons.push(`Last remaining ${p.pos} in Tier ${p.tier}`);
          }
          if (nextPickDropoff >= 14) {
            dynamicScore += 12;
            intelReasons.push(
              `Cliff: -${nextPickDropoff} pts to next ${p.pos}`
            );
          }
        } else if (currentRound <= 9) {
          if (valueGap >= 4) {
            dynamicScore += Math.min(18, valueGap * 1.5);
            intelReasons.push(`+${valueGap} picks market slip vs ADP`);
          }
          if (p.vols && p.vols > 40) {
            dynamicScore += Math.min(14, p.vols * 0.15);
            intelReasons.push(`+${p.vols} Value Over Last Starter`);
          }
          if (isLastInTier) {
            dynamicScore += 14;
            intelReasons.push(`Final asset in Tier ${p.tier}`);
          }
        } else {
          if (valueGap >= 6) {
            dynamicScore += 16;
            intelReasons.push(`Major draft value (+${valueGap} picks)`);
          }
          if (
            p.upsideTag === "High Ceiling" ||
            p.upsideTag === "Rookie Breakout"
          ) {
            dynamicScore += 15;
            intelReasons.push(`${p.upsideTag} potential`);
          }
        }

        if (p.pos === "RB" && posCounts.RB < 2) {
          dynamicScore += 12;
          intelReasons.push("Starting RB slot empty");
        } else if (p.pos === "WR" && posCounts.WR < 2) {
          dynamicScore += 12;
          intelReasons.push("Starting WR slot empty");
        } else if (p.pos === "QB" && posCounts.QB === 0 && currentRound >= 4) {
          dynamicScore += 10;
        } else if (p.pos === "TE" && posCounts.TE === 0 && currentRound >= 4) {
          dynamicScore += 10;
        }

        if (
          (p.pos === "QB" || p.pos === "TE") &&
          posCounts[p.pos] >= 1 &&
          currentRound < 10
        ) {
          dynamicScore -= 35;
        }

        if (targetIds.includes(p.id)) {
          dynamicScore += 22;
          intelReasons.push("Pinned on your Target Queue");
        }

        if (survivalProb < 20 && nextUserPick) {
          dynamicScore += 14;
          intelReasons.push(
            `Only ${survivalProb}% chance to survive to pick #${nextUserPick}`
          );
        }

        if (
          p.injuryStatus === "IR" ||
          p.injuryStatus === "O" ||
          p.injuryStatus === "PUP"
        ) {
          dynamicScore -= 30;
        } else if (p.injuryStatus === "D") {
          dynamicScore -= 18;
        } else if (p.injuryStatus === "Q") {
          dynamicScore -= 5;
        }

        return {
          ...p,
          vorp,
          nextPickDropoff,
          playersRemainingInTier,
          isLastInTier,
          valueGap,
          survivalProb,
          dynamicScore: Number(dynamicScore.toFixed(1)),
          intelReasons,
        };
      })
      .sort((a, b) => b.vorp - a.vorp);
  }

  makePick(playerId: string): PickRecord {
    const keeperAtSlot = this.scheduledKeepers.get(this.currentOverallPick);
    if (keeperAtSlot) {
      const round = Math.ceil(this.currentOverallPick / this.totalTeams);
      const record: PickRecord = {
        overallPick: this.currentOverallPick,
        round,
        teamIndex: keeperAtSlot.teamIndex,
        player: keeperAtSlot.player,
        isKeeper: true,
      };
      this.history.push(record);
      this.currentOverallPick += 1;
      return record;
    }

    const player = this.allPlayers.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found");
    if (this.draftedPlayerIds.has(playerId))
      throw new Error("Player already drafted");

    const round = Math.ceil(this.currentOverallPick / this.totalTeams);
    const teamIndex = this.getCurrentTeamIndex();

    const record: PickRecord = {
      overallPick: this.currentOverallPick,
      round,
      teamIndex,
      player,
      isKeeper: false,
    };

    this.draftedPlayerIds.add(playerId);
    this.history.push(record);
    this.currentOverallPick += 1;

    return record;
  }

  undoLastPick(): void {
    const lastPick = this.history.pop();
    if (!lastPick) return;

    if (!lastPick.isKeeper) {
      this.draftedPlayerIds.delete(lastPick.player.id);
    }
    this.currentOverallPick -= 1;
  }
}
