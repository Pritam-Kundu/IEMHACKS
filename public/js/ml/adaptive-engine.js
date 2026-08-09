/**
 * TensorFlow.js Adaptive Learning Engine Services
 * 
 * Includes modular services for Struggle Detection and Adaptive Difficulty
 * utilizing proper memory management (tf.tidy), normalized features, and IndexedDB storage.
 */

// ============================================================================
// 1. Feature Normalizer
// ============================================================================
class FeatureNormalizer {
    /**
     * Min-Max normalization
     */
    static normalize(val, min, max) {
        if (max === min) return 0;
        return Math.max(0, Math.min(1, (val - min) / (max - min)));
    }

    // Normalizes time to a 0-1 scale, capping at 60 seconds
    static normalizeResponseTime(timeMs) {
        return this.normalize(timeMs, 0, 60000); 
    }

    // Normalizes percentages (already 0-1 mostly, but ensures bounds)
    static normalizePercentage(val) {
        return this.normalize(val, 0, 1);
    }
}

// ============================================================================
// 2. Model Loader (IndexedDB & Bootstrap)
// ============================================================================
class ModelLoader {
    /**
     * Loads a model from IndexedDB. If it doesn't exist, generates a bootstrap model.
     * @param {string} modelName 
     * @param {string} version 
     * @param {Function} bootstrapFn 
     */
    static async loadModel(modelName, version, bootstrapFn) {
        const path = `indexeddb://${modelName}-${version}`;
        try {
            const model = await tf.loadLayersModel(path);
            console.log(`[ModelLoader] Loaded ${modelName} (${version}) from IndexedDB.`);
            return model;
        } catch (e) {
            console.log(`[ModelLoader] Model ${modelName} (${version}) not found locally. Generating bootstrap...`);
            const model = await bootstrapFn();
            await model.save(path);
            console.log(`[ModelLoader] Bootstrap ${modelName} (${version}) saved to IndexedDB.`);
            return model;
        }
    }
}

// ============================================================================
// 3. Learner State Service
// ============================================================================
class LearnerStateService {
    constructor() {
        this.reset();
    }

    reset() {
        this.totalAttempts = 0;
        this.correctAttempts = 0;
        this.skippedCount = 0;
        this.consecutiveCorrect = 0;
        this.consecutiveIncorrect = 0;
        this.totalResponseTimeMs = 0;
        
        // Mock data for broader context that would normally come from backend profile
        this.recentQuizAccuracy = 0.75;
        this.lessonCompletionRate = 0.5;
        this.courseProgress = 0.3;
        this.repeatedMistakeRate = 0.1;
        this.recentPerformanceTrend = 0.5; // 0=down, 0.5=flat, 1=up
        this.topicMastery = 0.6;
    }

    updateWithInteraction(isCorrect, responseTimeMs, isSkipped) {
        this.totalAttempts++;
        this.totalResponseTimeMs += responseTimeMs;

        if (isSkipped) {
            this.skippedCount++;
            this.consecutiveCorrect = 0;
            this.consecutiveIncorrect = 0;
        } else {
            if (isCorrect) {
                this.correctAttempts++;
                this.consecutiveCorrect++;
                this.consecutiveIncorrect = 0;
            } else {
                this.consecutiveIncorrect++;
                this.consecutiveCorrect = 0;
            }
        }
    }

    getLiveMetrics() {
        const currentAccuracy = this.totalAttempts > 0 ? (this.correctAttempts / this.totalAttempts) : 0;
        const avgResponseTime = this.totalAttempts > 0 ? (this.totalResponseTimeMs / this.totalAttempts) : 0;
        const skipRate = this.totalAttempts > 0 ? (this.skippedCount / this.totalAttempts) : 0;
        // Mocking attempt rate as high/low based on total relative to expectations (simplified)
        const attemptRate = FeatureNormalizer.normalize(this.totalAttempts, 0, 50);

        return {
            quizAccuracy: currentAccuracy,
            recentQuizAccuracy: this.recentQuizAccuracy,
            averageResponseTime: avgResponseTime,
            attemptRate: attemptRate,
            skipRate: skipRate,
            lessonCompletionRate: this.lessonCompletionRate,
            courseProgress: this.courseProgress,
            repeatedMistakeRate: this.repeatedMistakeRate,
            recentPerformanceTrend: this.recentPerformanceTrend,
            topicMastery: this.topicMastery,
            consecutiveCorrect: this.consecutiveCorrect,
            consecutiveIncorrect: this.consecutiveIncorrect,
            totalAttempts: this.totalAttempts
        };
    }
}

