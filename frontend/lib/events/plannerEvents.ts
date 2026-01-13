// Event system for planner synchronization
// This allows components to trigger planner updates without direct coupling

type PlannerEventType = 'SYNC_WITH_MUESTREOS' | 'SYNC_WITH_CALCULOS';

interface PlannerEvent {
  type: PlannerEventType;
  data?: any;
}

class PlannerEventEmitter {
  private listeners: Map<PlannerEventType, Set<(data?: any) => void>>;

  constructor() {
    this.listeners = new Map();
  }

  on(event: PlannerEventType, callback: (data?: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: PlannerEventType, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Método conveniente para sincronizar con muestreos
  syncWithMuestreos() {
    console.log('📢 Emitiendo evento SYNC_WITH_MUESTREOS');
    this.emit('SYNC_WITH_MUESTREOS');
  }

  // Método conveniente para sincronizar con cálculos
  syncWithCalculos() {
    console.log('📢 Emitiendo evento SYNC_WITH_CALCULOS');
    this.emit('SYNC_WITH_CALCULOS');
  }
}

// Singleton instance
export const plannerEvents = new PlannerEventEmitter();