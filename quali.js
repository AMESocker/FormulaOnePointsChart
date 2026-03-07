import { getDriverStandings, getSeasonDetails } from './api.js';
import { extractStandings, getCompletedRaces } from './helpers.js';
import { teamColors } from './colors.js';

// ── State ────────────────────────────────────────────────────────
let selectedYear = 2026;
let allDrivers = [];       // [{ driverId, code, givenName, familyName, team, constructorId }]
let selectedPair = [];     // always max 2 drivers
let qualiData = [];        // raw race-by-race qualifying results from API

// ── Team color helpers ───────────────────────────────────────────
const teamDriverMap = {};
const driverColorMap = {};

function getDriverColor(driver) {
    const team = driver.team;
    if (!teamDriverMap[team]) teamDriverMap[team] = [];
    if (!teamDriverMap[team].includes(driver.driverId)) teamDriverMap[team].push(driver.driverId);
    if (driverColorMap[driver.driverId]) return driverColorMap[driver.driverId];

    const baseHex = teamColors[team] || '#888';
    const baseColor = d3.color(baseHex);
    const colorVariant = d3.hsl(baseColor);
    const indexInTeam = teamDriverMap[team].indexOf(driver.driverId);
    const variation = 0.12 * indexInTeam;
    colorVariant.l = Math.max(0.3, Math.min(0.8, colorVariant.l - variation));
    colorVariant.s = Math.max(0.4, Math.min(1, colorVariant.s + variation * 0.5));

    const finalColor = colorVariant.toString();
    driverColorMap[driver.driverId] = finalColor;
    return finalColor;
}

// ── API ──────────────────────────────────────────────────────────
async function fetchQualiResults(year) {
    const url = `https://api.jolpi.ca/ergast/f1/${year}/qualifying.json?limit=300`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch qualifying data');
    const data = await response.json();
    return data.MRData.RaceTable.Races || [];
}

// Best qualifying time using furthest round reached (Q3 > Q2 > Q1)
function getBestTime(result) {
    if (result.Q3) return parseTime(result.Q3);
    if (result.Q2) return parseTime(result.Q2);
    if (result.Q1) return parseTime(result.Q1);
    return null;
}

function getBestRound(result) {
    if (result.Q3) return 'Q3';
    if (result.Q2) return 'Q2';
    if (result.Q1) return 'Q1';
    return null;
}

function parseTime(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return parseFloat(timeStr);
}

function formatTime(timeStr) {
    return timeStr || '—';
}

// ── Build per-race comparison ────────────────────────────────────
function buildH2H(races, driverA, driverB) {
    const results = [];

    for (const race of races) {
        const resultA = race.QualifyingResults.find(r => r.Driver.driverId === driverA.driverId);
        const resultB = race.QualifyingResults.find(r => r.Driver.driverId === driverB.driverId);

        const timeA = resultA ? getBestTime(resultA) : null;
        const timeB = resultB ? getBestTime(resultB) : null;
        const roundA = resultA ? getBestRound(resultA) : null;
        const roundB = resultB ? getBestRound(resultB) : null;

        let winner = null;
        if (timeA !== null && timeB !== null) {
            winner = timeA < timeB ? 'a' : 'b';
        } else if (timeA !== null) {
            winner = 'a';
        } else if (timeB !== null) {
            winner = 'b';
        }

        console.log(`Race: ${resultA ? driverA.familyName : '—'} (${formatTime(timeA)}) vs ${resultB ? driverB.familyName : '—'} (${formatTime(timeB)}) => Winner: ${winner || 'None'}`);

        results.push({
            round: race.round,
            raceName: race.raceName,
            circuit: race.Circuit.circuitName,
            winner,
            timeA: resultA ? (resultA.Q3 || resultA.Q2 || resultA.Q1) : null,
            timeB: resultB ? (resultB.Q3 || resultB.Q2 || resultB.Q1) : null,
            roundA,
            roundB,
            posA: resultA ? resultA.position : null,
            posB: resultB ? resultB.position : null,
        });
    }

    return results;
}

