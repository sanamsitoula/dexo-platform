import { Injectable, Logger } from '@nestjs/common';

export interface ZkPunch {
  deviceUid: string; // user id on the device
  timestamp: Date;
}

export interface ZkDeviceConfig {
  ip: string;
  port: number;
  timeoutSec: number;
  forceUdp?: boolean;
  commKey?: string | null;
}

/**
 * Talks the ZKTeco push/pull protocol (TCP port 4370, UDP for older models
 * such as the iFace302) via node-zklib — the Node equivalent of pyzk used by
 * the reference ZKTecoAttendancePuller project.
 *
 * Set ZK_MOCK=true to generate sample punches without a physical device
 * (local development / demo tenants).
 */
@Injectable()
export class ZkPullerService {
  private readonly logger = new Logger(ZkPullerService.name);

  get mockMode(): boolean {
    return process.env.ZK_MOCK === 'true';
  }

  async pullAttendance(cfg: ZkDeviceConfig, knownUids: string[] = []): Promise<ZkPunch[]> {
    if (this.mockMode) return this.mockPunches(knownUids);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ZKLib = require('node-zklib');
    const timeoutMs = (cfg.timeoutSec || 10) * 1000;
    // node-zklib signature: (ip, port, timeout, inport). UDP fallback is handled
    // internally by the lib via functionality selection; forceUdp devices use
    // the same constructor (the lib probes UDP when TCP fails).
    const zk = new ZKLib(cfg.ip, cfg.port || 4370, timeoutMs, 4000 + Math.floor(Math.random() * 1000));
    try {
      await zk.createSocket();
      const logs = await zk.getAttendances();
      const rows: any[] = logs?.data ?? [];
      return rows
        .map((r) => ({
          deviceUid: String(r.deviceUserId ?? r.uid ?? r.userId ?? ''),
          timestamp: new Date(r.recordTime ?? r.timestamp),
        }))
        .filter((p) => p.deviceUid && !isNaN(p.timestamp.getTime()));
    } finally {
      await zk.disconnect().catch(() => undefined);
    }
  }

  async testConnection(cfg: ZkDeviceConfig): Promise<{ ok: boolean; info?: any; error?: string }> {
    if (this.mockMode) return { ok: true, info: { mock: true, model: 'MOCK-K40' } };
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ZKLib = require('node-zklib');
      const zk = new ZKLib(cfg.ip, cfg.port || 4370, (cfg.timeoutSec || 10) * 1000, 4000);
      await zk.createSocket();
      const info = await zk.getInfo().catch(() => null);
      await zk.disconnect().catch(() => undefined);
      return { ok: true, info };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  /** Deterministic-ish sample punches for the last 3 days for known device uids. */
  private mockPunches(knownUids: string[]): ZkPunch[] {
    const uids = knownUids.length ? knownUids : ['1', '2', '3', '4', '5'];
    const punches: ZkPunch[] = [];
    const now = new Date();
    for (let day = 0; day < 3; day++) {
      for (let u = 0; u < uids.length; u++) {
        const morningIn = new Date(now);
        morningIn.setDate(now.getDate() - day);
        morningIn.setHours(6 + (u % 4), 10 + u * 3, 0, 0);
        const eveningOut = new Date(morningIn.getTime() + (60 + (u % 3) * 30) * 60000);
        punches.push({ deviceUid: uids[u], timestamp: morningIn });
        punches.push({ deviceUid: uids[u], timestamp: eveningOut });
      }
    }
    this.logger.log(`[ZK_MOCK] generated ${punches.length} sample punches`);
    return punches;
  }
}
