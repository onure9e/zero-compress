// AI-powered security for zero-compress
// Machine learning-based anomaly detection and behavioral analysis

import { CompressionLogger } from './monitoring';
import { isPotentialZipBomb } from './security';

export interface SecurityFeatures {
  anomalyDetection: boolean;
  behavioralAnalysis: boolean;
  adaptiveLearning: boolean;
  realTimeMonitoring: boolean;
}

export interface CompressionPattern {
  timestamp: number;
  operation: string;
  inputSize: number;
  outputSize: number;
  compressionRatio: number;
  duration: number;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
}

export interface AnomalyScore {
  score: number; // 0-1, higher = more anomalous
  confidence: number;
  reasons: string[];
  recommendedAction: 'allow' | 'block' | 'monitor' | 'flag';
}

export interface BehavioralProfile {
  userId: string;
  patterns: CompressionPattern[];
  averageRatio: number;
  averageDuration: number;
  averageSize: number;
  lastActivity: number;
  trustScore: number; // 0-100
  anomalyCount: number;
  flags: string[];
}

export class AISecurityEngine {
  private logger: CompressionLogger;
  private features: SecurityFeatures;
  private profiles: Map<string, BehavioralProfile> = new Map();
  private anomalyHistory: AnomalyScore[] = [];
  private readonly maxHistorySize = 1000;
  private model: SimpleAnomalyDetector;
  private learningEnabled: boolean = true;

  constructor(logger: CompressionLogger, features: SecurityFeatures = {
    anomalyDetection: true,
    behavioralAnalysis: true,
    adaptiveLearning: true,
    realTimeMonitoring: true
  }) {
    this.logger = logger;
    this.features = features;
    this.model = new SimpleAnomalyDetector();

    if (features.adaptiveLearning) {
      this.initializeLearning();
    }
  }

  /**
   * Analyze compression operation for security threats
   */
  async analyzeCompression(operation: CompressionPattern, userId?: string): Promise<AnomalyScore> {
    const startTime = Date.now();

    let score: AnomalyScore = {
      score: 0,
      confidence: 0.5,
      reasons: [],
      recommendedAction: 'allow'
    };

    // Multi-layer analysis
    if (this.features.anomalyDetection) {
      const anomalyScore = await this.detectAnomalies(operation);
      score = this.combineScores(score, anomalyScore);
    }

    if (this.features.behavioralAnalysis && userId) {
      const behavioralScore = this.analyzeBehavior(operation, userId);
      score = this.combineScores(score, behavioralScore);
    }

    // Zip bomb detection (traditional + AI-enhanced)
    if (await this.detectAdvancedZipBomb(operation)) {
      score.score = Math.max(score.score, 0.95);
      score.reasons.push('Advanced zip bomb pattern detected');
      score.recommendedAction = 'block';
    }

    // Update behavioral profile
    if (userId) {
      this.updateBehavioralProfile(operation, userId, score);
    }

    // Record anomaly for learning
    if (score.score > 0.3) {
      this.anomalyHistory.push(score);
      if (this.anomalyHistory.length > this.maxHistorySize) {
        this.anomalyHistory = this.anomalyHistory.slice(-this.maxHistorySize);
      }
      this.logger.warn('security_anomaly_detected', `Anomaly score: ${score.score}`, {
        score: score.score,
        reasons: score.reasons,
        action: score.recommendedAction,
        analysisTime: Date.now() - startTime
      });
    }

    // Adaptive learning
    if (this.learningEnabled && this.anomalyHistory.length > 100) {
      this.updateModel();
    }

    return score;
  }

  /**
   * Get behavioral profile for user
   */
  getBehavioralProfile(userId: string): BehavioralProfile | null {
    return this.profiles.get(userId) || null;
  }

