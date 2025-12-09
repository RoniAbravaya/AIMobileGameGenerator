/**
 * Type definitions for the AI Game Generator Agent
 */

export interface GameConfig {
  id: string;
  name: string;
  type: GameType;
  theme: string;
  mechanics: string[];
  packageName: string;
  repoName: string;
  status: GameStatus;
  createdAt: Date;
  deployedAt?: Date;
}

export enum GameType {
  RUNNER = 'runner',
  PLATFORMER = 'platformer',
  PUZZLE = 'puzzle',
  MATCH3 = 'match3',
  SHOOTER = 'shooter',
  CASUAL = 'casual',
  ARCADE = 'arcade',
  RACING = 'racing',
  ADVENTURE = 'adventure',
  STRATEGY = 'strategy'
}

export enum GameStatus {
  GENERATING = 'generating',
  TESTING = 'testing',
  BUILDING = 'building',
  DEPLOYING = 'deploying',
  LIVE = 'live',
  FAILED = 'failed',
  SUNSET = 'sunset'
}

export interface Level {
  id: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  targetScore: number;
  config: Record<string, any>;
}

export interface GameMetrics {
  gameId: string;
  installs: number;
  dau: number;
  retention1Day: number;
  retention7Day: number;
  retention30Day: number;
  averageSessionLength: number;
  arpu: number;
  arpdau: number;
  adImpressions: number;
  adEcpm: number;
  iapConversionRate: number;
  crashRate: number;
  score: number;
}

export interface BuildResult {
  success: boolean;
  buildUrl?: string;
  buildId?: string;
  errors?: string[];
  logs?: string;
}

export interface TestResult {
  success: boolean;
  passed: number;
  failed: number;
  errors?: string[];
  logs?: string;
}

export interface DeploymentResult {
  success: boolean;
  packageName?: string;
  versionCode?: number;
  status?: string;
  errors?: string[];
}

export interface AIGenerationRequest {
  gameType: GameType;
  theme: string;
  mechanics: string[];
  levelCount: number;
  existingCode?: string;
  errorContext?: string;
}

export interface AIGenerationResponse {
  code: Record<string, string>; // filepath -> code content
  levels: Level[];
  tests: Record<string, string>; // test filepath -> test code
  explanation: string;
}

export interface GitHubRepoConfig {
  name: string;
  description: string;
  private: boolean;
  autoInit: boolean;
}

export interface EASConfig {
  projectId: string;
  slug: string;
  name: string;
  version: string;
  buildProfile: string;
}

export interface GooglePlayConfig {
  packageName: string;
  serviceAccountEmail: string;
  track: 'internal' | 'alpha' | 'beta' | 'production';
}

export interface AgentConfig {
  githubToken: string;
  githubOrg: string;
  expoToken: string;
  anthropicApiKey: string;
  googlePlayServiceAccountPath: string;
  generatedGamesDir: string;
  maxRetryAttempts: number;
  autoMergeOnTestPass: boolean;
}

export interface WorkflowResult {
  success: boolean;
  gameId?: string;
  repoUrl?: string;
  buildUrl?: string;
  message: string;
  errors?: string[];
}

export interface ExtensionRequest {
  gameId: string;
  additionalLevels: number;
  newMechanics?: string[];
  newThemes?: string[];
}

export interface AnalysisResult {
  games: GameMetrics[];
  winner?: GameMetrics;
  recommendations: string[];
  timestamp: Date;
}
