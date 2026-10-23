// Spider Manager - Coordinates the canvas spider animation
import { logger } from '../utils/logger.js';
import type { SpiderState } from '../../shared/types/index.js';

export class SpiderManager {
  private state: SpiderState = {
    mode: 'idle',
    position: { x: 0, y: 0 },
    legs: Array.from({ length: 8 }, (_, i) => ({
      segments: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
      target: { x: 0, y: 0 },
      phase: i * (Math.PI / 4),
    })),
  };
  private scanTargets: { x: number; y: number; width: number; height: number; moduleId: string }[] = [];
  private currentTargetIndex = 0;
  private animationFrame: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    logger.info('Spider Manager initialized');
  }

  setState(mode: SpiderState['mode']): void {
    this.state.mode = mode;
    this.broadcastState();
  }

  getState(): SpiderState {
    return { ...this.state };
  }

  setScanTargets(targets: { x: number; y: number; width: number; height: number; moduleId: string }[]): void {
    this.scanTargets = targets;
    this.currentTargetIndex = 0;
  }

  async startScan(): Promise<void> {
    if (this.scanTargets.length === 0) return;

    this.state.mode = 'scan';
    this.broadcastState();
    await this.animateScan();
  }

  private async animateScan(): Promise<void> {
    if (this.state.mode !== 'scan' || this.currentTargetIndex >= this.scanTargets.length) {
      this.state.mode = 'done';
      this.broadcastState();
      // Return to idle after delay
      setTimeout(() => {
        this.state.mode = 'idle';
        this.broadcastState();
      }, 1000);
      return;
    }

    const target = this.scanTargets[this.currentTargetIndex];
    const centerX = target.x + target.width / 2;
    const centerY = target.y + target.height / 2;

    // Animate spider to target
    await this.moveTo(centerX, centerY);

    // Pulse at target
    this.broadcastPulse(target.moduleId);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));

    this.currentTargetIndex++;
    await this.animateScan();
  }

  private async moveTo(x: number, y: number): Promise<void> {
    const startX = this.state.position.x;
    const startY = this.state.position.y;
    const duration = 800; // ms
    const startTime = Date.now();

    return new Promise(resolve => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeInOutCubic(progress);

        this.state.position.x = startX + (x - startX) * eased;
        this.state.position.y = startY + (y - startY) * eased;

        this.updateLegs();
        this.broadcastState();

        if (progress < 1) {
          // Use setTimeout instead of requestAnimationFrame for Node.js compatibility
          this.animationFrame = setTimeout(animate, 16);
        } else {
          resolve();
        }
      };
      animate();
    });
  }

  private updateLegs(): void {
    const bodyX = this.state.position.x;
    const bodyY = this.state.position.y;
    const legLength = 40;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const targetX = bodyX + Math.cos(angle) * 60;
      const targetY = bodyY + Math.sin(angle) * 60;

      // Inverse kinematics (2-bone)
      const dx = targetX - bodyX;
      const dy = targetY - bodyY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxReach = legLength * 2;

      if (dist > maxReach) {
        // Stretch
        const scale = maxReach / dist;
        this.state.legs[i].segments[0] = {
          x: bodyX + dx * 0.5 * scale,
          y: bodyY + dy * 0.5 * scale,
        };
        this.state.legs[i].segments[1] = { x: targetX, y: targetY };
      } else {
        // Normal IK
        const kneeAngle = Math.acos(Math.min(dist / maxReach, 1));
        const baseAngle = Math.atan2(dy, dx);
        const kneeX = bodyX + Math.cos(baseAngle) * legLength * Math.cos(kneeAngle);
        const kneeY = bodyY + Math.sin(baseAngle) * legLength * Math.cos(kneeAngle);

        this.state.legs[i].segments[0] = { x: kneeX, y: kneeY };
        this.state.legs[i].segments[1] = { x: targetX, y: targetY };
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private broadcastState(): void {
    // Send to renderer via IPC
    // This would be called from the main process IPC handler
  }

  private broadcastPulse(moduleId: string): void {
    // Send pulse event to renderer
  }

  idle(): void {
    this.state.mode = 'idle';
    this.broadcastState();
  }

  error(): void {
    this.state.mode = 'error';
    this.broadcastState();
  }

  async destroy(): Promise<void> {
    if (this.animationFrame) {
      clearTimeout(this.animationFrame);
    }
  }
}