// ============================================================================
// 4. Struggle Detection Service
// ============================================================================
class StruggleDetectionService {
    constructor() {
        this.model = null;
        this.version = 'v1';
        this.thresholds = {
            MEDIUM: 0.4,
            HIGH: 0.7
        };
    }

    async init() {
        this.model = await ModelLoader.loadModel('struggle-model', this.version, this._generateBootstrap.bind(this));
    }

    async _generateBootstrap() {
        // Features (10): [quizAccuracy, recentQuizAccuracy, averageResponseTime, attemptRate, skipRate, lessonCompletionRate, courseProgress, repeatedMistakeRate, recentPerformanceTrend, topicMastery]
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 8, inputShape: [10], activation: 'relu' }));
        model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
        model.compile({ optimizer: tf.train.adam(0.01), loss: 'binaryCrossentropy' });
        
        // Synthetic data to bias weights: High struggle = low acc, slow time, high skip, low topic mastery
        const xs = tf.tensor2d([
            [1.0, 0.9, 0.1, 0.5, 0.0, 0.8, 0.8, 0.0, 0.9, 0.9], // Perfect -> 0
            [0.2, 0.3, 0.8, 0.9, 0.5, 0.2, 0.2, 0.8, 0.1, 0.2], // Struggling -> 1
            [0.6, 0.6, 0.4, 0.5, 0.1, 0.5, 0.5, 0.3, 0.5, 0.5], // Average -> 0.3
            [0.9, 0.8, 0.9, 0.2, 0.0, 0.7, 0.7, 0.1, 0.8, 0.8]  // Slow but correct -> 0.1
        ]);
        const ys = tf.tensor2d([[0], [1], [0.3], [0.1]]);
        
        await model.fit(xs, ys, { epochs: 100, verbose: 0 });
        xs.dispose();
        ys.dispose();
        return model;
    }

    /**
     * @param {Object} metrics (from LearnerStateService.getLiveMetrics)
     */
    predictStruggle(metrics) {
        if (!this.model) return null;

        // Perform inference within tf.tidy to prevent memory leaks
        const probability = tf.tidy(() => {
            const input = tf.tensor2d([[
                FeatureNormalizer.normalizePercentage(metrics.quizAccuracy),
                FeatureNormalizer.normalizePercentage(metrics.recentQuizAccuracy),
                FeatureNormalizer.normalizeResponseTime(metrics.averageResponseTime),
                FeatureNormalizer.normalizePercentage(metrics.attemptRate),
                FeatureNormalizer.normalizePercentage(metrics.skipRate),
                FeatureNormalizer.normalizePercentage(metrics.lessonCompletionRate),
                FeatureNormalizer.normalizePercentage(metrics.courseProgress),
                FeatureNormalizer.normalizePercentage(metrics.repeatedMistakeRate),
                FeatureNormalizer.normalizePercentage(metrics.recentPerformanceTrend),
                FeatureNormalizer.normalizePercentage(metrics.topicMastery)
            ]]);
            
            const prediction = this.model.predict(input);
            return prediction.dataSync()[0];
        });

        let category = 'LOW';
        if (probability >= this.thresholds.HIGH) category = 'HIGH';
        else if (probability >= this.thresholds.MEDIUM) category = 'MEDIUM';

        return { probability, category };
    }
}

// ============================================================================
// 5. Adaptive Difficulty Service
// ============================================================================
class AdaptiveDifficultyService {
    constructor() {
        this.model = null;
        this.version = 'v1';
    }

    async init() {
        this.model = await ModelLoader.loadModel('difficulty-model', this.version, this._generateBootstrap.bind(this));
    }

