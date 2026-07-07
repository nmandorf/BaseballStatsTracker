import type { DefensiveRatingValue } from "@/types/defense";
import type { Player } from "@/types/player";

type PlayerPersistenceMappers<TGender, TBattingSide, TThrowingSide, TSpeedRating, TDefensiveRating> = {
  gender: (value: Player["gender"]) => TGender;
  bats: (value: Player["bats"]) => TBattingSide;
  throws: (value: Player["throws"]) => TThrowingSide;
  speedRating: (value: Player["speedRating"]) => TSpeedRating;
  defensiveRating: (value: DefensiveRatingValue) => TDefensiveRating | null;
};

export function toPlayerPersistenceData<TGender, TBattingSide, TThrowingSide, TSpeedRating, TDefensiveRating>(
  player: Player,
  mappers: PlayerPersistenceMappers<TGender, TBattingSide, TThrowingSide, TSpeedRating, TDefensiveRating>,
) {
  return {
    name: player.name,
    gender: mappers.gender(player.gender),
    bats: mappers.bats(player.bats),
    throws: mappers.throws(player.throws),
    primaryPosition: emptyToNull(player.primaryPosition),
    speedRating: mappers.speedRating(player.speedRating),
    notes: emptyToNull(player.notes),
    contactNotes: player.contactNotes,
    ...toDefensiveRatingsData(player, mappers),
    ...toDefensiveNotesData(player),
    roleHint: player.roleHint,
    seedOrder: player.seedOrder,
    isActive: player.isActive,
  };
}

function toDefensiveRatingsData<TGender, TBattingSide, TThrowingSide, TSpeedRating, TDefensiveRating>(
  player: Player,
  mappers: PlayerPersistenceMappers<TGender, TBattingSide, TThrowingSide, TSpeedRating, TDefensiveRating>,
) {
  return {
    armStrength: mappers.defensiveRating(player.defensiveProfile.ratings.armStrength),
    throwAccuracy: mappers.defensiveRating(player.defensiveProfile.ratings.throwAccuracy),
    gloveSkill: mappers.defensiveRating(player.defensiveProfile.ratings.gloveSkill),
    rangeRating: mappers.defensiveRating(player.defensiveProfile.ratings.range),
    positionConfidence: mappers.defensiveRating(player.defensiveProfile.ratings.positionConfidence),
  };
}

function toDefensiveNotesData(player: Player) {
  return {
    defenseStrengths: emptyToNull(player.defensiveProfile.notes.strengths),
    defenseWeaknesses: emptyToNull(player.defensiveProfile.notes.weaknesses),
    bestDefensePosition: emptyToNull(player.defensiveProfile.notes.bestPosition),
    avoidDefensePosition: emptyToNull(player.defensiveProfile.notes.avoidPosition),
    backupDefensePosition: emptyToNull(player.defensiveProfile.notes.backupPosition),
    defenseCommunicationNotes: emptyToNull(player.defensiveProfile.notes.communication),
    defenseHealthNotes: emptyToNull(player.defensiveProfile.notes.health),
  };
}

function emptyToNull(value: string) {
  return value || null;
}
