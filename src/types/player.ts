import type { PlayerStats } from "@/types/stats";

export type BattingSide = "Right" | "Left" | "Switch" | "Unknown";
export type ThrowingSide = "Right" | "Left" | "Unknown";
export type SpeedRating = "Fast" | "Average" | "Slow";
export type PlayerGender = "Female" | "Male" | "Unknown";

export type Player = {
  id: string;
  name: string;
  gender: PlayerGender;
  bats: BattingSide;
  throws: ThrowingSide;
  primaryPosition: string;
  speedRating: SpeedRating;
  notes: string;
  contactNotes: string[];
  roleHint: string;
  isActive: boolean;
  seedOrder: number;
  seasonStats: PlayerStats;
};

export type ActiveTeam = {
  id: string;
  ownerUid?: string;
  ownerEmail?: string | null;
  name: string;
  players: Player[];
  createdAt: string;
  updatedAt: string;
};

export type PlayerProfileInput = {
  name: string;
  gender: PlayerGender;
  bats: BattingSide;
  throws: ThrowingSide;
  primaryPosition: string;
  speedRating: SpeedRating;
  notes: string;
  contactNotes: string;
  roleHint: string;
  isActive: boolean;
  startingStats: PlayerStats;
};
