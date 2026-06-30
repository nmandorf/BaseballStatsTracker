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
    primaryPosition: player.primaryPosition || null,
    speedRating: mappers.speedRating(player.speedRating),
    notes: player.notes || null,
    contactNotes: player.contactNotes,
    armStrength: mappers.defensiveRating(player.defensiveProfile.ratings.armStrength),
    throwAccuracy: mappers.defensiveRating(player.defensiveProfile.ratings.throwAccuracy),
    gloveSkill: mappers.defensiveRating(player.defensiveProfile.ratings.gloveSkill),
    rangeRating: mappers.defensiveRating(player.defensiveProfile.ratings.range),
    positionConfidence: mappers.defensiveRating(player.defensiveProfile.ratings.positionConfidence),
    defenseStrengths: player.defensiveProfile.notes.strengths || null,
    defenseWeaknesses: player.defensiveProfile.notes.weaknesses || null,
    bestDefensePosition: player.defensiveProfile.notes.bestPosition || null,
    avoidDefensePosition: player.defensiveProfile.notes.avoidPosition || null,
    backupDefensePosition: player.defensiveProfile.notes.backupPosition || null,
    defenseCommunicationNotes: player.defensiveProfile.notes.communication || null,
    defenseHealthNotes: player.defensiveProfile.notes.health || null,
    roleHint: player.roleHint,
    seedOrder: player.seedOrder,
    isActive: player.isActive,
  };
}
