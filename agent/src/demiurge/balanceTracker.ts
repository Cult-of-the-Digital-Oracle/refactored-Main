export class BalanceTracker {
  private history: Array<'good' | 'evil'> = []; // rolling window of up to 10 events

  constructor() {}

  /**
   * Records a divine tool execution polarity.
   */
  record(polarity: 'good' | 'evil'): void {
    this.history.push(polarity);
    if (this.history.length > 10) {
      this.history.shift();
    }
  }

  /**
   * Returns forced polarity if there's an imbalance, to enforce 50/50 ratio.
   * If the absolute difference is > 1, we force the opposite to balance it out.
   */
  getForcedPolarity(): 'good' | 'evil' | 'free' {
    if (this.history.length === 0) return 'free';

    let goodCount = 0;
    let evilCount = 0;
    this.history.forEach(p => {
      if (p === 'good') goodCount++;
      else if (p === 'evil') evilCount++;
    });

    const diff = goodCount - evilCount;
    if (diff > 1) {
      return 'evil'; // Force evil to balance
    } else if (diff < -1) {
      return 'good'; // Force good to balance
    }

    return 'free';
  }

  /**
   * Returns details of current good/evil balance.
   */
  getBalance(): { good: number; evil: number; last10: Array<'good' | 'evil'> } {
    let good = 0;
    let evil = 0;
    this.history.forEach(p => {
      if (p === 'good') good++;
      else if (p === 'evil') evil++;
    });

    return {
      good,
      evil,
      last10: [...this.history]
    };
  }

  /**
   * Serialize history for disk persistence.
   */
  serialize(): string[] {
    return [...this.history];
  }

  /**
   * Load history from serialized data.
   */
  deserialize(data: string[]): void {
    if (Array.isArray(data)) {
      this.history = data.filter(p => p === 'good' || p === 'evil') as Array<'good' | 'evil'>;
    } else {
      this.history = [];
    }
  }
}
