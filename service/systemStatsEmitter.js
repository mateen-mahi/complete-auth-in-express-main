import si from "systeminformation";
import { notifySystemStats } from "./adminEvents.js";

let interval = null;

async function collectAndEmit() {
  try {
    const [cpu, currentLoad, mem, fsSize, networkStats, time] = await Promise.all([
      si.cpu(),
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.time(),
    ]);

    const totalDiskUsed = fsSize.reduce((s, d) => s + d.used, 0);
    const totalDiskSize = fsSize.reduce((s, d) => s + d.size, 0);

    notifySystemStats({
      cpu: {
        usagePercent: currentLoad.currentLoad,
        cores: cpu.cores,
        model: `${cpu.manufacturer} ${cpu.brand}`,
        speedGHz: cpu.speed,
        perCore: currentLoad.cpus?.map((c, i) => ({ core: i, usagePercent: c.load })),
      },
      memory: {
        usedMB: mem.active / 1024 / 1024,
        totalMB: mem.total / 1024 / 1024,
        usagePercent: (mem.active / mem.total) * 100,
        swap: mem.swaptotal
          ? {
              usedMB: mem.swapused / 1024 / 1024,
              totalMB: mem.swaptotal / 1024 / 1024,
              usagePercent: (mem.swapused / mem.swaptotal) * 100,
            }
          : undefined,
      },
      disk: {
        usedGB: totalDiskUsed / 1024 / 1024 / 1024,
        totalGB: totalDiskSize / 1024 / 1024 / 1024,
        usagePercent: totalDiskSize ? (totalDiskUsed / totalDiskSize) * 100 : 0,
        partitions: fsSize.map((d) => ({
          mount: d.mount,
          fs: d.type,
          usedGB: d.used / 1024 / 1024 / 1024,
          totalGB: d.size / 1024 / 1024 / 1024,
          usagePercent: d.use,
        })),
      },
      network: {
        interfaces: networkStats.map((n) => ({
          name: n.iface,
          rxKbps: n.rx_sec ? n.rx_sec / 1024 : 0,
          txKbps: n.tx_sec ? n.tx_sec / 1024 : 0,
        })),
      },
      process: {
        pid: process.pid,
        uptimeSeconds: process.uptime(),
        heapUsedMB: process.memoryUsage().heapUsed / 1024 / 1024,
        heapTotalMB: process.memoryUsage().heapTotal / 1024 / 1024,
        rssMB: process.memoryUsage().rss / 1024 / 1024,
      },
      uptimeSeconds: time.uptime,
      os: { platform: process.platform, arch: process.arch, hostname: cpu.socket || undefined },
    });
  } catch (err) {
    console.error("[SystemStats] Failed to collect/emit:", err.message);
  }
}

export const startSystemStatsEmitter = (intervalMs = 4000) => {
  if (interval) return; // already running
  interval = setInterval(collectAndEmit, intervalMs);
  collectAndEmit(); 
};

export const stopSystemStatsEmitter = () => {
  clearInterval(interval);
  interval = null;
};
