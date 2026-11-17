/**
 * SMART CLASS ROOM - HARDWARE MONITOR JAVASCRIPT
 * Real-time Hardware Telemetry, Camera Management, and Interactive HUD
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. STATE & DATA INITIALIZATION
  // =========================================================================
  const state = {
    cpuHistory: [25, 28, 24, 30, 27, 26, 32, 29, 28, 31, 26, 28, 34, 30, 27, 28],
    activeCameraFilter: 'all',
    activeLogFilter: 'all',
    isScanning: false,
    pollIntervalMs: 2500,
    pollTimer: null
  };

  // =========================================================================
  // 2. LIVE CLOCK (WIB / Local Indonesian Format)
  // =========================================================================
  const clockElement = document.getElementById('live-clock');
  const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthsOfYear = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  function updateLiveClock() {
    if (!clockElement) return;
    const now = new Date();
    const dayName = daysOfWeek[now.getDay()];
    const dateNum = String(now.getDate()).padStart(2, '0');
    const monthName = monthsOfYear[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    clockElement.textContent = `${dayName}, ${dateNum} ${monthName} ${year} • ${hours}:${minutes}:${seconds} WIB`;
  }
  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  // =========================================================================
  // 3. TOAST NOTIFICATION ENGINE
  // =========================================================================
  const toastContainer = document.getElementById('toast-container') || createToastContainer();

  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  function showToast(message, type = 'info', title = null) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check_circle';
    if (type === 'error') iconName = 'error';
    if (type === 'warning') iconName = 'warning';

    toast.innerHTML = `
      <span class="material-symbols-outlined text-[20px] toast-icon">${iconName}</span>
      <div class="flex flex-col min-w-0">
        ${title ? `<span class="font-bold text-xs leading-none mb-0.5">${title}</span>` : ''}
        <span class="text-xs leading-tight text-on-surface">${message}</span>
      </div>
    `;

    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3800);
  }

  // =========================================================================
  // 4. REAL-TIME SYSTEM TELEMETRY POLLING
  // =========================================================================
  async function fetchSystemTelemetry() {
    try {
      const response = await fetch('/api/system');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();

      if (data.performance) {
        updatePerformanceMetrics(data.performance);
      }
      if (data.system) {
        updateSystemInfo(data.system);
      }
    } catch (err) {
      console.warn('Gagal memperbarui telemetri:', err);
    }
  }

  function updatePerformanceMetrics(perf) {
    const cpuUsage = Math.round(perf.cpu_usage || 0);
    const ramUsage = Math.round(perf.ram_usage || 0);
    const ramUsed = (perf.ram_used || 0).toFixed(1);
    const ramTotal = (perf.ram_total || 0).toFixed(1);

    // Update CPU Text & Progress Bar
    const cpuPercentText = document.getElementById('cpu-percent-text');
    const cpuProgressBar = document.getElementById('cpu-progress-bar');
    const cpuCoreInfo = document.getElementById('cpu-core-info');
    if (cpuPercentText) cpuPercentText.textContent = `${cpuUsage}%`;
    if (cpuProgressBar) cpuProgressBar.style.width = `${Math.min(100, Math.max(0, cpuUsage))}%`;
    if (cpuCoreInfo && perf.cpu_freq_ghz) {
      cpuCoreInfo.textContent = `Clock: ${perf.cpu_freq_ghz} GHz`;
    }

    // Update RAM Text & Progress Bar
    const ramUsedText = document.getElementById('ram-used-text');
    const ramTotalInfo = document.getElementById('ram-total-info');
    const ramProgressBar = document.getElementById('ram-progress-bar');
    if (ramUsedText) ramUsedText.textContent = `${ramUsed} GB`;
    if (ramTotalInfo) ramTotalInfo.textContent = `/ ${ramTotal} GB (${ramUsage}%)`;
    if (ramProgressBar) ramProgressBar.style.width = `${Math.min(100, Math.max(0, ramUsage))}%`;

    // Update Suhu Prosesor
    const cpuTempText = document.getElementById('cpu-temp-text');
    if (cpuTempText && perf.cpu_temp) {
      cpuTempText.textContent = `${Math.round(perf.cpu_temp)}°C`;
    }

    // Update Uptime
    if (perf.uptime) {
      const daysEl = document.getElementById('system-uptime-days');
      const hoursEl = document.getElementById('system-uptime-hours');
      const topUptimeEl = document.getElementById('metric-uptime');
      if (daysEl) daysEl.textContent = `${perf.uptime.days} Hari`;
      if (hoursEl) hoursEl.textContent = `${perf.uptime.hours} Jam ${perf.uptime.minutes}M`;
      if (topUptimeEl) topUptimeEl.textContent = `Uptime: ${perf.uptime.days}H ${perf.uptime.hours}J`;
    }

    // Update CPU Load SVG Chart
    updateCpuChart(cpuUsage);
  }

  function updateSystemInfo(sys) {
    const osEl = document.getElementById('info-os');
    const procEl = document.getElementById('info-processor');
    const ramEl = document.getElementById('info-ram-total');
    const nodeEl = document.getElementById('info-node-id');

    if (osEl && sys.operating_system) osEl.textContent = sys.operating_system;
    if (procEl && sys.processor) procEl.textContent = sys.processor;
    if (ramEl && sys.ram_total) ramEl.textContent = `${sys.ram_total} GB DDR (Tersedia)`;
    if (nodeEl && sys.hostname) nodeEl.textContent = sys.hostname;
  }

  // =========================================================================
  // 5. DYNAMIC SVG CPU CHART RENDERER
  // =========================================================================
  function updateCpuChart(newValue) {
    state.cpuHistory.push(newValue);
    if (state.cpuHistory.length > 20) {
      state.cpuHistory.shift();
    }

    const minVal = Math.min(...state.cpuHistory);
    const maxVal = Math.max(...state.cpuHistory);
    const minMaxLabel = document.getElementById('cpu-chart-minmax');
    if (minMaxLabel) {
      minMaxLabel.textContent = `Min ${minVal}% • Max ${maxVal}%`;
    }

    const svgPath = document.getElementById('cpu-chart-path');
    const svgArea = document.getElementById('cpu-chart-area');
    const svgMarker = document.getElementById('cpu-chart-marker');

    if (!svgPath) return;

    // Koordinat ViewBox: 0..300 width, 0..60 height
    const width = 300;
    const height = 60;
    const padding = 6;
    const count = state.cpuHistory.length;
    const stepX = width / (count - 1);

    // Normalisasi nilai CPU (0-100) ke tinggi koordinat SVG (inversi Y)
    const points = state.cpuHistory.map((val, idx) => {
      const x = idx * stepX;
      const normalized = Math.min(100, Math.max(0, val));
      const y = height - padding - (normalized / 100) * (height - 2 * padding);
      return { x, y };
    });

    // Buat smooth path SVG
    let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx.toFixed(1)},${prev.y.toFixed(1)} ${cx.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
    }

    svgPath.setAttribute('d', d);

    if (svgArea) {
      const areaD = `${d} L ${width},${height} L 0,${height} Z`;
      svgArea.setAttribute('d', areaD);
    }

    if (svgMarker) {
      const lastPoint = points[points.length - 1];
      svgMarker.setAttribute('cx', lastPoint.x);
      svgMarker.setAttribute('cy', lastPoint.y);
    }
  }

  // =========================================================================
  // 5B. REAL-TIME AI SURVEILLANCE POLLING (YOLOv11n, Kontur, SSIM, Color)
  // =========================================================================
  async function fetchCameraTelemetry() {
    try {
      const response = await fetch('/api/cameras');
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.cameras) {
        data.cameras.forEach(cam => {
          if (cam.surveillance) {
            updateSurveillanceBadges(cam.id, cam.surveillance);
          }
          if (cam.id === 1) {
            updateAttendanceBadges(cam);
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }

  function updateAttendanceBadges(cam) {
    const faceEl = document.getElementById('ai-face-status');
    const attEl = document.getElementById('ai-attendance-status');
    if (faceEl && cam.status === 'connected') {
      faceEl.textContent = 'Aktif / Memindai';
      faceEl.className = 'text-secondary font-bold truncate';
    }
    if (attEl && cam.status === 'connected') {
      attEl.textContent = 'Tercatat [99%]';
      attEl.className = 'text-on-surface font-bold truncate';
    }
  }

  function updateSurveillanceBadges(camId, s) {
    const yoloEl = document.getElementById(`ai-yolo-${camId}`);
    const contourEl = document.getElementById(`ai-contour-${camId}`);
    const ssimEl = document.getElementById(`ai-ssim-${camId}`);
    const colorEl = document.getElementById(`ai-color-${camId}`);

    if (yoloEl) {
      if (s.yolo_active) {
        let txt = `${s.person_count} Siswa`;
        if (s.phone_detected > 0) txt += `, ${s.phone_detected} HP`;
        yoloEl.textContent = txt;
        yoloEl.className = s.person_count > 0 ? 'text-primary font-bold truncate' : 'text-on-surface font-medium truncate';
      } else {
        yoloEl.textContent = 'YOLOv11 Aktif';
      }
    }

    if (contourEl) {
      contourEl.textContent = `${s.contour_count} (${s.motion_intensity})`;
      contourEl.className = s.motion_detected ? 'text-tertiary font-bold truncate' : 'text-on-surface font-medium truncate';
    }

    if (ssimEl) {
      const pct = Math.round(s.ssim_score * 100);
      ssimEl.textContent = `${pct}% (${s.ssim_status})`;
      if (s.ssim_score >= 0.85) {
        ssimEl.className = 'text-secondary font-bold truncate';
      } else if (s.ssim_score >= 0.65) {
        ssimEl.className = 'text-warning font-bold truncate';
      } else {
        ssimEl.className = 'text-error font-bold truncate';
      }
    }

    if (colorEl) {
      colorEl.textContent = `${s.color_tone} (${s.avg_brightness})`;
    }
  }

  // Polling awal dan berkala
  fetchSystemTelemetry();
  state.pollTimer = setInterval(fetchSystemTelemetry, state.pollIntervalMs);
  fetchCameraTelemetry();
  setInterval(fetchCameraTelemetry, 2000);

  // =========================================================================
  // 6. CAMERA FILTERING (Semua, Aktif, Terputus)
  // =========================================================================
  const cameraCards = document.querySelectorAll('.camera-feed-card');
  const cameraFilterButtons = document.querySelectorAll('[data-filter-btn]');

  cameraFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter-btn');
      state.activeCameraFilter = filter;

      // Update active state visual
      cameraFilterButtons.forEach(b => {
        b.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-semibold');
        b.classList.add('text-on-surface-variant');
      });
      btn.classList.add('bg-primary-container', 'text-on-primary-container', 'font-semibold');
      btn.classList.remove('text-on-surface-variant');

      // Filter cards
      cameraCards.forEach(card => {
        const cardStatus = card.getAttribute('data-camera-status');
        const cardRole = card.getAttribute('data-camera-role');
        if (filter === 'all') {
          card.style.display = 'flex';
        } else if (filter === 'presensi' && cardRole === 'presensi') {
          card.style.display = 'flex';
        } else if (filter === 'pengawasan' && cardRole === 'pengawasan') {
          card.style.display = 'flex';
        } else if (filter === 'active' && cardStatus === 'connected') {
          card.style.display = 'flex';
        } else if (filter === 'disconnected' && cardStatus === 'disconnected') {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // =========================================================================
  // 7. PINDAI ULANG PORT USB (Scan Hardware)
  // =========================================================================
  const btnScanPort = document.getElementById('btn-scan-port');
  if (btnScanPort) {
    btnScanPort.addEventListener('click', async () => {
      if (state.isScanning) return;
      state.isScanning = true;

      const icon = btnScanPort.querySelector('.material-symbols-outlined');
      const textSpan = btnScanPort.querySelector('span:not(.material-symbols-outlined)');
      
      if (icon) icon.classList.add('animate-spin-fast');
      btnScanPort.disabled = true;
      btnScanPort.classList.add('opacity-75');
      if (textSpan) textSpan.textContent = 'Memindai Port...';

      try {
        const res = await fetch('/api/scan-cameras', { method: 'POST' });
        const result = await res.json();

        if (result.status === 'success') {
          // Update counters
          const scan = result.scan_result;
          const totalEl = document.getElementById('metric-total-cameras');
          const connEl = document.getElementById('metric-connected-cameras');
          const discEl = document.getElementById('metric-disconnected-cameras');

          if (totalEl) totalEl.innerHTML = `${scan.total} <span class="font-headline-sm text-headline-sm text-on-surface-variant font-medium">Kamera</span>`;
          if (connEl) connEl.innerHTML = `${scan.connected} <span class="font-headline-sm text-headline-sm text-secondary font-medium">Aktif</span>`;
          if (discEl) {
            if (scan.disconnected === 0) {
              discEl.innerHTML = `0 <span class="font-headline-sm text-headline-sm text-secondary font-medium">Offline</span>`;
            } else {
              discEl.innerHTML = `${scan.disconnected} <span class="font-headline-sm text-headline-sm text-error font-medium">Offline</span>`;
            }
          }

          // Tambahkan ke log stream
          if (result.latest_log) {
            appendTerminalLog(result.latest_log);
          }

          showToast(scan.message, 'success', 'Pemindaian Selesai');
        }
      } catch (err) {
        showToast('Gagal memindai port: ' + err.message, 'error', 'Kesalahan Hardware');
      } finally {
        setTimeout(() => {
          if (icon) icon.classList.remove('animate-spin-fast');
          btnScanPort.disabled = false;
          btnScanPort.classList.remove('opacity-75');
          if (textSpan) textSpan.textContent = 'Pindai Ulang Port';
          state.isScanning = false;
        }, 500);
      }
    });
  }

  // =========================================================================
  // 8. LOG ACTIVITY STREAM & FILTERING
  // =========================================================================
  const logTerminal = document.getElementById('log-terminal-container');
  const logFilterButtons = document.querySelectorAll('[data-log-filter]');

  logFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-log-filter');
      state.activeLogFilter = filter;

      logFilterButtons.forEach(b => {
        b.classList.remove('bg-primary-container', 'text-on-primary-container');
        b.classList.add('bg-surface-container');
      });
      btn.classList.add('bg-primary-container', 'text-on-primary-container');
      btn.classList.remove('bg-surface-container');

      const logRows = logTerminal.querySelectorAll('.terminal-line');
      logRows.forEach(row => {
        const level = row.getAttribute('data-level');
        if (filter === 'all') {
          row.style.display = 'flex';
        } else if (filter === 'warning' && level === 'PERINGATAN') {
          row.style.display = 'flex';
        } else if (filter === 'info' && (level === 'INFO' || level === 'INIT' || level === 'RESOLUSI' || level === 'SISTEM')) {
          row.style.display = 'flex';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });

  function appendTerminalLog(log) {
    if (!logTerminal) return;
    const line = document.createElement('div');
    line.className = `terminal-line flex items-start gap-space-sm py-1.5 px-space-sm rounded transition-colors ${
      log.level === 'PERINGATAN' ? 'bg-error/10 border-l-2 border-error' : 'hover:bg-surface-container/60'
    }`;
    line.setAttribute('data-level', log.level);

    let badgeClass = 'bg-surface-container-high text-on-surface-variant';
    if (log.level === 'INFO') badgeClass = 'bg-secondary/15 text-secondary';
    if (log.level === 'PERINGATAN') badgeClass = 'bg-error/20 text-error';
    if (log.level === 'RESOLUSI') badgeClass = 'bg-primary-container/30 text-primary';

    line.innerHTML = `
      <span class="text-outline shrink-0 font-medium font-mono-code">${log.time}</span>
      <span class="px-1.5 py-0.2 rounded ${badgeClass} font-bold shrink-0 font-mono-code">[${log.level}]</span>
      <span class="text-secondary shrink-0 font-semibold font-mono-code">[${log.tag}]</span>
      <span class="text-on-surface font-mono-code">${log.message}</span>
    `;

    logTerminal.insertBefore(line, logTerminal.firstChild);
  }

  // =========================================================================
  // 9. EXPORT LOG KE CSV
  // =========================================================================
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      const rows = logTerminal.querySelectorAll('.terminal-line');
      if (!rows.length) {
        showToast('Tidak ada data log untuk diekspor.', 'warning');
        return;
      }

      let csvContent = '\uFEFFWaktu,Tingkat,Kategori,Pesan\n';
      rows.forEach(r => {
        const cols = r.querySelectorAll('span');
        if (cols.length >= 4) {
          const time = cols[0].textContent.trim();
          const level = cols[1].textContent.replace(/[\[\]]/g, '').trim();
          const tag = cols[2].textContent.replace(/[\[\]]/g, '').trim();
          const msg = `"${cols[3].textContent.replace(/"/g, '""').trim()}"`;
          csvContent += `${time},${level},${tag},${msg}\n`;
        }
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartclassroom_hardware_logs_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('File log berhasil diunduh.', 'success', 'Ekspor CSV');
    });
  }

  // =========================================================================
  // 10. MODAL DIALOGS (Fullscreen, Diagnostics, Signal Test, DMI)
  // =========================================================================
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Event listener untuk tombol close modal
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  // Close modal jika klik overlay luar
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Close modal dengan tombol Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => {
        m.classList.remove('active');
      });
      document.body.style.overflow = '';
    }
  });

  // Tombol Fullscreen Camera Stream
  document.querySelectorAll('.btn-fullscreen-stream').forEach(btn => {
    btn.addEventListener('click', () => {
      const camId = btn.getAttribute('data-cam-id') || '1';
      const camTitle = btn.getAttribute('data-cam-name') || 'Kamera Presensi';
      
      const modalTitle = document.getElementById('modal-fs-title');
      const fsVideo = document.getElementById('modal-fs-video');
      
      if (modalTitle) modalTitle.textContent = `Streaming Langsung: ${camTitle}`;
      if (fsVideo) {
        fsVideo.src = `/video_feed/${camId}?t=${Date.now()}`;
      }
      openModal('modal-fullscreen');
    });
  });

  // Tombol Uji Sinyal Kamera
  document.querySelectorAll('.btn-test-signal').forEach(btn => {
    btn.addEventListener('click', async () => {
      const camId = btn.getAttribute('data-cam-id') || '1';
      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'Menguji...';

      try {
        const res = await fetch(`/api/cameras/${camId}/test`);
        const data = await res.json();
        
        if (data.status === 'success') {
          const test = data.test;
          const bodyEl = document.getElementById('modal-signal-body');
          if (bodyEl) {
            bodyEl.innerHTML = `
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
                  <span class="text-on-surface-variant text-sm">Status Sambungan:</span>
                  <span class="font-bold text-sm ${test.status === 'connected' ? 'text-secondary' : 'text-error'}">
                    ${test.status === 'connected' ? 'ONLINE (STABIL)' : 'OFFLINE (TIDAK ADA RESPON)'}
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-3 rounded-lg bg-surface-container-low flex flex-col">
                    <span class="text-xs text-outline">Latensi Sinyal</span>
                    <span class="font-bold text-lg text-primary">${test.latency_ms} ms</span>
                  </div>
                  <div class="p-3 rounded-lg bg-surface-container-low flex flex-col">
                    <span class="text-xs text-outline">Packet Loss</span>
                    <span class="font-bold text-lg ${test.packet_loss_percent === 0 ? 'text-secondary' : 'text-error'}">${test.packet_loss_percent}%</span>
                  </div>
                  <div class="p-3 rounded-lg bg-surface-container-low flex flex-col">
                    <span class="text-xs text-outline">Bitrate Terukur</span>
                    <span class="font-bold text-lg text-on-surface">${test.bitrate}</span>
                  </div>
                  <div class="p-3 rounded-lg bg-surface-container-low flex flex-col">
                    <span class="text-xs text-outline">Kualitas Sinyal</span>
                    <span class="font-bold text-lg text-secondary">${test.signal_quality}</span>
                  </div>
                </div>
              </div>
            `;
          }
          openModal('modal-signal-test');
        }
      } catch (err) {
        showToast('Gagal menguji sinyal: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });

  // Tombol Pengalihan Indeks Port Kamera (Index 0, 1, 2, 3, 4) per Kamera
  document.querySelectorAll('.btn-switch-cam-idx').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = btn.getAttribute('data-idx');
      const camId = btn.getAttribute('data-cam-id') || '1';
      
      // Update styling hanya untuk tombol pada kelompok kartu kamera yang sama
      const parentContainer = btn.parentElement;
      if (parentContainer) {
        parentContainer.querySelectorAll('.btn-switch-cam-idx').forEach(b => {
          b.classList.remove('bg-primary-container', 'text-on-primary-container');
          b.classList.add('bg-surface-container-high', 'text-on-surface');
        });
      }
      btn.classList.add('bg-primary-container', 'text-on-primary-container');
      btn.classList.remove('bg-surface-container-high', 'text-on-surface');

      try {
        const res = await fetch(`/api/cameras/${camId}/switch-index/${idx}`, { method: 'POST' });
        const data = await res.json();
        
        if (data.status === 'success') {
          showToast(data.result.message || `Kamera ${camId} dialihkan ke Port ${idx}`, 'info', `Kamera ${camId}`);
        } else {
          showToast(data.message || 'Gagal mengubah port', 'warning', `Kamera ${camId}`);
        }
        
        // Refresh feed gambar kamera terkait dengan sedikit jeda agar DirectShow driver siap
        setTimeout(() => {
          const feed = document.getElementById(`cam-feed-${camId}`);
          if (feed) {
            feed.src = `/video_feed/${camId}?t=${Date.now()}`;
          }
        }, 350);

        if (data.latest_log) {
          appendTerminalLog(data.latest_log);
        }
      } catch (err) {
        showToast(`Gagal mengalihkan port Kamera ${camId}: ` + err.message, 'error');
      }
    });
  });

  // Tombol Hubungkan Ulang (Reconnect)
  document.querySelectorAll('.btn-reconnect-cam').forEach(btn => {
    btn.addEventListener('click', async () => {
      const camId = btn.getAttribute('data-cam-id') || '2';
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin-fast">restart_alt</span><span>Menyambung...</span>`;
      btn.disabled = true;

      try {
        const res = await fetch(`/api/cameras/${camId}/reconnect`, { method: 'POST' });
        const data = await res.json();

        if (data.status === 'success') {
          showToast(data.result.message, 'success', 'Koneksi Berhasil');
        } else {
          showToast(data.result.message, 'warning', 'Sambung Ulang');
        }

        if (data.latest_log) {
          appendTerminalLog(data.latest_log);
        }
      } catch (err) {
        showToast('Gagal menghubungi port: ' + err.message, 'error');
      } finally {
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.disabled = false;
        }, 800);
      }
    });
  });

  // Tombol Diagnostik Port
  document.querySelectorAll('.btn-diagnostics-port').forEach(btn => {
    btn.addEventListener('click', () => {
      openModal('modal-diagnostics');
    });
  });

  // =========================================================================
  // 11b. MODAL IP WEBCAM – Hubungkan HP via IP Webcam
  // =========================================================================
  const ipModal = document.getElementById('modal-ip-webcam');
  const ipInput = document.getElementById('ip-webcam-input');
  const ipModalCamLabel = document.getElementById('ip-modal-cam-label');
  const ipModalStatus = document.getElementById('ip-modal-status');
  const btnConnectIp = document.getElementById('btn-connect-ip');

  // Buka modal dari tombol "🔗 IP" di kartu kamera
  document.querySelectorAll('.btn-open-ip-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const camId = btn.getAttribute('data-cam-id') || '1';
      if (btnConnectIp) btnConnectIp.setAttribute('data-cam-id', camId);
      const camNames = {
        '1': 'Kamera 1: Attendance (Presensi)',
        '2': 'Kamera 2: Surveillance Kiri',
        '3': 'Kamera 3: Surveillance Tengah',
        '4': 'Kamera 4: Surveillance Kanan'
      };
      if (ipModalCamLabel) ipModalCamLabel.textContent = camNames[camId] || `Kamera ${camId}`;
      if (ipInput) ipInput.value = '';
      if (ipModalStatus) { ipModalStatus.className = 'hidden'; ipModalStatus.textContent = ''; }
      openModal('modal-ip-webcam');
      setTimeout(() => { if (ipInput) ipInput.focus(); }, 200);
    });
  });

  // Tombol Hubungkan
  if (btnConnectIp) {
    btnConnectIp.addEventListener('click', async () => {
      const camId = btnConnectIp.getAttribute('data-cam-id') || '1';
      const rawInput = (ipInput ? ipInput.value.trim() : '');
      
      // Jika kosong, kembalikan ke port 0 (lokal)
      let source;
      if (!rawInput) {
        source = 0;
      } else {
        // Bersihkan awalan http:// jika user ketik ulang
        let cleaned = rawInput.replace(/^https?:\/\//i, '');
        source = `http://${cleaned}/video`;
      }

      const originalHtml = btnConnectIp.innerHTML;
      btnConnectIp.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span> Menghubungkan...`;
      btnConnectIp.disabled = true;
      if (ipModalStatus) { ipModalStatus.className = 'hidden'; }

      try {
        const res = await fetch(`/api/cameras/${camId}/set-source`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source })
        });
        const data = await res.json();

        if (data.status === 'success') {
          if (ipModalStatus) {
            ipModalStatus.className = 'p-2.5 rounded-lg text-sm font-semibold text-center bg-secondary/15 text-secondary';
            ipModalStatus.textContent = `✓ ${data.result.message}`;
          }
          showToast(data.result.message, 'success', `Kamera ${camId} IP Webcam`);

          // Refresh feed video kamera terkait
          setTimeout(() => {
            const feed = document.getElementById(`cam-feed-${camId}`);
            if (feed) feed.src = `/video_feed/${camId}?t=${Date.now()}`;
            if (data.latest_log) appendTerminalLog(data.latest_log);
            closeModal('modal-ip-webcam');
          }, 800);
        } else {
          if (ipModalStatus) {
            ipModalStatus.className = 'p-2.5 rounded-lg text-sm font-semibold text-center bg-error/15 text-error';
            ipModalStatus.textContent = `✗ Gagal: ${data.message || 'Periksa alamat IP'}`;
          }
        }
      } catch (err) {
        if (ipModalStatus) {
          ipModalStatus.className = 'p-2.5 rounded-lg text-sm font-semibold text-center bg-error/15 text-error';
          ipModalStatus.textContent = `✗ Error: ${err.message}`;
        }
      } finally {
        btnConnectIp.innerHTML = originalHtml;
        btnConnectIp.disabled = false;
      }
    });
  }

  // Enter key di input
  if (ipInput) {
    ipInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && btnConnectIp) btnConnectIp.click();
    });
  }

  // Tombol DMI/SMBIOS
  const btnDmi = document.getElementById('btn-view-dmi');
  if (btnDmi) {
    btnDmi.addEventListener('click', () => {
      openModal('modal-dmi');
    });
  }

  // Snapshot Fullscreen Stream
  const btnSnapshot = document.getElementById('btn-fs-snapshot');
  if (btnSnapshot) {
    btnSnapshot.addEventListener('click', () => {
      const video = document.getElementById('modal-fs-video');
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.naturalWidth || 1280;
      canvas.height = video.naturalHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const link = document.createElement('a');
      link.download = `kamera_snapshot_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToast('Tangkapan gambar berhasil disimpan.', 'success', 'Screenshot');
    });
  }

  // =========================================================================
  // 11. MOBILE DRAWER NAVIGATION
  // =========================================================================
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
  const sidebar = document.querySelector('body > aside');

  function closeMobileDrawer() {
    document.body.classList.remove('mobile-menu-open');
    if (mobileMenuButton) mobileMenuButton.setAttribute('aria-expanded', 'false');
  }

  if (mobileMenuButton && mobileMenuOverlay && sidebar) {
    mobileMenuButton.addEventListener('click', () => {
      const isOpen = document.body.classList.toggle('mobile-menu-open');
      mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
    });

    mobileMenuOverlay.addEventListener('click', closeMobileDrawer);

    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          closeMobileDrawer();
        }
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) closeMobileDrawer();
    });
  }

  // Smooth scroll & Nav item highlight
  const navLinks = document.querySelectorAll('aside nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
        navLinks.forEach(l => l.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-semibold'));
        link.classList.add('bg-primary-container', 'text-on-primary-container', 'font-semibold');
      }
    });
  });

  console.log('Smart Class Room Dashboard Telemetry Engine v2.4 initialized.');
});
