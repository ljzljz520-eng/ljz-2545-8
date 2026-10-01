// 离线导览包：带版本清单的分块下载。
// 铁律：任何一块缺失或哈希不符，整个包都不得视为完整可用。
// 旧包"回灌"（导入更低版本清单）一律拒绝，不做静默降级。

function parseVersion(v) {
  return v.split('.').map((n) => parseInt(n, 10));
}
export function compareVersion(a, b) {
  const [a1, a2, a3] = parseVersion(a);
  const [b1, b2, b3] = parseVersion(b);
  return (a1 - b1) || (a2 - b2) || (a3 - b3);
}

export function findManifestVersion(manifest, version) {
  return manifest.versions.find((v) => v.version === version) || null;
}

// 评估一次导入/更新操作
// mode: 'full' 整包 | 'delta' 增量（必须基于 parentVersion）
export function evaluateImport({ manifest, toVersion, mode, currentVersion = null }) {
  const target = findManifestVersion(manifest, toVersion);
  if (!target) return { accepted: false, reason: `清单中不存在版本 ${toVersion}` };

  if (currentVersion) {
    if (compareVersion(toVersion, currentVersion) <= 0) {
      return {
        accepted: false,
        code: 'stale_rollback',
        reason: `旧包回灌被拒绝：导入版本 ${toVersion} 不高于已装版本 ${currentVersion}。离线数据不允许静默降级。`,
        currentVersion, toVersion,
      };
    }
  }

  if (mode === 'delta') {
    const parent = target.parentVersion;
    if (!parent) return { accepted: false, reason: '增量包缺少 parentVersion 声明' };
    if (!currentVersion) return { accepted: false, reason: '无已装基线版本，不能应用增量包，请先下载整包' };
    if (parent !== currentVersion) {
      return { accepted: false, code: 'delta_base_mismatch',
        reason: `增量包基线为 ${parent}，当前为 ${currentVersion}，不匹配，请下载完整包。` };
    }
  }

  return {
    accepted: true, mode, toVersion,
    parentVersion: target.parentVersion || null,
    chunks: target.chunks.map((c) => ({ id: c.id, file: c.file, size: c.size, sha256: c.sha256 })),
    notes: target.notes || '',
    createdAt: target.createdAt,
  };
}

// 本地存储（浏览器 localStorage 或测试内存）。块状态：missing -> fetched -> verified
export function createStore(backend) {
  let state = backend.load()
    || { packageId: null, version: null, chunks: {}, usable: false };

  const save = () => backend.save(state);

  return {
    beginImport(decision) {
      // 先登记目标清单与所需块，全部初始为 missing（此刻绝不可用）
      state = {
        packageId: 'qianxi-guide',
        version: decision.toVersion,
        previousVersion: state.version,
        chunks: Object.fromEntries(decision.chunks.map((c) => [c.id, { status: 'missing', expectedSha256: c.sha256 }])),
        usable: false,
        startedAt: new Date(0).toISOString(),
      };
      save();
    },
    applyChunk(chunkId, actualSha256) {
      const c = state.chunks[chunkId];
      if (!c) return { ok: false, reason: `清单中不存在块 ${chunkId}` };
      if (c.status === 'verified' && c.expectedSha256 === actualSha256) return { ok: true, status: 'verified' };
      if (actualSha256 !== c.expectedSha256) {
        c.status = 'corrupt';
        c.actualSha256 = actualSha256;
        state.usable = false;
        save();
        return { ok: false, status: 'corrupt', reason: `块 ${chunkId} 校验和不符，已隔离，不得使用` };
      }
      c.status = 'verified';
      c.actualSha256 = actualSha256;
      state.usable = false; // 单块到达不改变整包可用性
      save();
      return { ok: true, status: 'verified' };
    },
    // 仅当清单要求的每一块都 verified 才允许置为可用
    finalize(requiredChunkIds) {
      const missing = requiredChunkIds.filter((id) => state.chunks[id]?.status !== 'verified');
      if (missing.length) {
        state.usable = false;
        save();
        return { usable: false, missing, reason: `缺块 ${missing.join('、')}；缺块的导览包不得当作完整可用。` };
      }
      state.usable = true;
      save();
      return { usable: true, missing: [] };
    },
    snapshot() { return JSON.parse(JSON.stringify(state)); },
  };
}

// 无状态评估：给定快照与目标清单，判定可用性与缺块
export function assessStore(snapshot, decision) {
  const required = decision.chunks.map((c) => c.id);
  const missing = required.filter((id) => snapshot.chunks?.[id]?.status !== 'verified');
  const corrupt = required.filter((id) => snapshot.chunks?.[id]?.status === 'corrupt');
  return {
    usable: missing.length === 0 && corrupt.length === 0 && snapshot.version === decision.toVersion,
    missing, corrupt,
    required,
    message: missing.length
      ? `分块下载不完整（缺：${missing.join('、')}），离线导览保持不可用。`
      : corrupt.length
        ? `存在校验失败块（${corrupt.join('、')}），已拒绝启用。`
        : '全部块校验通过，离线导览可用。',
  };
}
