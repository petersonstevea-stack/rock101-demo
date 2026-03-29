export type ActivityItem = {
  id: string;
  type:
    | "privateLesson"
    | "groupRehearsal"
    | "badge"
    | "certificate"
    | "milestone";
  title: string;
  description?: string;
  dateLabel: string;
};

export type DashboardStat = {
  label: string;
  value: string;
  sublabel?: string;
};

export type ProgressBlock = {
  label: string;
  completed: number;
  total: number;
  percent: number;
  targetTab: "privateLesson" | "groupRehearsal" | "certificate";
};

export type WhatsNextItem = {
  id: string;
  label: string;
  area: "privateLesson" | "groupRehearsal" | "certificate" | "general";
  description?: string;
  priority: "high" | "medium" | "low";
};

export type ParentDashboardData = {
  songs: {
    song: string;
    readiness: 1 | 2 | 3 | 4 | 5;
    label: string;
    targetTab: "privateLesson" | "groupRehearsal" | "certificate";
  }[];

  student: {
    id: string;
    name: string;
    instrument: string;
    className: string;
    schoolName: string;
    nextPerformanceDate?: string | null;
  };

  overallProgressPercent: number;
  rehearsalsToShow: number | null;

  stats: {
    [key: string]: DashboardStat;
  };

  progress: {
    [key: string]: ProgressBlock;
  };

  rehearsalReady: {
    ready: boolean;
    label: string;
    description: string;
  };

  certificate: {
    earned: boolean;
    completedRequired: number;
    totalRequired: number;
    percent: number;
    label: string;
    description: string;
  };

  badgeSummary: {
    earned: number;
    available: number;
    nextBadgeLabel?: string;
  };

  recentActivity: ActivityItem[];
  whatsNext: WhatsNextItem[];

  notesMeta: {
    lessonLastUpdated: string | null;
    rehearsalLastUpdated: string | null;
    lessonAuthorName?: string | null;
    rehearsalAuthorName?: string | null;
  };

  summary: {
    title: string;
    text: string;
  };
  classFeedback?: string | null;
};