  /**
   * Update trust scores based on behavior
   */
  updateTrustScores(): void {
    for (const [userId, profile] of this.profiles.entries()) {
      // Calculate trust score based on behavior consistency
      const consistencyScore = this.calculateConsistencyScore(profile);
      const anomalyPenalty = Math.min(profile.anomalyCount * 5, 50);
      const timeBonus = Math.min((Date.now() - profile.lastActivity) / (24 * 60 * 60 * 1000), 20); // Max 20 points for activity

      profile.trustScore = Math.max(0, Math.min(100,
        consistencyScore - anomalyPenalty + timeBonus
      ));

      // Reset anomaly count periodically
      if (Date.now() - profile.lastActivity > 7 * 24 * 60 * 60 * 1000) { // 7 days
        profile.anomalyCount = 0;
      }
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalProfiles: number;
    activeAnomalies: number;
    averageTrustScore: number;
    blockedOperations: number;
    flaggedOperations: number;
  } {
    const profiles = Array.from(this.profiles.values());
    const averageTrustScore = profiles.length > 0
      ? profiles.reduce((sum, p) => sum + p.trustScore, 0) / profiles.length
      : 0;

    const activeAnomalies = this.anomalyHistory.filter(
      a => Date.now() - (a as any).timestamp < 60 * 60 * 1000 // Last hour
    ).length;

    return {
      totalProfiles: profiles.length,
      activeAnomalies,
      averageTrustScore,
      blockedOperations: this.anomalyHistory.filter(a => a.recommendedAction === 'block').length,
      flaggedOperations: this.anomalyHistory.filter(a => a.recommendedAction === 'flag').length
    };
  }

  private async detectAnomalies(operation: CompressionPattern): Promise<AnomalyScore> {
    const reasons: string[] = [];
    let score = 0;

    // Size-based anomalies
    if (operation.compressionRatio < 0.1) {
      reasons.push('Unusually high compression ratio');
      score += 0.3;
    }

    if (operation.compressionRatio > 10) {
      reasons.push('Unusually low compression ratio (possible attack)');
      score += 0.4;
    }

    // Time-based anomalies
    const expectedTime = this.estimateCompressionTime(operation.inputSize);
    const timeRatio = operation.duration / expectedTime;

    if (timeRatio > 5) {
      reasons.push('Compression took unusually long');
      score += 0.2;
    }

    if (timeRatio < 0.1) {
      reasons.push('Compression was unusually fast');
      score += 0.1;
    }

    // Size consistency check
    if (operation.outputSize > operation.inputSize * 2) {
      reasons.push('Output size significantly larger than input');
      score += 0.3;
    }

    // ML-based anomaly detection
    const mlScore = this.model.predict(operation);
    if (mlScore > 0.7) {
      reasons.push('Machine learning detected anomalous pattern');
      score += mlScore * 0.5;
    }

    return {
      score: Math.min(1, score),
      confidence: 0.8,
      reasons,
      recommendedAction: score > 0.7 ? 'block' : score > 0.4 ? 'flag' : 'allow'
    };
  }

  private analyzeBehavior(operation: CompressionPattern, userId: string): AnomalyScore {
    const profile = this.profiles.get(userId);
    if (!profile || profile.patterns.length < 10) {
      return { score: 0, confidence: 0.3, reasons: [], recommendedAction: 'allow' };
    }

    const reasons: string[] = [];
    let score = 0;

    // Compare with historical patterns
    const avgRatio = profile.averageRatio;
    const ratioDeviation = Math.abs(operation.compressionRatio - avgRatio) / avgRatio;

    if (ratioDeviation > 0.5) {
      reasons.push(`Compression ratio deviates ${Math.round(ratioDeviation * 100)}% from normal`);
      score += Math.min(0.3, ratioDeviation * 0.6);
    }

    // Time deviation
    const avgDuration = profile.averageDuration;
    const timeDeviation = Math.abs(operation.duration - avgDuration) / avgDuration;

    if (timeDeviation > 1) {
      reasons.push(`Duration deviates ${Math.round(timeDeviation * 100)}% from normal`);
      score += Math.min(0.2, timeDeviation * 0.2);
    }

    // Sudden changes in behavior
    const recentPatterns = profile.patterns.slice(-5);
    const recentAvgSize = recentPatterns.reduce((sum, p) => sum + p.inputSize, 0) / recentPatterns.length;
    const sizeChange = Math.abs(operation.inputSize - recentAvgSize) / recentAvgSize;

    if (sizeChange > 2) {
      reasons.push('Sudden change in data size patterns');
      score += 0.2;
    }

    // Trust score adjustment
    if (profile.trustScore < 30) {
      reasons.push('Low trust score user');
      score += 0.1;
    }

    return {
      score: Math.min(1, score),
      confidence: 0.7,
      reasons,
      recommendedAction: score > 0.5 ? 'flag' : 'allow'
    };
  }

  private async detectAdvancedZipBomb(operation: CompressionPattern): Promise<boolean> {
    // Traditional zip bomb detection
    if (operation.compressionRatio > 100) {
      return true;
    }

    // AI-enhanced detection
    if (operation.inputSize > 1024 * 1024 && operation.compressionRatio < 0.5) {
      // Large input with poor compression might be attack
      return true;
    }

    // Pattern-based detection
    if (operation.inputSize > 0 && operation.outputSize === 0) {
      return true; // No output from compression
    }

    return false;
  }

  private updateBehavioralProfile(operation: CompressionPattern, userId: string, score: AnomalyScore): void {
    let profile = this.profiles.get(userId);

    if (!profile) {
      profile = {
        userId,
        patterns: [],
        averageRatio: 0,
        averageDuration: 0,
        averageSize: 0,
        lastActivity: Date.now(),
        trustScore: 50, // Start neutral
        anomalyCount: 0,
        flags: []
      };
      this.profiles.set(userId, profile);
    }

    // Add new pattern
    profile.patterns.push(operation);
    profile.lastActivity = Date.now();

    // Keep only recent patterns (last 100)
    if (profile.patterns.length > 100) {
      profile.patterns.splice(0, profile.patterns.length - 100);
    }

    // Update averages
    const patterns = profile.patterns;
    profile.averageRatio = patterns.reduce((sum, p) => sum + p.compressionRatio, 0) / patterns.length;
    profile.averageDuration = patterns.reduce((sum, p) => sum + p.duration, 0) / patterns.length;
    profile.averageSize = patterns.reduce((sum, p) => sum + p.inputSize, 0) / patterns.length;

    // Update anomaly count
    if (score.score > 0.5) {
      profile.anomalyCount++;
    }

    // Update flags
    if (score.reasons.length > 0) {
      profile.flags = [...new Set([...profile.flags, ...score.reasons])];
    }
  }

  private combineScores(score1: AnomalyScore, score2: AnomalyScore): AnomalyScore {
    const combinedScore = Math.min(1, score1.score + score2.score);
    const combinedConfidence = (score1.confidence + score2.confidence) / 2;
    const combinedReasons = [...score1.reasons, ...score2.reasons];

    let action: 'allow' | 'block' | 'monitor' | 'flag' = 'allow';
    if (combinedScore > 0.8) action = 'block';
    else if (combinedScore > 0.6) action = 'flag';
    else if (combinedScore > 0.4) action = 'monitor';

    return {
      score: combinedScore,
      confidence: combinedConfidence,
      reasons: combinedReasons,
      recommendedAction: action
    };
  }

  private calculateConsistencyScore(profile: BehavioralProfile): number {
    if (profile.patterns.length < 5) return 50;

    const ratios = profile.patterns.map(p => p.compressionRatio);
    const durations = profile.patterns.map(p => p.duration);

    const ratioVariance = this.calculateVariance(ratios);
    const durationVariance = this.calculateVariance(durations);

    // Lower variance = higher consistency score
    const ratioScore = Math.max(0, 100 - ratioVariance * 1000);
    const durationScore = Math.max(0, 100 - durationVariance * 100);

    return (ratioScore + durationScore) / 2;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  private estimateCompressionTime(inputSize: number): number {
    // Rough estimation based on input size
    // This would be calibrated with real performance data
    return Math.max(1, inputSize / (1024 * 1024)); // ~1ms per MB
  }

  private initializeLearning(): void {
    // Initialize with baseline patterns
    this.model.train([
      { timestamp: Date.now(), operation: 'gzip', inputSize: 1024, outputSize: 512, compressionRatio: 0.5, duration: 1 },
      { timestamp: Date.now(), operation: 'gzip', inputSize: 1024 * 1024, outputSize: 512 * 1024, compressionRatio: 0.5, duration: 10 },
      // Add more baseline patterns
    ]);
  }

  private updateModel(): void {
    if (!this.learningEnabled) return;

    const recentAnomalies = this.anomalyHistory.slice(-50);
    this.model.train(recentAnomalies.map(a => ({
      timestamp: Date.now(),
      operation: 'anomaly_update',
      inputSize: 1024 * 1024, // Placeholder
      outputSize: 512 * 1024,
      compressionRatio: 0.5,
      duration: 10
    })));
  }
}

/**
 * Simple anomaly detector (can be replaced with TensorFlow.js)
 */
class SimpleAnomalyDetector {
  private baselinePatterns: CompressionPattern[] = [];

  train(patterns: CompressionPattern[]): void {
    this.baselinePatterns = patterns;
  }

  predict(operation: CompressionPattern): number {
    if (this.baselinePatterns.length === 0) return 0;

    // Simple distance-based anomaly detection
    let minDistance = Infinity;

    for (const pattern of this.baselinePatterns) {
      const distance = Math.abs(operation.compressionRatio - pattern.compressionRatio) +
                      Math.abs(operation.duration - pattern.duration) * 0.1;
      minDistance = Math.min(minDistance, distance);
    }

    // Convert distance to anomaly score (0-1)
    return Math.min(1, minDistance / 2);
  }
}

// Global AI security engine
export const aiSecurityEngine = new AISecurityEngine(
  new CompressionLogger(),
  {
    anomalyDetection: true,
    behavioralAnalysis: true,
    adaptiveLearning: true,
    realTimeMonitoring: true
  }
);