    async _generateBootstrap() {
        // Features (8): [accuracy, responseTime, attempts, recentAccuracy, consecutiveCorrect, consecutiveIncorrect, topicMastery, currentDifficulty]
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 8, inputShape: [8], activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
        model.compile({ optimizer: tf.train.adam(0.01), loss: 'meanSquaredError' });
        
        // Target is 1-5. 
        // Normalizations:
        // acc (0-1), time (0-1), attempts (0-1), recentAcc (0-1), consCorr (0-1 max 10), consInc (0-1 max 10), mastery (0-1), currDiff (0-1 max 5)
        const xs = tf.tensor2d([
            [1.0, 0.1, 0.2, 0.9, 0.5, 0.0, 0.9, 0.6], // Correct, fast, high streak -> + (Target: 5)
            [0.2, 0.8, 0.8, 0.3, 0.0, 0.4, 0.2, 0.6], // Wrong, slow, bad streak -> - (Target: 2)
            [0.8, 0.4, 0.5, 0.7, 0.2, 0.0, 0.7, 0.8], // Good, moderate -> = (Target: 4)
            [0.0, 0.9, 0.9, 0.1, 0.0, 0.8, 0.1, 0.2]  // Very poor -> - (Target: 1)
        ]);
        const ys = tf.tensor2d([[5], [2], [4], [1]]);
        
        await model.fit(xs, ys, { epochs: 150, verbose: 0 });
        xs.dispose();
        ys.dispose();
        return model;
    }

    /**
     * @param {Object} metrics 
     * @param {Number} currentDifficulty (1-5)
     */
    predictDifficulty(metrics, currentDifficulty) {
        if (!this.model) return currentDifficulty;

        const nextDiff = tf.tidy(() => {
            const input = tf.tensor2d([[
                FeatureNormalizer.normalizePercentage(metrics.quizAccuracy),
                FeatureNormalizer.normalizeResponseTime(metrics.averageResponseTime),
                FeatureNormalizer.normalize(metrics.totalAttempts, 0, 50),
                FeatureNormalizer.normalizePercentage(metrics.recentQuizAccuracy),
                FeatureNormalizer.normalize(metrics.consecutiveCorrect, 0, 10),
                FeatureNormalizer.normalize(metrics.consecutiveIncorrect, 0, 10),
                FeatureNormalizer.normalizePercentage(metrics.topicMastery),
                FeatureNormalizer.normalize(currentDifficulty, 1, 5)
            ]]);

            const prediction = this.model.predict(input);
            return prediction.dataSync()[0];
        });

        // Clamp between 1 and 5 and round
        return Math.max(1, Math.min(5, Math.round(nextDiff)));
    }
}

// ============================================================================
// Initialization & Global Exports
// ============================================================================
window.ML = {
    FeatureNormalizer,
    ModelLoader,
    learnerStateService: new LearnerStateService(),
    struggleService: new StruggleDetectionService(),
    difficultyService: new AdaptiveDifficultyService(),
    
    // Legacy offline event queue integration for risk events
    queueRiskEvent: function(quizId, courseId, topic, riskData) {
        if (!window.OfflineTracker) {
            console.warn('OfflineTracker not available');
            return;
        }

        const event = {
            quizId,
            courseId,
            topic: topic || riskData.weakTopic || 'General',
            riskProbability: riskData.probability,
            riskLevel: riskData.category,
            modelVersion: '1.0.0'
        };
        
        window.OfflineTracker.enqueueRiskEvent(event);
    },

    initAll: async function() {
        console.log('[ML] Initializing TensorFlow.js Adaptive Engine...');
        await Promise.all([
            this.struggleService.init(),
            this.difficultyService.init()
        ]);
        console.log('[ML] Models loaded and ready.');
    }
};

// Auto-sync existing risk events on load if online
window.addEventListener('online', () => {
    // Just trigger a mock queue event to fire sync loop
    if (window.ML && window.ML.queueRiskEvent) {
        // We do a manual sweep of existing items
        let syncQueue = JSON.parse(localStorage.getItem('adaptiveSyncQueue')) || [];
        if (syncQueue.length > 0) {
            window.ML.queueRiskEvent(syncQueue[0].quizId, syncQueue[0]); // will trigger flush
        }
    }
});
