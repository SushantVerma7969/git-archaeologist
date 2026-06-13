export interface CommitRecord {
  hash: string;
  authorEmail: string;
  authorName: string;
  timestamp: number;
  filesChanged: string[];
}

export interface FileStats {
  filepath: string;
  totalChanges: number;
  uniqueAuthors: Set<string>;
  authorChanges: Map<string, number>;
  firstChanged: number;
  lastChanged: number;
  changeTimeline: number[];
}

export interface FileOwnership {
  filepath: string;
  owner: string;
  ownerEmail: string;
  ownershipPercent: number;
  contributors: Array<{
    name: string;
    email: string;
    changes: number;
    percent: number;
  }>;
}

export interface CursedFile {
  filepath: string;
  curseScore: number;
  totalChanges: number;
  uniqueAuthors: number;
  recencyWeight: number;
  reasons: string[];
  noisy?: boolean;
}

export interface BusFactor {
  scope: string;
  busFactor: number;
  atRiskAuthors: string[];
  filesAtRisk: number;
  warning: string;
}

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RiskExplanation {
  reasons: string[];
  summary: string;
}

export interface ScopeRisk {
  scope: string;
  level: RiskLevel;
  busFactor: number;
  concentration: number;
  contributors: number;
  totalFileTouches: number;
  topOwner: string;
  filesAtRisk: number;
  whyClassified: string[];
  explanation: RiskExplanation;
  lastActive?: string;
}

export interface CouplingPair {
  fileA: string;
  fileB: string;
  coChanges: number;
  couplingScore: number;
}

export interface AnalysisResult {
  repoPath: string;
  repoName: string;
  analyzedAt: Date;
  totalCommits: number;
  totalFiles: number;
  totalAuthors: number;
  dateRange: { from: Date; to: Date };
  cursedFiles: CursedFile[];
  ownership: FileOwnership[];
  busFactor: BusFactor[];
  coupling: CouplingPair[];
  fileStats: Map<string, FileStats>;
  lastActiveByAuthor: Map<string, number>;
}
