/**
 * F1 Race Gap Chart
 * Renders an interactive race gap visualization into #raceChart
 *
 * Dependencies: D3.js v7 (loaded externally)
 *
 * Usage:
 *   const chart = new RaceGapChart('#raceChart');
 *   chart.load({ season: 2024, round: 1, driverIds: ['verstappen', 'hamilton', 'leclerc'] });
 */

export const RaceGapChart = (() => {

  // ─── Constants ────────────────────────────────────────────────────────────

  const TIRE_COLORS = {
    SOFT: '#E8002D',
    MEDIUM: '#FFF200',
    HARD: '#FFFFFF',
    INTERMEDIATE: '#39B54A',
    WET: '#0067FF',
    UNKNOWN: '#888888',
  };

  const TIRE_STROKE = {
    SOFT: '#a00020',
    MEDIUM: '#b0a800',
    HARD: '#aaaaaa',
    INTERMEDIATE: '#1a7a2a',
    WET: '#0040cc',
    UNKNOWN: '#555555',
  };

  // Approximate pit loss time in seconds (used for the pit-delta reference line)
  const DEFAULT_PIT_DELTA = 22;

  // Threshold (seconds) for algorithmic Safety Car detection:
  // if the median lap-time delta vs driver's rolling average exceeds this, flag as SC
  const SC_DETECTION_THRESHOLD = 5;

  const API_BASE = 'https://api.jolpi.ca/ergast/f1';

  // ─── Color palette for driver lines ──────────────────────────────────────

  const LINE_PALETTE = [
    '#00D2FF', '#FF6B35', '#A8FF3E', '#FF3EA5',
    '#FFD700', '#BF5FFF', '#00FFC8', '#FF4444',
    '#FF9F00', '#5B8DFF',
  ];

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function parseTime(timeStr) {
    // Accepts "1:32.456" or "92.456"
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return parseFloat(timeStr);
  }

  function formatGap(seconds) {
    const abs = Math.abs(seconds);
    const sign = seconds >= 0 ? '+' : '-';
    if (abs >= 60) {
      const m = Math.floor(abs / 60);
      const s = (abs % 60).toFixed(1);
      return `${sign}${m}:${s.padStart(4, '0')}`;
    }
    return `${sign}${abs.toFixed(2)}s`;
  }

  // ─── API fetchers ─────────────────────────────────────────────────────────

  async function fetchLaps(season, round) {
    const allLaps = {};
    const allPositions = {};
    let offset = 0;
    const limit = 100;

    while (true) {
      const url = `${API_BASE}/${season}/${round}/laps.json?limit=${limit}&offset=${offset}`;
      const res = await fetch(url);

      // If rate limited, wait and retry
      if (res.status === 429) {
        console.warn('Rate limited — waiting 1s before retry...');
        await new Promise(r => setTimeout(r, 1000));
        continue; // retry same offset
      }

      const json = await res.json();
      const races = json?.MRData?.RaceTable?.Races;
      if (!races || races.length === 0) break;
      const laps = races[0]?.Laps || [];
      if (laps.length === 0) break;

      for (const lap of laps) {
        const lapNum = parseInt(lap.number);
        for (const timing of lap.Timings) {
          const id = timing.driverId;
          if (!allLaps[id]) allLaps[id] = {};
          allLaps[id][lapNum] = parseTime(timing.time);
          if (!allPositions[id]) allPositions[id] = {};
          allPositions[id][lapNum] = parseInt(timing.position);
        }
      }

      offset += limit;
      if (offset >= parseInt(json.MRData.total)) break;

      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    return { allLaps, allPositions };
  }

  async function fetchPitStops(season, round) {
    const stops = {};
    const url = `${API_BASE}/${season}/${round}/pitstops.json?limit=100`;
    const res = await fetch(url);
    const json = await res.json();
    const races = json?.MRData?.RaceTable?.Races;
    if (!races || races.length === 0) return stops;
    for (const stop of races[0]?.PitStops || []) {
      const id = stop.driverId;
      if (!stops[id]) stops[id] = [];
      stops[id].push({ lap: parseInt(stop.lap), duration: parseFloat(stop.duration) });
    }
    return stops;
  }

  async function fetchDriverInfo(season, round) {
    const url = `${API_BASE}/${season}/${round}/results.json`;
    const res = await fetch(url);
    const json = await res.json();
    const results = json?.MRData?.RaceTable?.Races?.[0]?.Results || [];
    const info = {};
    for (const r of results) {
      info[r.Driver.driverId] = {
        code: r.Driver.code || r.Driver.driverId.substring(0, 3).toUpperCase(),
        name: `${r.Driver.givenName} ${r.Driver.familyName}`,
        team: r.Constructor.name,
        grid: parseInt(r.grid),
        startingTire: r.startingTire || null,
      };
    }
    return info;
  }

  async function fetchRaceInfo(season, round) {
    const url = `${API_BASE}/${season}/${round}/results.json`;
    const res = await fetch(url);
    const json = await res.json();
    const race = json?.MRData?.RaceTable?.Races?.[0];
    return { name: race?.raceName || 'Race', circuit: race?.Circuit?.circuitName || '' };
  }

  // ─── Data processing ──────────────────────────────────────────────────────

  function buildCumulativeTimes(lapsData, driverIds) {
    // Find max lap across all selected drivers
    const maxLap = Math.max(...driverIds.map(id => {
      const laps = lapsData[id] || {};
      return Math.max(0, ...Object.keys(laps).map(Number));
    }));

    // Build cumulative time per driver per lap
    const cumulative = {};
    for (const id of driverIds) {
      const laps = lapsData[id] || {};
      cumulative[id] = {};
      let total = 0;
      for (let lap = 1; lap <= maxLap; lap++) {
        if (laps[lap] != null) {
          total += laps[lap];
          cumulative[id][lap] = total;
        } else {
          // Driver retired — stop here
          break;
        }
      }
    }
    return { cumulative, maxLap };
  }

  function buildGapSeries(cumulative, driverIds, maxLap) {
    // For each lap, compute average cumulative time of drivers still running
    const gaps = {};
    for (const id of driverIds) gaps[id] = [];

    for (let lap = 1; lap <= maxLap; lap++) {
      const activeTimes = driverIds
        .filter(id => cumulative[id][lap] != null)
        .map(id => cumulative[id][lap]);

      if (activeTimes.length === 0) continue;
      const avg = activeTimes.reduce((a, b) => a + b, 0) / activeTimes.length;

      for (const id of driverIds) {
        if (cumulative[id][lap] != null) {
          gaps[id].push({ lap, gap: cumulative[id][lap] - avg });
        }
      }
    }
    return gaps;
  }

  function detectSafetyCars(lapsData, driverIds, maxLap) {
    // Compute per-driver rolling average lap time (5-lap window)
    // Flag laps where majority of drivers are significantly slower
    const scLaps = new Set();

    const rollingAvg = {};
    for (const id of driverIds) {
      rollingAvg[id] = {};
      const laps = lapsData[id] || {};
      const keys = Object.keys(laps).map(Number).sort((a, b) => a - b);
      for (let i = 0; i < keys.length; i++) {
        const window = keys.slice(Math.max(0, i - 5), i).map(k => laps[k]).filter(Boolean);
        if (window.length >= 3) {
          rollingAvg[id][keys[i]] = window.reduce((a, b) => a + b, 0) / window.length;
        }
      }
    }

    for (let lap = 1; lap <= maxLap; lap++) {
      let slowCount = 0;
      let totalActive = 0;
      for (const id of driverIds) {
        const lapTime = (lapsData[id] || {})[lap];
        const avg = rollingAvg[id]?.[lap];
        if (lapTime != null && avg != null) {
          totalActive++;
          if (lapTime - avg > SC_DETECTION_THRESHOLD) slowCount++;
        }
      }
      if (totalActive >= 2 && slowCount / totalActive >= 0.6) {
        scLaps.add(lap);
      }
    }

    // Group consecutive SC laps into ranges
    const scRanges = [];
    let rangeStart = null;
    const sorted = [...scLaps].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      if (rangeStart === null) rangeStart = sorted[i];
      if (sorted[i + 1] !== sorted[i] + 1) {
        scRanges.push({ start: rangeStart, end: sorted[i] });
        rangeStart = null;
      }
    }
    return scRanges;
  }

  // Assign tire compounds based on pit stop laps
  // Without compound data from API, we assign visually distinct placeholders
  // but leave hooks for real compound data if available
  function buildTireStints(pitStops, driverIds, maxLap, driverInfo) {
    const stints = {};
    for (const id of driverIds) {
      const stops = (pitStops[id] || []).sort((a, b) => a.lap - b.lap);
      const driverStints = [];

      // Starting tire — use driverInfo if available, else UNKNOWN
      const startingCompound = driverInfo?.[id]?.startingTire?.toUpperCase() || 'UNKNOWN';
      let prevLap = 1;
      let compoundIndex = 0;

      // Cycle through tire types as fallback
      const fallbackSequence = ['SOFT', 'MEDIUM', 'HARD', 'SOFT', 'MEDIUM'];

      driverStints.push({
        startLap: 1,
        endLap: stops.length > 0 ? stops[0].lap - 1 : maxLap,
        compound: startingCompound !== 'UNKNOWN' ? startingCompound : fallbackSequence[compoundIndex],
      });

      for (let i = 0; i < stops.length; i++) {
        compoundIndex++;
        const startLap = stops[i].lap;
        const endLap = i + 1 < stops.length ? stops[i + 1].lap - 1 : maxLap;
        driverStints.push({
          startLap,
          endLap,
          compound: fallbackSequence[compoundIndex % fallbackSequence.length],
        });
      }

      stints[id] = driverStints;
    }
    return stints;
  }

  // ─── Chart renderer ───────────────────────────────────────────────────────

  function render(containerId, {
    gaps,
    driverIds,
    positionByLap,
    driverInfo,
    pitStops,
    tireStints,
    scRanges,
    maxLap,
    raceInfo,
    pitDelta,
    driverColors,
  }) {
    const container = document.querySelector(containerId);
    if (!container) { console.error(`Element ${containerId} not found`); return; }
    container.innerHTML = '';

    const totalWidth = container.clientWidth || 900;
    const totalHeight = container.clientHeight || 560;
    const margin = { top: 60, right: 180, bottom: 60, left: 70 };
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', totalWidth)
      .attr('height', totalHeight)
      .style('background', '#0d0d0f')
      .style('font-family', "'Titillium Web', 'Barlow Condensed', sans-serif");

    // Defs: clip path + glow filter
    const defs = svg.append('defs');
    defs.append('clipPath').attr('id', 'chart-clip')
      .append('rect').attr('width', width).attr('height', height);

    const glow = defs.append('filter').attr('id', 'glow');
    glow.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // ── Scales
    const allGaps = driverIds.flatMap(id => gaps[id]?.map(d => d.gap) || []);
    const gapExtent = d3.extent(allGaps);
    const gapPad = (gapExtent[1] - gapExtent[0]) * 0.12 || 5;

    const xScale = d3.scaleLinear().domain([1, maxLap]).range([0, width]);
    const yScale = d3.scaleLinear()
      .domain([gapExtent[0] - gapPad, gapExtent[1] + gapPad])
      .range([0, height]);

    // ── Title
    svg.append('text')
      .attr('x', totalWidth / 2)
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '18px')
      .attr('font-weight', '700')
      .attr('letter-spacing', '2px')
      .text(`${raceInfo.name.toUpperCase()} — GAP TO AVERAGE`);

    svg.append('text')
      .attr('x', totalWidth / 2)
      .attr('y', 46)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666')
      .attr('font-size', '11px')
      .attr('letter-spacing', '1px')
      .text(raceInfo.circuit.toUpperCase());

    // ── Grid lines
    const yTicks = yScale.ticks(8);
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter().append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0).attr('x2', width)
      .attr('y1', d => yScale(d)).attr('y2', d => yScale(d))
      .attr('stroke', d => d === 0 ? '#444' : '#1e1e22')
      .attr('stroke-width', d => d === 0 ? 1.5 : 1)
      .attr('stroke-dasharray', d => d === 0 ? 'none' : '3,4');

    // ── Zero line label
    g.append('text')
      .attr('x', -8)
      .attr('y', yScale(0) + 4)
      .attr('text-anchor', 'end')
      .attr('fill', '#666')
      .attr('font-size', '10px')
      .text('AVG');

    // ── Safety Car bands
    for (const sc of scRanges) {
      g.append('rect')
        .attr('x', xScale(sc.start))
        .attr('y', 0)
        .attr('width', xScale(sc.end) - xScale(sc.start) + (width / maxLap))
        .attr('height', height)
        .attr('fill', '#FFD70015')
        .attr('stroke', '#FFD70040')
        .attr('stroke-width', 1);

      g.append('text')
        .attr('x', xScale(sc.start) + 4)
        .attr('y', 12)
        .attr('fill', '#FFD700aa')
        .attr('font-size', '9px')
        .attr('letter-spacing', '1px')
        .text('SC');
    }

    // ── Pit delta reference lines
    if (pitDelta) {
      for (const sign of [1, -1]) {
        const y = yScale(sign * pitDelta);
        if (y >= 0 && y <= height) {
          g.append('line')
            .attr('x1', 0).attr('x2', width)
            .attr('y1', y).attr('y2', y)
            .attr('stroke', '#FF6B3560')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '6,4');

          g.append('text')
            .attr('x', width + 6)
            .attr('y', y + 4)
            .attr('fill', '#FF6B3599')
            .attr('font-size', '9px')
            .text(`${sign > 0 ? '+' : '−'}PIT`);
        }
      }
    }

    // ── Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.min(maxLap, 20))
      .tickFormat(d => `L${d}`);

    const yAxis = d3.axisLeft(yScale)
      .ticks(8)
      .tickFormat(d => `${d > 0 ? '+' : ''}${d.toFixed(0)}s`);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .call(ax => ax.select('.domain').attr('stroke', '#333'))
      .call(ax => ax.selectAll('text').attr('fill', '#666').attr('font-size', '10px'))
      .call(ax => ax.selectAll('line').attr('stroke', '#333'));

    g.append('g')
      .call(yAxis)
      .call(ax => ax.select('.domain').attr('stroke', '#333'))
      .call(ax => ax.selectAll('text').attr('fill', '#666').attr('font-size', '10px'))
      .call(ax => ax.selectAll('line').attr('stroke', '#333'));

    // Axis labels
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 48)
      .attr('text-anchor', 'middle')
      .attr('fill', '#555')
      .attr('font-size', '11px')
      .attr('letter-spacing', '1px')
      .text('LAP');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -55)
      .attr('text-anchor', 'middle')
      .attr('fill', '#555')
      .attr('font-size', '11px')
      .attr('letter-spacing', '1px')
      .text('GAP TO AVERAGE (s)');

    // ── Line generator
    const lineGen = d3.line()
      .x(d => xScale(d.lap))
      .y(d => yScale(d.gap))
      .curve(d3.curveMonotoneX)
      .defined(d => d.gap != null);

    // Clip group for lines + dots
    const chartG = g.append('g').attr('clip-path', 'url(#chart-clip)');

    // ── Draw driver lines + tire dots
    for (let i = 0; i < driverIds.length; i++) {
      const id = driverIds[i];
      const color = driverColors[id];
      const series = gaps[id] || [];
      if (series.length === 0) continue;

      // Line
      chartG.append('path')
        .datum(series)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('filter', 'url(#glow)')
        .attr('opacity', 0.9)
        .attr('d', lineGen);

      // Tire compound dots
      const stints = tireStints[id] || [];
      for (const stint of stints) {
        const lapPoint = series.find(d => d.lap === stint.startLap);
        if (!lapPoint) continue;
        const compound = stint.compound || 'UNKNOWN';
        const tireColor = TIRE_COLORS[compound] || TIRE_COLORS.UNKNOWN;
        const tireStrokeColor = TIRE_STROKE[compound] || TIRE_STROKE.UNKNOWN;

        chartG.append('circle')
          .attr('cx', xScale(lapPoint.lap))
          .attr('cy', yScale(lapPoint.gap))
          .attr('r', 6)
          .attr('fill', tireColor)
          .attr('stroke', tireStrokeColor)
          .attr('stroke-width', 1.5)
          .append('title')
          .text(`${id} — ${compound} (Lap ${stint.startLap})`);
      }
      // ── Position change markers
      for (let i = 0; i < driverIds.length; i++) {
        const id = driverIds[i];
        const color = driverColors[id];
        const series = gaps[id] || [];

        let prevPosition = null;

        for (const point of series) {
          // Get position for this lap from lapsData timings
          const currentPosition = positionByLap[id]?.[point.lap];
          if (currentPosition == null) continue;

          if (prevPosition !== null && currentPosition !== prevPosition) {
            const cx = xScale(point.lap);
            const cy = yScale(point.gap);
            const size = 14;

            // Square background
            chartG.append('rect')
              .attr('x', cx - size / 2)
              .attr('y', cy - size / 2)
              .attr('width', size)
              .attr('height', size)
              .attr('fill', color)
              .attr('stroke', '#111')
              .attr('stroke-width', 1);

            // Position number
            chartG.append('text')
              .attr('x', cx)
              .attr('y', cy + 4)
              .attr('text-anchor', 'middle')
              .attr('fill', '#000')
              .attr('font-size', '9px')
              .attr('font-weight', '700')
              .attr('pointer-events', 'none')
              .text(currentPosition);
          }

          prevPosition = currentPosition;
        }
      }
    }

    // ── Legend (right side)
    const legendX = width + 20;
    let legendY = 0;

    for (let i = 0; i < driverIds.length; i++) {
      const id = driverIds[i];
      const info = driverInfo[id] || { code: id.substring(0, 3).toUpperCase(), name: id };
      const color = driverColors[id];
      const lastPoint = (gaps[id] || []).slice(-1)[0];

      svg.append('line')
        .attr('x1', margin.left + legendX)
        .attr('x2', margin.left + legendX + 18)
        .attr('y1', margin.top + legendY + 7)
        .attr('y2', margin.top + legendY + 7)
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('filter', 'url(#glow)');

      svg.append('text')
        .attr('x', margin.left + legendX + 24)
        .attr('y', margin.top + legendY + 12)
        .attr('fill', color)
        .attr('font-size', '12px')
        .attr('font-weight', '700')
        .attr('letter-spacing', '1px')
        .text(info.code);

      if (lastPoint) {
        svg.append('text')
          .attr('x', margin.left + legendX + 24)
          .attr('y', margin.top + legendY + 24)
          .attr('fill', '#555')
          .attr('font-size', '9px')
          .text(formatGap(lastPoint.gap));
      }

      legendY += 38;
    }

    // ── Tire legend
    legendY += 10;
    const tireEntries = Object.entries(TIRE_COLORS);
    svg.append('text')
      .attr('x', margin.left + legendX)
      .attr('y', margin.top + legendY)
      .attr('fill', '#444')
      .attr('font-size', '9px')
      .attr('letter-spacing', '1px')
      .text('COMPOUNDS');
    legendY += 14;

    for (const [compound, color] of tireEntries) {
      if (compound === 'UNKNOWN') continue;
      svg.append('circle')
        .attr('cx', margin.left + legendX + 6)
        .attr('cy', margin.top + legendY + 4)
        .attr('r', 5)
        .attr('fill', color)
        .attr('stroke', TIRE_STROKE[compound])
        .attr('stroke-width', 1);
      svg.append('text')
        .attr('x', margin.left + legendX + 16)
        .attr('y', margin.top + legendY + 8)
        .attr('fill', '#555')
        .attr('font-size', '9px')
        .text(compound);
      legendY += 16;
    }

    // ── Tooltip
    const tooltip = d3.select(container)
      .append('div')
      .style('position', 'absolute')
      .style('background', '#111113ee')
      .style('border', '1px solid #333')
      .style('border-radius', '6px')
      .style('padding', '10px 14px')
      .style('color', '#fff')
      .style('font-size', '12px')
      .style('font-family', "'Titillium Web', sans-serif")
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.15s');

    // Vertical crosshair line
    const crosshair = g.append('line')
      .attr('y1', 0).attr('y2', height)
      .attr('stroke', '#ffffff22')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .style('pointer-events', 'none')
      .attr('opacity', 0);

    // Invisible overlay for mouse tracking
    g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event, this);
        const lap = Math.round(xScale.invert(mx));
        if (lap < 1 || lap > maxLap) return;

        crosshair.attr('x1', xScale(lap)).attr('x2', xScale(lap)).attr('opacity', 1);

        let html = `<div style="color:#aaa;font-size:10px;letter-spacing:1px;margin-bottom:6px">LAP ${lap}</div>`;
        for (const id of driverIds) {
          const pt = (gaps[id] || []).find(d => d.lap === lap);
          if (!pt) continue;
          const info = driverInfo[id] || { code: id.toUpperCase() };
          const color = driverColors[id];
          html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
            <span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:2px"></span>
            <span style="color:${color};font-weight:700;width:32px">${info.code}</span>
            <span style="color:#ccc">${formatGap(pt.gap)}</span>
          </div>`;
        }

        const rect = container.getBoundingClientRect();
        const ex = event.clientX - rect.left;
        const ey = event.clientY - rect.top;

        tooltip
          .html(html)
          .style('left', `${ex + 16}px`)
          .style('top', `${ey - 10}px`)
          .style('opacity', 1);
      })
      .on('mouseleave', function () {
        crosshair.attr('opacity', 0);
        tooltip.style('opacity', 0);
      });
  }

  // ─── Loading indicator ────────────────────────────────────────────────────

  function showLoading(containerId, message = 'Loading race data…') {
    const container = document.querySelector(containerId);
    if (!container) return;
    container.innerHTML = `
      <div style="
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        height:100%; color:#555; font-family:'Titillium Web',sans-serif;
        font-size:13px; letter-spacing:2px; text-transform:uppercase; gap:16px;
      ">
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#222" stroke-width="3"/>
          <circle cx="18" cy="18" r="14" fill="none" stroke="#E8002D" stroke-width="3"
            stroke-dasharray="44 44" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate"
              from="0 18 18" to="360 18 18" dur="0.9s" repeatCount="indefinite"/>
          </circle>
        </svg>
        ${message}
      </div>`;
  }

  function showError(containerId, message) {
    const container = document.querySelector(containerId);
    if (!container) return;
    container.innerHTML = `
      <div style="
        display:flex; align-items:center; justify-content:center;
        height:100%; color:#E8002D; font-family:'Titillium Web',sans-serif;
        font-size:13px; letter-spacing:1px;
      ">${message}</div>`;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  class RaceGapChart {
    /**
     * @param {string} containerId  CSS selector for the host element, e.g. '#raceChart'
     */
    constructor(containerId = '#raceChart') {
      this.containerId = containerId;
    }

    /**
     * Load and render the chart.
     * @param {object} options
     * @param {number}   options.season      F1 season year, e.g. 2024
     * @param {number}   options.round       Race round number, e.g. 1
     * @param {string[]} options.driverIds   Array of Ergast driverIds, e.g. ['verstappen','hamilton']
     * @param {number}  [options.pitDelta]   Pit loss seconds (default 22)
     */
    async load({ season, round, driverIds, pitDelta = DEFAULT_PIT_DELTA }) {
      showLoading(this.containerId);

      try {
        const [{ allLaps: lapsData, allPositions: positionByLap }, pitStops, driverInfo, raceInfo] = await Promise.all([
          fetchLaps(season, round),
          fetchPitStops(season, round),
          fetchDriverInfo(season, round),
          fetchRaceInfo(season, round),
        ]);

        // Filter to only drivers that have lap data
        const activeDrivers = driverIds.filter(id => lapsData[id] && Object.keys(lapsData[id]).length > 0);
        if (activeDrivers.length === 0) {
          showError(this.containerId, 'No lap data found for the selected drivers.');
          return;
        }

        const { cumulative, maxLap } = buildCumulativeTimes(lapsData, activeDrivers);
        const gaps = buildGapSeries(cumulative, activeDrivers, maxLap);
        const scRanges = detectSafetyCars(lapsData, activeDrivers, maxLap);
        const tireStints = buildTireStints(pitStops, activeDrivers, maxLap, driverInfo);

        // Assign colors
        const driverColors = {};
        activeDrivers.forEach((id, i) => {
          driverColors[id] = LINE_PALETTE[i % LINE_PALETTE.length];
        });

        render(this.containerId, {
          gaps,
          driverIds: activeDrivers,
          positionByLap,
          driverInfo,
          pitStops,
          tireStints,
          scRanges,
          maxLap,
          raceInfo,
          pitDelta,
          driverColors,
        });

      } catch (err) {
        console.error('RaceGapChart error:', err);
        showError(this.containerId, `Failed to load race data: ${err.message}`);
      }
    }
  }

  return RaceGapChart;

})();
