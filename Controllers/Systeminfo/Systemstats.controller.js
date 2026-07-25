import si from "systeminformation";

// GET /admin/system-stats
// Returns the same shape systemStatsEmitter.js broadcasts over the socket —
// this REST endpoint is only for the initial page-load fetch (before the
// first "system:stats" socket tick arrives).
export const getSystemStats = async (req, res) => {
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

    const stats = {
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
    };

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.log("Error in get system stats api: ", error);
    return res.status(500).json({ success: false, message: "Server error while fetching system stats" });
  }
};