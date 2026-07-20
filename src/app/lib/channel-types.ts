/** Shapes served by channel-api for The Box Office. */

export interface ChannelDay {
  day: string;
  subs: number;
  views: number;
}

export interface ChannelData {
  latest: ChannelDay | null;
  series: ChannelDay[];
}

export interface ShowingVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  /** Day-over-day view change; null until two snapshots exist. */
  viewsDelta: number | null;
}

export interface ScoutTrend {
  title: string;
  channel?: string;
  why?: string;
}

export interface ScoutIdea {
  title: string;
  angle?: string;
}

export interface ScoutNote {
  day: string;
  briefing: string | null;
  trending: ScoutTrend[];
  ideas: ScoutIdea[];
  received_at: string;
}

/** An idea kept for later — the slate. */
export interface StarredIdea {
  id: number;
  day: string;
  title: string;
  angle: string | null;
  starred_at: string;
}