// ── Render ───────────────────────────────────────────────────────
function render() {
    const content = document.getElementById('h2h-content');

    if (selectedPair.length < 2) {
        content.innerHTML = `<div class="loading-msg">Select two drivers to compare</div>`;
        return;
    }

    const [driverA, driverB] = selectedPair;
    const h2h = buildH2H(qualiData, driverA, driverB);

    const winsA = h2h.filter(r => r.winner === 'a').length;
    const winsB = h2h.filter(r => r.winner === 'b').length;
    const total = winsA + winsB || 1;

    const colorA = getDriverColor(driverA);
    const colorB = getDriverColor(driverB);

    content.innerHTML = `
        <!-- H2H Header -->
        <div class="h2h-header">
            <div class="h2h-driver">
                <div class="h2h-driver-name" style="color: ${colorA}">${driverA.familyName}</div>
                <div class="h2h-driver-team">${driverA.team}</div>
            </div>
            <div class="h2h-vs">vs</div>
            <div class="h2h-driver">
                <div class="h2h-driver-name" style="color: ${colorB}">${driverB.familyName}</div>
                <div class="h2h-driver-team">${driverB.team}</div>
            </div>
        </div>

        <!-- Score bar -->
        <div class="score-section">
            <div class="score-bar-wrap">
                <div class="score-count left" style="color: ${colorA}">${winsA}</div>
                <div class="score-bar-track">
                    <div class="score-bar-a" style="width: ${(winsA / total) * 100}%; background: ${colorA}"></div>
                    <div class="score-bar-b" style="width: ${(winsB / total) * 100}%; background: ${colorB}"></div>
                </div>
                <div class="score-count right" style="color: ${colorB}">${winsB}</div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.7rem; color: var(--muted); letter-spacing:0.06em; text-transform:uppercase; font-family:'Barlow Condensed',sans-serif;">
                <span>${driverA.code} ahead in quali</span>
                <span>${driverB.code} ahead in quali</span>
            </div>
        </div>

        <!-- Race by race -->
        <div class="races-label">Race by Race</div>
        <div class="races-grid" id="races-grid"></div>
    `;

    // Build race cells
    const grid = document.getElementById('races-grid');
    const tooltip = document.getElementById('quali-tooltip');

    h2h.forEach(race => {
        const cell = document.createElement('div');
        cell.className = `race-cell${!race.winner ? ' dnf' : ''}`;

        const winnerDriver = race.winner === 'a' ? driverA : race.winner === 'b' ? driverB : null;
        const winnerColor = winnerDriver ? getDriverColor(winnerDriver) : 'var(--muted)';
        const winnerCode = winnerDriver ? winnerDriver.code : '—';

        if (race.winner) {
            cell.style.borderColor = winnerColor;
        }

        cell.innerHTML = `
            <div class="race-cell-round">R${race.round}</div>
            <div class="race-cell-winner" style="color: ${winnerColor}">${winnerCode}</div>
        `;

        // Tooltip
        cell.addEventListener('mousemove', (e) => {
            tooltip.style.opacity = '1';
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top = (e.clientY - 10) + 'px';
            tooltip.innerHTML = `
                <div style="font-weight:700; margin-bottom:4px; font-size:0.9rem;">${race.raceName}</div>
                <div style="color:${colorA}">${driverA.code} P${race.posA ?? '—'} &nbsp; ${race.roundA ?? ''} ${formatTime(race.timeA)}</div>
                <div style="color:${colorB}">${driverB.code} P${race.posB ?? '—'} &nbsp; ${race.roundB ?? ''} ${formatTime(race.timeB)}</div>
            `;
        });

        cell.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });

        grid.appendChild(cell);
    });
}

// ── Driver list ──────────────────────────────────────────────────
function renderDriverList() {
    const list = document.getElementById('driver-list');
    list.innerHTML = '';

    allDrivers.forEach(driver => {
        const color = getDriverColor(driver);
        const li = document.createElement('li');
        li.className = 'driver-item';
        li.style.setProperty('--driver-color', color);

        const isA = selectedPair[0]?.driverId === driver.driverId;
        const isB = selectedPair[1]?.driverId === driver.driverId;
        if (isA) li.classList.add('selected-a');
        if (isB) li.classList.add('selected-b');

        li.innerHTML = `
            <div class="driver-swatch" style="background:${color}"></div>
            <span>${driver.code || driver.familyName}</span>
            <span class="driver-team">${driver.team}</span>
        `;

        li.addEventListener('click', () => handleDriverClick(driver));
        list.appendChild(li);
    });
}

function handleDriverClick(driver) {
    const idx = selectedPair.findIndex(d => d.driverId === driver.driverId);

    if (idx !== -1) {
        // Deselect
        selectedPair.splice(idx, 1);
    } else if (selectedPair.length < 2) {
        selectedPair.push(driver);
    } else {
        // Replace second driver
        selectedPair[1] = driver;
    }

    renderDriverList();
    if (selectedPair.length === 2) render();
    else document.getElementById('h2h-content').innerHTML = `<div class="loading-msg">Select two drivers to compare</div>`;
}

// ── Auto-select first constructor's two drivers ──────────────────
function autoSelectTeammates(standings) {
    if (standings.length < 2) return;

    // First constructor in standings = the constructor of the P1 driver
    const firstConstructorId = standings[0].Constructors[0].constructorId;
    const teammates = allDrivers.filter(d => d.constructorId === firstConstructorId);

    if (teammates.length >= 2) {
        selectedPair = [teammates[0], teammates[1]];
    } else {
        // Fallback: pick first two drivers
        selectedPair = [allDrivers[0], allDrivers[1]];
    }
}

// ── Init ─────────────────────────────────────────────────────────
async function init(year = 2026) {
    selectedYear = year;
    selectedPair = [];
    allDrivers = [];
    qualiData = [];

    document.getElementById('h2h-content').innerHTML = `<div class="loading-msg">Loading...</div>`;
    document.getElementById('driver-list').innerHTML = '';

    try {
        const [standingsData, races] = await Promise.all([
            getDriverStandings(year),
            fetchQualiResults(year)
        ]);

        qualiData = races;

        const standings = extractStandings(standingsData);

        allDrivers = standings.map(s => ({
            driverId: s.Driver.driverId,
            code: s.Driver.code,
            givenName: s.Driver.givenName,
            familyName: s.Driver.familyName,
            team: s.Constructors[0].name,
            constructorId: s.Constructors[0].constructorId,
        }));

        // Pre-build color map in standings order so teammates get consistent variation
        allDrivers.forEach(d => getDriverColor(d));

        autoSelectTeammates(standings);
        renderDriverList();
        render();

    } catch (err) {
        console.error('Error loading qualifying data:', err);
        document.getElementById('h2h-content').innerHTML = `<div class="loading-msg">Error loading data.</div>`;
    }
}

// ── Year buttons ─────────────────────────────────────────────────
document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        init(parseInt(this.dataset.year));
    });
});

// ── Boot ─────────────────────────────────────────────────────────
init(2026);

// Add at the bottom of quali.js
export async function fetchQualiForDrivers(year) {
    return fetchQualiResults(year);
}

export { buildH2H };