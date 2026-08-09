/**
 * OfflineTracker - IndexedDB-based queue for LearningEvents
 * Enqueues events locally and syncs them to the backend when online.
 */

class OfflineTracker {
    constructor() {
        this.dbName = 'EduSmartOfflineDB';
        this.storeName = 'learningEvents';
        this.riskStoreName = 'riskEvents';
        this.dbVersion = 2; // Upgraded version for risk events
        this.db = null;
        this.syncInProgress = false;

        this.init();

        // Listen for online events to flush sync queue
        window.addEventListener('online', () => this.syncEvents());
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'eventId' });
                }
                if (!db.objectStoreNames.contains(this.riskStoreName)) {
                    db.createObjectStore(this.riskStoreName, { keyPath: 'eventId' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
                // Attempt sync on load if online
                if (navigator.onLine) {
                    this.syncEvents();
                }
            };

            request.onerror = (event) => {
                console.error('IndexedDB init error:', event.target.errorCode);
                reject(event.target.error);
            };
        });
    }

    // Generate a simple UUID v4 (if crypto.randomUUID is unavailable, fall back)
    generateUUID() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async enqueue(eventData) {
        if (!this.db) await this.init();

        const event = {
            eventId: this.generateUUID(),
            ...eventData
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(event);

            request.onsuccess = () => {
                resolve(event.eventId);
                // Attempt to sync immediately
                this.syncEvents();
            };

            request.onerror = (e) => {
                console.error('Failed to enqueue learning event:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    async enqueueRiskEvent(eventData) {
        if (!this.db) await this.init();

        const event = {
            eventId: this.generateUUID(),
            createdAt: new Date().toISOString(),
            ...eventData
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.riskStoreName], 'readwrite');
            const store = transaction.objectStore(this.riskStoreName);
            const request = store.add(event);

            request.onsuccess = () => {
                resolve(event.eventId);
                // Attempt to sync immediately
                this.syncRiskEvents();
            };

            request.onerror = (e) => {
                console.error('Failed to enqueue risk event:', e.target.error);
                reject(e.target.error);
            };
        });
    }
    
    // Update existing events (e.g., mark as quizCompleted)
    async updateEvents(predicate, updateFn) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = (e) => {
                const events = e.target.result;
                events.forEach(ev => {
                    if (predicate(ev)) {
                        const updated = updateFn(ev);
                        store.put(updated);
                    }
                });
                resolve();
                this.syncEvents();
            };
            
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getAllEvents() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async deleteEvents(eventIds) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            eventIds.forEach(id => store.delete(id));

            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e.target.error);
        });
    }

    async getAllRiskEvents() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.riskStoreName], 'readonly');
            const store = transaction.objectStore(this.riskStoreName);
            const request = store.getAll();

            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async deleteRiskEvents(eventIds) {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.riskStoreName], 'readwrite');
            const store = transaction.objectStore(this.riskStoreName);

            eventIds.forEach(id => store.delete(id));

            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e.target.error);
        });
    }

    async syncEvents() {
        if (!navigator.onLine || this.syncInProgress) return;
        this.syncInProgress = true;

        try {
            const events = await this.getAllEvents();
            if (events.length > 0) {
                const res = await fetch('/api/ml/sync-events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.syncedIds && data.syncedIds.length > 0) {
                        await this.deleteEvents(data.syncedIds);
                    }
                } else {
                    console.warn('Learning events sync API returned an error:', res.status);
                }
            }
        } catch (error) {
            console.warn('Failed to sync offline learning events. Will retry later.', error);
        } finally {
            this.syncInProgress = false;
        }
        
        // Also try to sync risk events
        this.syncRiskEvents();
    }

    async syncRiskEvents() {
        if (!navigator.onLine) return;

        try {
            const riskEvents = await this.getAllRiskEvents();
            if (riskEvents.length === 0) return;

            const res = await fetch('/api/ml/sync-risk-events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ riskEvents })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.syncedIds && data.syncedIds.length > 0) {
                    await this.deleteRiskEvents(data.syncedIds);
                }
            } else {
                console.warn('Risk events sync API returned an error:', res.status);
            }
        } catch (error) {
            console.warn('Failed to sync offline risk events. Will retry later.', error);
        }
    }
}

window.OfflineTracker = new OfflineTracker();
