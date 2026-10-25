export class PanelSessions<T> {
  private panels = new Set<T>();
  private paused = new Set<T>();
  get size() {
    return this.panels.size;
  }
  get hasActive() {
    return [...this.active()].length > 0;
  }
  add(panel: T) {
    this.panels.add(panel);
  }
  delete(panel: T) {
    this.panels.delete(panel);
    this.paused.delete(panel);
  }
  pause(panel: T) {
    if (this.panels.has(panel)) this.paused.add(panel);
  }
  resume(panel: T) {
    this.paused.delete(panel);
  }
  isPaused(panel: T) {
    return this.paused.has(panel);
  }
  *active() {
    for (const panel of this.panels) if (!this.paused.has(panel)) yield panel;
  }
}
