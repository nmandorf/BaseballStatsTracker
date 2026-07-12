export type PlayerStats = {
  gamesPlayed: number;
  plateAppearances: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  walks: number;
  reachedOnError: number;
  fieldersChoice: number;
  sacFlies: number;
  outs: number;
  groundouts: number;
  flyouts: number;
  lineouts: number;
  strikeoutsLooking: number;
  strikeoutsSwinging: number;
  otherOuts: number;
  doublePlays: number;
  productiveOuts: number;
  runs: number;
  rbis: number;
};

export type CalculatedStats = {
  battingAverage: number;
  onBasePercentage: number;
  sluggingPercentage: number;
  ops: number;
  extraBaseHitPercentage: number;
  outRate: number;
  totalBases: number;
  timesReachedBase: number;
  strikeouts: number;
  strikeoutRate: number;
  strikeoutLookingRate: number;
  strikeoutSwingingRate: number;
  ballsInPlay: number;
  ballInPlayRate: number;
  productiveOutRate: number;
};

export type GameHistoryBreakdown = {
  plateAppearances: number;
  hits: number;
  walks: number;
  rbis: number;
  outs: number;
  battingAverage: number;
  onBasePercentage: number;
};
