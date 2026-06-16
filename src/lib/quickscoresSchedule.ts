const QUICK_SCORES_URL =
  "https://www.quickscores.com/Orgs/ResultsDisplay.php?OrgDir=sanmateo&LeagueID=1717026&TeamID=15063981";

const TEAM_NAME = "Kobe's Peeps";
const SAN_MATEO_TIME_ZONE = "America/Los_Angeles";
const SAN_MATEO_TZ_OFFSET = "-07:00";

export type QuickScoresGame = {
  opponent: string;
  dateLabel: string;
  timeLabel: string;
  field: string;
  isHome: boolean;
  sourceUrl: string;
  fetchedAt: string;
};

export type QuickScoresSchedule = {
  game: QuickScoresGame | null;
  status: "ready" | "bye" | "unavailable";
  note: string;
};

type ScheduleEvent = {
  date: Date | null;
  dateLabel: string;
  timeLabel: string;
  field: string;
  teams: string[];
  isBye: boolean;
};

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#039;", "'")
    .replaceAll("&rsquo;", "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", "\"")
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function getFirstMatch(value: string, pattern: RegExp) {
  return decodeHtml(value.match(pattern)?.[1] ?? "");
}

function getScheduleYear(html: string, now: Date) {
  const year = html.match(/\b(?:Spring|Summer|Fall|Winter)\s+(\d{4})\b/)?.[1];

  return year ? Number(year) : now.getFullYear();
}

function getUntimedEventDate(dateLabel: string, scheduleYear: number) {
  const parsed = new Date(`${dateLabel} ${scheduleYear} 23:59:59 GMT${SAN_MATEO_TZ_OFFSET}`);

  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function parseQuickScoresEvents(html: string, now: Date) {
  const events = [...html.matchAll(/<li class="event"[\s\S]*?<\/li>/g)];
  const scheduleYear = getScheduleYear(html, now);

  return events.map<ScheduleEvent>((eventMatch) => {
    const block = eventMatch[0];
    const dateLabel = getFirstMatch(block, /<time class="e-date">([\s\S]*?)<\/time>/);
    const isoTime = getFirstMatch(block, /datetime="([^"]+)"/);
    const timeLabel = getFirstMatch(block, /<time class="e-time[\s\S]*?<span>([\s\S]*?)<\/span><\/time>/);
    const field = getFirstMatch(block, /<span class="e-local[\s\S]*?<a [^>]*>([\s\S]*?)<\/a><\/span>/);
    const teams = [...block.matchAll(/<span class="team-name[\s\S]*?<\/span>/g)].map((team) =>
      decodeHtml(team[0]),
    );

    return {
      date: isoTime
        ? new Date(`${isoTime}:00${SAN_MATEO_TZ_OFFSET}`)
        : getUntimedEventDate(dateLabel, scheduleYear),
      dateLabel,
      field,
      isBye: teams.some((team) => team.toLowerCase() === "bye"),
      teams,
      timeLabel,
    };
  });
}

function getOpponent(teams: string[]) {
  return teams.find((team) => team !== TEAM_NAME && team.toLowerCase() !== "bye") ?? "TBD";
}

function getNextPlayableGame(events: ScheduleEvent[], now: Date, fetchedAt: string) {
  const upcoming = events.filter((event) => event.date && event.date >= now);
  const nextPlayable = upcoming.find((event) => !event.isBye && event.teams.includes(TEAM_NAME));

  if (!nextPlayable || !nextPlayable.date) {
    const nextBye = upcoming.find((event) => event.isBye && event.teams.includes(TEAM_NAME));

    return {
      game: null,
      status: nextBye ? "bye" : "unavailable",
      note: nextBye
        ? `${TEAM_NAME} has a bye on ${nextBye.dateLabel}.`
        : "No upcoming QuickScores game could be found.",
    } satisfies QuickScoresSchedule;
  }

  return {
    game: {
      dateLabel: nextPlayable.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: SAN_MATEO_TIME_ZONE,
        weekday: "short",
      }),
      fetchedAt,
      field: nextPlayable.field || "Field TBD",
      isHome: nextPlayable.teams[0] === TEAM_NAME,
      opponent: getOpponent(nextPlayable.teams),
      sourceUrl: QUICK_SCORES_URL,
      timeLabel: nextPlayable.timeLabel || "Time TBD",
    },
    note:
      upcoming[0]?.isBye && upcoming[0].teams.includes(TEAM_NAME)
        ? `${TEAM_NAME} has a bye on ${upcoming[0].dateLabel}; showing the next playable game.`
        : "Loaded from QuickScores.",
    status: "ready",
  } satisfies QuickScoresSchedule;
}

export async function getQuickScoresSchedule(now = new Date()): Promise<QuickScoresSchedule> {
  const fetchedAt = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: SAN_MATEO_TIME_ZONE,
  });

  try {
    const response = await fetch(QUICK_SCORES_URL, {
      next: { revalidate: 30 * 60 },
    });

    if (!response.ok) {
      throw new Error(`QuickScores returned ${response.status}`);
    }

    const html = await response.text();
    const events = parseQuickScoresEvents(html, now);

    return getNextPlayableGame(events, now, fetchedAt);
  } catch {
    return {
      game: null,
      note: "QuickScores is not available right now.",
      status: "unavailable",
    };
  }
}
