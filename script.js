//F1 Points Chart

// TODO create a new page for qualifying head to head battles
// TODO - add a toggle to switch between points and qualifying performance (e.g., average qualifying position vs average grid position)
// Todo - In mobile view have years above drivers or teams.
// Todo - Add delta lap gaps for each race the first driver is the comparison.
//?Done reset labels when switching between different drivers
//?Done add result numbers on the dots
//?Done have x axis be with the chart box
//?Done have the chart be responsive to screen size
//?Done - create more buffer between y axis label and chart border
//----Global Variables----
export let selectedYear = 2025; // Default year
export let selectedView = 'drivers'; // Default view
let drivers = [];
let selectedDrivers = [];
let teams = [];
let selectedTeams = [];
let seasonRaces = 24


// Fetch F1 data from API
// TODO - chat height the same as the side column
/* TODO Retrieve the height of the target element using JavaScript (e.g., element.getBoundingClientRect().height). 
Apply the retrieved height to the other element using element.style.height = height + 'px';.  */

import { getDriverStandings, getSeasonDetails, getRaceWinners } from './api.js';
import { extractStandings, getCompletedRaces } from './helpers.js';
import { fetchQualiForDrivers, buildH2H } from './quali.js';
import { calculateDifferences } from './stats.js';


async function fetchDriverStandings(year = 2025) {
    // Clear color caches so new year gets fresh team colors
    Object.keys(teamDriverMap).forEach(k => delete teamDriverMap[k]);
    Object.keys(driverColorMap).forEach(k => delete driverColorMap[k]);

    try {
        // Fetch driver standings
        const standingsData = await getDriverStandings(year);
        const standings = extractStandings(standingsData);

        // Reset state
        selectedDrivers = [];
        drivers = [];

        if (standings.length === 0) {
            console.error("No standings data found.");
            return;
        }

        updateDriverList(standings);
        if (selectedDrivers.length >= 2) {
            updateChart();
        }

        // Fetch season details
        const seasonData = await getSeasonDetails(year);
        const completedRaces = getCompletedRaces(seasonData);
        // console.log("Completed Races:", completedRaces.length);
        updateXAxis(completedRaces.length);
        renderRaceList(seasonData);

    } catch (error) {
        console.error("Error fetching F1 data:", error);
    }
}

// Instantiate once outside the function
const raceGapChart = new RaceGapChart('#raceChart');

function renderRaceList(seasonData) {
    const races = seasonData.MRData.RaceTable.Races;
    const container = document.getElementById('races');
    container.innerHTML = '';

    races.forEach(race => {
        const el = document.createElement('li');
        el.id = `race-${race.round}`;
        el.dataset.round = race.round;
        el.className = 'list-group-item';
        el.textContent = race.raceName.substring(0, 3).toUpperCase();
        el.title = race.raceName;
        console.log(race)

        el.addEventListener('click', function () {
            const alreadySelected = this.classList.contains('current-race');

            document.querySelectorAll('#races .list-group-item')
                .forEach(r => r.classList.remove('current-race'));

            if (alreadySelected) {
                document.getElementById('chart').style.display = 'block';
                document.getElementById('raceChart').style.display = 'none';
            } else {
                this.classList.add('current-race');
                document.getElementById('chart').style.display = 'none';
                document.getElementById('raceChart').style.display = 'block';

                // Use selected drivers if any, otherwise all drivers
                const driverIds = selectedDrivers.length >= 1
                    ? selectedDrivers.map(d => d.driverId)
                    : drivers.map(d => d.driverId);

                raceGapChart.load({
                    season: selectedYear,
                    round: parseInt(race.round),
                    driverIds,
                });
            }
        });

        container.appendChild(el);
    });
}



async function fetchTeamStandings(year = 2025) {
    // Clear color caches so new year gets fresh team colors
    Object.keys(teamDriverMap).forEach(k => delete teamDriverMap[k]);
    Object.keys(driverColorMap).forEach(k => delete driverColorMap[k]);
    const url = `https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`;
    // const url = `https://ergast.com/api/f1/${year}/constructorStandings.json`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        // console.log("Fetched Team Data:", data);

        selectedTeams = []; // Reset selected teams
        teams = []; // Reset teams
        updateChart();
        if (!data || !data.MRData.StandingsTable.StandingsLists.length) {
            console.error("No team standings data found.");
            return;
        }
        // Extract team standings
        const standings = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;
        // console.log("Constructor standings:", standings);

        const seasonData = await getSeasonDetails(year);
        const completedRaces = getCompletedRaces(seasonData);
        updateXAxis(completedRaces.length);
        updateTeamList(standings)
            // Format the result
            ;
        // You can add functionality to display team standings if needed
    } catch (error) {
        console.error("Error fetching team data:", error);
    }
}



document.querySelectorAll(".year-option").forEach(yearOption => {
    yearOption.addEventListener("click", function () {
        document.querySelectorAll(".year-option").forEach(el => el.classList.remove("current"));
        const clickedYear = this.innerHTML;
        // console.log("Selected year:", clickedYear);
        selectedYear = clickedYear; // Update selected year
        this.classList.add("current");
        pushState();
        showLoadingMessage()
        clearChart();
        showLoadingMessage();

        gtag('event', 'year_changed', {
            year: clickedYear
        });

        // console.log("Selected view:", selectedView);
        if (selectedView === 'drivers') {
            fetchDriverStandings(clickedYear); // Fetch new data
        } else if (selectedView === 'teams') {
            fetchTeamStandings(clickedYear); // Fetch new data
        }
    });
});

function clearChart() {
    // console.log("Clearing chart...");
    svg.selectAll(".line").remove();  // Remove previous lines
    svg.selectAll(".legend").remove(); // Remove legends
    svg.selectAll(".dot-group").remove();
}


function showLoadingMessage() {
    const driverList = d3.select("#driver-list");
    driverList.html(""); // Clear current list
    driverList.append("div")
    // .attr("class", "list-group-item text-center font-italic")
    // .text("Loading...");
}
import { teamColors } from './colors.js';

// Map of team -> list of drivers (so we know the index for variation)
const teamDriverMap = {};
// Map of driver -> final color
const driverColorMap = {};

function getDriverColor(driver) {
    const team = driver.team;

    if (!teamDriverMap[team]) teamDriverMap[team] = [];
    if (!teamDriverMap[team].includes(driver.driverId)) teamDriverMap[team].push(driver.driverId);
    if (driverColorMap[driver.driverId]) return driverColorMap[driver.driverId];

    const baseHex = teamColors[team];

    if (!baseHex) {
        console.warn(`No color found for team: "${team}"`); // ← shows exact team name
        driverColorMap[driver.driverId] = "#f2ff00";
        return "#f2ff00";
    }
    // Initialize team list if not present
    if (!teamDriverMap[team]) {
        teamDriverMap[team] = [];
    }

    // Add driver to team list if not present
    if (!teamDriverMap[team].includes(driver.driverId)) {
        teamDriverMap[team].push(driver.driverId);
    }

    // Return cached color if we’ve already generated one
    if (driverColorMap[driver.driverId]) {
        return driverColorMap[driver.driverId];
    }

    // Base color from your custom team color map
    // const baseHex = teamColors[team] || "#eaff00"; // fallback gray
    const baseColor = d3.color(baseHex);

    const indexInTeam = teamDriverMap[team].indexOf(driver.driverId);

    // Convert to HSL for easier adjustment
    const colorVariant = d3.hsl(baseColor);

    // Generate variation — adjust lightness or saturation based on driver index
    // First driver: base color, second: slightly darker/lighter, etc.
    const variation = 0.12 * indexInTeam;
    colorVariant.l = Math.max(0.3, Math.min(0.8, colorVariant.l - variation));

    // Optionally tweak saturation too
    colorVariant.s = Math.max(0.4, Math.min(1, colorVariant.s + variation * 0.5));

    const finalColor = colorVariant.toString();

    // Cache it
    driverColorMap[driver.driverId] = finalColor;
    // console.log(`Assigned color for ${driver.givenName} ${driver.familyName} (${team}):`, finalColor);
    return finalColor;
}



let currentView = "drivers"; // default
let currentYear = 2025;



// Populate the driver list dynamically
function updateDriverList(standings) {
    const driverList = d3.select("#driver-list");
    driverList.html(""); // Clear previous list
    driverList.attr("class", "list-group");

    standings.forEach(driver => {
        const driverId = {
            driverId: driver.Driver.driverId,
            givenName: driver.Driver.givenName,
            familyName: driver.Driver.familyName,
            team: driver.Constructors[0].name
        }
        driverList.append("li")
            .attr("class", "list-group-item")
            .attr("data-driver", driverId.driverId)
            .style("--team-color", getDriverColor(driverId))
            .text(`${driver.Driver.code}`)
            .on("click", function () {
                // console.log("Driver selected:", driverId);
                handleDriverSelection(driverId);
            });
        drivers.push(driverId);
    });
}
// console.log("Drivers:", drivers);

function updateTeamList(standings) {
    const driverList = d3.select("#driver-list");
    driverList.html(""); // Clear previous list
    driverList.attr("class", "list-group team-list");

    standings.forEach(team => {
        const teamId = {
            teamId: team.Constructor.constructorId,
            name: team.Constructor.name,
        }
        driverList.append("li")
            .attr("class", "list-group-item")
            .attr("data-team", teamId.teamId)
            .style("--team-color", teamColors[teamId.name] || "#888")  // ← add this
            .text(`${team.Constructor.name}`)
            .on("click", function () {
                // console.log("Driver selected:", driverId);
                handleTeamSelection(teamId);
            });
        drivers.push(teamId);
    });

}
const handleDriverSelection = (driverObj) => {
    if (!selectedDrivers) selectedDrivers = [];

    if (!drivers.find(dri => dri.driverId === driverObj.driverId)) return;

    if (selectedDrivers.some(d => d.driverId === driverObj.driverId)) {
        selectedDrivers = selectedDrivers.filter(d => d.driverId !== driverObj.driverId);
    } else {
        const limit = currentTab === 'quali' ? 2 : 8;
        if (selectedDrivers.length < limit) selectedDrivers.push(driverObj);
        else if (currentTab === 'quali') selectedDrivers = [selectedDrivers[1], driverObj]; // swap oldest
    }

    d3.selectAll(".list-group-item")
        .classed("selected", function () {
            const elementDriverId = d3.select(this).attr("data-driver");
            return selectedDrivers.some(d => d.driverId.includes(elementDriverId));
        });

    if (currentTab === 'race' && selectedDrivers.length >= 2) updateChart();
    else if (currentTab === 'quali' && selectedDrivers.length === 2) renderQualiH2H(selectedDrivers);
    pushState();

    gtag('event', 'driver_selected', {
        driver_id: driverObj.driverId,
        driver_name: driverObj.familyName,
        year: selectedYear,
        total_selected: selectedDrivers.length
    });

};

const handleTeamSelection = (teamObj) => {
    // const driver = d3.select(this); // Read driver from attribute
    if (!selectedTeams) selectedTeams = []; // Ensure it's always an array

    // Check if the driver is valid before proceeding
    // console.log("Drivers:", driverObj);

    if (!drivers.find(dri => dri.teamId === teamObj.teamId)) {
        console.error(`Invalid team selected: ${teamObj}`);
        return;
    }

    // Toggle selection
    if (selectedTeams.includes(teamObj)) {
        selectedTeams = selectedTeams.filter(d => d !== teamObj);
    } else if (selectedTeams.length < 10) {
        console.log("Selecting team:", teamObj);
        selectedTeams.push(teamObj);
    }

    d3.selectAll(".list-group-item")
        .classed("selected", function () {
            const elementTeamId = d3.select(this).attr("data-team");
            return selectedTeams.some(d => d.teamId.includes(elementTeamId));
        });

    // Update chart if at least 2 drivers are selected
    if (selectedTeams.length >= 2) {
        updateTeamChart();
        pushState();
    }
    // console.log(selectedTeams);
}

// Available colors for different drivers
const colors = d3.scaleOrdinal(d3.schemeCategory10);
//----Chart----

// let chart = document.getElementById("chart");

// Set up chart dimensions
const w = Math.min(window.innerWidth * 0.9, 1148); // Scale width based on screen
// const w = window.innerWidth < 768 ? window.innerWidth - 40 : 800;
const h = Math.min(window.innerHeight * 0.9, 470); // Adjust height for small screens
const margin = { top: 20, right: 20, bottom: 50, left: 50 };
const width = w - margin.left - margin.right;
const height = h - margin.top - margin.bottom;

// Create SVG element
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", w)
    .attr("height", h)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", `0 0 ${w} ${h}`)
    .classed("svg-content-responsive", true)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Resize function
window.addEventListener("resize", () => {
    d3.select("#chart").attr("width", Math.min(window.innerWidth * 0.9, 1148))
        .attr("height", Math.min(window.innerHeight * 0.6, 470));
    updateChart();
});

// Define scales
const xScale = d3.scaleLinear().domain([1, 24]).range([0, width]);
const yScale = d3.scaleLinear().domain([0, 25]).range([height, 0]);

// Add axes
svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).ticks(20));

svg.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale));

// Add labels
svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .text("Race Number");

svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .text("Δ Points vs Avg Drivers/Teams");

/* // Add X axis
svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).ticks(verDiff.length))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .text("Race Number");

// Add Y axis
svg.append("g")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -40)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .text("Points Difference"); */

// Add gridlines


// Create the driver list
const driverList = d3.select("#driver-list");

// Track selected drivers

// Populate driver list with clickable items
// console.log("Drivers:", drivers);





// Line generator function
const lineGenerator = d3.line()
    .x((d, i) => xScale(i))
    .y((d) => yScale(d));

// Function to update chart based on selected drivers
function updateChart() {
    svg.selectAll(".line").remove();
    svg.selectAll(".legend").remove();
    svg.selectAll(".grid").remove();
    svg.selectAll(".dot-group").remove();

    /*    if (selectedDrivers.length !== 2) {
           console.warn("Please select exactly two drivers to compare.");
           return;
       } */

    /*  async function getRaceWinners(season) {
        const url = `https://api.jolpi.ca/ergast/f1/${season}/results/1.json?limit=300`; 
        try {
            const response = await fetch(url);
            const data = await response.json();
    
            const races = data.MRData.RaceTable.Races;
    
            const winners = races.map(race => {
                const result = race.Results[0]; // Winner is always position 1
                return {
                    round: parseInt(race.round, 10),
                    driverId: result.Driver.driverId,
                    winner: `${result.Driver.givenName} ${result.Driver.familyName}`,
                    points: parseFloat(result.points), // include points!
                };
            });
    
            return winners;
        } catch (error) {
            console.error("Error fetching race winners:", error);
            return [];
        }
    } */


    if (selectedView === 'drivers') {
        const [driver1, driver2] = selectedDrivers;
        // console.log("Selected drivers:", driver1, driver2);
        // console.log(drivers.find(dri => dri.driverId === driver1.driverId))
        calculateDifferences(selectedDrivers)
    } else if (selectedView === 'teams') {
        const [team1, team2] = selectedTeams;
        // console.log("Selected teams:", team1, team2);
        // console.log(teams.find(team => team.teamId === team1.teamId))
        calculateDifferences(selectedTeams)
    }
    // Pass the actual arrays of points, not strings
    /*     const { averagePoints, driver1Diff, driver2Diff } = calculateDifferences(
            drivers.find(dri => dri.driverId === driver1.driverId), 
            drivers.find(dri => dri.driverId === driver2.driverId)
        ); */
}

function updateTeamChart() {
    svg.selectAll(".line").remove();
    svg.selectAll(".legend").remove();
    svg.selectAll(".grid").remove();
    svg.selectAll(".dot-group").remove();

    calculateDifferences(selectedTeams)
}

export const updateChartWithData = async (averagePoints, ...driversDiffs) => {


    if (selectedView === 'drivers' && (!selectedDrivers || selectedDrivers.length < 2)) {
        console.warn("Please select at least two drivers to compare.");
        return;

    } else if (selectedView === 'teams' && (!selectedTeams || selectedTeams.length < 2)) {
        console.warn("Please select at least two teams to compare.");
        return;
    }


    // Determine Y-axis range
    const allDiffs = driversDiffs.flat();
    const minY = Math.min(...allDiffs);
    const maxY = Math.max(...allDiffs);

    // Update yScale domain with padding
    yScale.domain([minY - 5, maxY + 5]);

    // Update Y-axis
    svg.select(".y-axis")
        .transition().duration(500)
        .call(d3.axisLeft(yScale));

    // Remove old lines
    svg.selectAll(".line").remove();
    svg.selectAll(".legend").remove();
    svg.selectAll(".grid").remove();
    svg.selectAll(".dot-group").remove();

    // Define line generator
    const lineGenerator = d3.line()
        .x((d, i) => xScale(i + 1))
        .y(d => yScale(d));
    svg.append("g")
        .attr("class", "grid")
        .attr("color", "grey")
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

    svg.append("g")
        .attr("class", "grid")
        .attr("color", "grey")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(""));

    if (selectedView === 'drivers') {
        // After drawing the line for each driver:
        selectedDrivers.forEach((driver, i) => {
            const diffData = driversDiffs[i];

            // Line
            svg.append("path")
                .datum(diffData)
                .attr("class", `line line-${driver.driverId}`)
                .attr("fill", "none")
                .attr("stroke", "transparent")
                .attr("stroke-width", 20)
                .attr("d", lineGenerator)
                .on("mouseover", function () {
                    //     // Dim all lines and dots
                    //     svg.selectAll(".line")
                    //         .attr("opacity", 0.35);
                    //     svg.selectAll(".dot-group")
                    //         .attr("opacity", 0.35);
                    //     svg.selectAll(".legend")
                    //         .attr("opacity", 0.35);

                    // Bring hovered driver to full opacity and front
                    svg.selectAll(`.line-${driver.driverId}`)
                        .attr("opacity", 1)
                        .raise();
                    svg.selectAll(`.dot-group-${driver.driverId}`)
                        .attr("opacity", 1)
                        .raise();
                    //     svg.selectAll(`.legend-${driver.driverId}`)
                    //         .attr("opacity", 1)
                    //         .attr("font-weight", "bold")
                    //         .attr("font-size", "16px");
                })
            // .on("mouseout", function () {
            //     // Restore everything
            //     svg.selectAll(".line")
            //         .attr("opacity", 1);
            //     svg.selectAll(".dot-group")
            //         .attr("opacity", 1);
            //     svg.selectAll(".legend")
            //         .attr("opacity", 1)
            //         .attr("font-weight", "normal")
            //         .attr("font-size", "12px")
            //         .attr("text-decoration", "none");
            // });

            svg.append("path")
                .datum(diffData)
                .attr("class", `line line-${driver.driverId}`)
                .attr("fill", "none")
                .attr("stroke", getDriverColor(driver))
                .attr("stroke-width", 4)
                .attr("pointer-events", "none")  // ← let the hit area above handle events
                .attr("d", lineGenerator);
            // Dots with finishing position labels
            const dotGroup = svg.append("g")
                .attr("class", `dot-group dot-group-${driver.driverId}`);

            diffData.forEach((d, idx) => {
                const cx = xScale(idx);
                const cy = yScale(d);
                const pos = driver.results?.[idx]?.position ?? "";

                // Circle
                dotGroup.append("circle")
                    .attr("cx", xScale(idx + 1))
                    .attr("cy", cy)
                    .attr("r", 10)
                    .attr("fill", pos === 1 ? "gold" : pos === 2 ? "silver" : pos === 3 ? "#cd7f32" : getDriverColor(driver))
                    .attr("stroke", "#111")
                    .attr("stroke-width", 1)
                    .attr("pointer-events", "none");

                // Position number inside dot
                dotGroup.append("text")
                    .attr("x", xScale(idx + 1))
                    .attr("y", cy + 4) // vertically center text in circle
                    .attr("text-anchor", "middle")
                    .attr("fill", "white")
                    .attr("font-size", "9px")
                    .attr("font-weight", "bold")
                    .attr("pointer-events", "none")
                    .text(pos);
            });

            // Legend
            svg.append("text")
                .attr("class", `legend legend-${driver.driverId}`)
                .style("cursor", "default")
                .attr("x", 10)
                .attr("y", 20 + i * 25)

                .attr("fill", getDriverColor(driver))
                .text(`${driver.familyName}`)
                .on("mouseover", function () {
                    // Dim all lines and dots
                    svg.selectAll(".line")
                        .attr("opacity", 0.35);
                    svg.selectAll(".dot-group")
                        .attr("opacity", 0.35);
                    svg.selectAll(".legend")
                        .attr("opacity", 0.35);

                    // Bring hovered driver to full opacity and front
                    svg.selectAll(`.line-${driver.driverId}`)
                        .attr("opacity", 1)
                        .raise();
                    svg.selectAll(`.dot-group-${driver.driverId}`)
                        .attr("opacity", 1)
                        .raise();
                    svg.selectAll(`.legend-${driver.driverId}`)
                        .attr("opacity", 1)
                        .attr("font-weight", "bold")
                        .attr("font-size", "16px");
                })
                .on("mouseout", function () {
                    // Restore everything
                    svg.selectAll(".line")
                        .attr("opacity", 1);
                    svg.selectAll(".dot-group")
                        .attr("opacity", 1);
                    svg.selectAll(".legend")
                        .attr("opacity", 1)
                        .attr("font-weight", "normal")
                        .attr("font-size", "12px")
                        .attr("text-decoration", "none");
                });
        });
    } else if (selectedView === 'teams') {
        selectedTeams.forEach((team, i) => {
            const color = getDriverColor({ driverId: team.teamId, team: team.name });

            svg.append("path")
                .datum(driversDiffs[i])
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 4)
                .attr("d", lineGenerator);

            svg.append("text")
                .attr("class", "legend")
                .attr("x", 10)
                .attr("y", 20 + i * 25)
                .attr("fill", color)
                .text(`${team.name}`);
        });
    }
}


export async function renderQualiH2H([driverA, driverB]) {
    clearChart();



    // Show loading state
    svg.append("text")
        .attr("class", "quali-h2h")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#666")
        .attr("font-family", "Barlow Condensed, sans-serif")
        .attr("letter-spacing", "0.1em")
        .attr("font-size", "13px")
        .text("LOADING QUALIFYING DATA...");

    const races = await fetchQualiForDrivers(selectedYear);

    svg.selectAll(".quali-h2h").remove();

    const h2h = buildH2H(races, driverA, driverB); // reuse from quali.js
    const winsA = h2h.filter(r => r.winner === 'a').length;
    const winsB = h2h.filter(r => r.winner === 'b').length;
    const total = winsA + winsB || 1;

    const colorA = getDriverColor(driverA);
    const colorB = getDriverColor(driverB);

    // ── Driver name labels ──────────────────────────────────
    svg.append("text").attr("class", "quali-h2h")
        .attr("x", width / 2 - 20).attr("y", 30)
        .attr("text-anchor", "end")
        .attr("fill", colorA)
        .attr("font-family", "Barlow Condensed, sans-serif")
        .attr("font-weight", 800).attr("font-size", "22px")
        .attr("letter-spacing", "0.06em")
        .text(driverA.familyName.toUpperCase());

    svg.append("text").attr("class", "quali-h2h")
        .attr("x", width / 2 + 20).attr("y", 30)
        .attr("text-anchor", "start")
        .attr("fill", colorB)
        .attr("font-family", "Barlow Condensed, sans-serif")
        .attr("font-weight", 800).attr("font-size", "22px")
        .attr("letter-spacing", "0.06em")
        .text(driverB.familyName.toUpperCase());

    svg.append("text").attr("class", "quali-h2h")
        .attr("x", width / 2).attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("fill", "#555")
        .attr("font-family", "Barlow Condensed, sans-serif")
        .attr("font-size", "13px")
        .text("VS");

    // ── Score numbers ───────────────────────────────────────
    svg.append("text").attr("class", "quali-h2h")
        .attr("x", width / 2 - 20).attr("y", 65)
        .attr("text-anchor", "end")
        .attr("fill", colorA)
        .attr("font-family", "Barlow Condensed, sans-serif")
        .attr("font-weight", 800).attr("font-size", "42px")
        .text(winsA);

    svg.append("text").attr("class", "quali-h2h")
        .attr("x", width / 2 + 20).attr("y", 65)
        .attr("text-anchor", "start")
        .attr("fill", colorB)
        .attr("font-family", "Barlow Condensed, sans-serif")
        .attr("font-weight", 800).attr("font-size", "42px")
        .text(winsB);

    // ── Score bar ───────────────────────────────────────────
    const barY = 85;
    const barH = 8;

    svg.append("rect").attr("class", "quali-h2h")
        .attr("x", 0).attr("y", barY)
        .attr("width", width).attr("height", barH)
        .attr("fill", "#1a1a1a");

    svg.append("rect").attr("class", "quali-h2h")
        .attr("x", 0).attr("y", barY)
        .attr("width", (winsA / total) * width).attr("height", barH)
        .attr("fill", colorA);

    svg.append("rect").attr("class", "quali-h2h")
        .attr("x", (winsA / total) * width).attr("y", barY)
        .attr("width", (winsB / total) * width).attr("height", barH)
        .attr("fill", colorB);

    // ── Race cells ──────────────────────────────────────────
    const cellW = 44;
    const cellH = 36;
    const cols = Math.floor(width / (cellW + 4));
    const startY = barY + barH + 20;

    h2h.forEach((race, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = col * (cellW + 4);
        const y = startY + row * (cellH + 4);

        const winnerDriver = race.winner === 'a' ? driverA : race.winner === 'b' ? driverB : null;
        const winColor = winnerDriver ? getDriverColor(winnerDriver) : '#2a2a2a';
        const winCode = winnerDriver ? (winnerDriver.familyName.substring(0, 3).toUpperCase()) : '—';

        // Cell background
        svg.append("rect").attr("class", "quali-h2h")
            .attr("x", x).attr("y", y)
            .attr("width", cellW).attr("height", cellH)
            .attr("fill", "#111")
            .attr("stroke", race.winner ? winColor : "#222")
            .attr("stroke-width", 1);

        // Round label
        svg.append("text").attr("class", "quali-h2h")
            .attr("x", x + cellW / 2).attr("y", y + 12)
            .attr("text-anchor", "middle")
            .attr("fill", "#555")
            .attr("font-family", "Barlow Condensed, sans-serif")
            .attr("font-size", "9px")
            .attr("letter-spacing", "0.06em")
            .text(`R${race.round}`);

        // Winner code
        svg.append("text").attr("class", "quali-h2h")
            .attr("x", x + cellW / 2).attr("y", y + 27)
            .attr("text-anchor", "middle")
            .attr("fill", winColor)
            .attr("font-family", "Barlow Condensed, sans-serif")
            .attr("font-weight", 700)
            .attr("font-size", "13px")
            .text(winCode);
    });
}

document.getElementById("show-drivers").addEventListener("click", () => {
    selectedView = "drivers";
    clearChart();
    fetchDriverStandings(selectedYear, selectedView);
    setActive("drivers");
});

document.getElementById("show-teams").addEventListener("click", () => {
    selectedView = "teams";
    clearChart();
    fetchTeamStandings(selectedYear, selectedView);
    setActive("teams");
});

function setActive(view) {
    document.getElementById("show-drivers").classList.toggle("active", view === "drivers");
    document.getElementById("show-teams").classList.toggle("active", view === "teams");
}

// Tab state
let currentTab = 'race'; // 'race' | 'quali'

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentTab = this.dataset.tab;
        pushState();

        clearChart();

        if (currentTab === 'race') {
            // Restore race view
            if (selectedView === 'drivers' && selectedDrivers.length >= 2) updateChart();
            else if (selectedView === 'teams' && selectedTeams.length >= 2) updateTeamChart();
        } else if (currentTab === 'quali') {
            // Limit selection to 2, re-render quali if already 2 selected
            if (selectedDrivers.length > 2) selectedDrivers = selectedDrivers.slice(0, 2);
            if (selectedDrivers.length === 2) renderQualiH2H(selectedDrivers);
            else clearChart();
        }
    });
});

// ── URL State Management ─────────────────────────────────────
function pushState() {
    const params = new URLSearchParams();

    params.set('year', selectedYear);
    params.set('view', selectedView);

    if (selectedView === 'drivers' && selectedDrivers.length) {
        params.set('selected', selectedDrivers.map(d => d.driverId).join(','));
    } else if (selectedView === 'teams' && selectedTeams.length) {
        params.set('selected', selectedTeams.map(t => t.teamId).join(','));
    }

    if (currentTab !== 'race') params.set('tab', currentTab);

    window.history.replaceState({}, '', `?${params.toString()}`);
}

function readState() {
    const params = new URLSearchParams(window.location.search);
    return {
        year: params.get('year') || 2025,
        view: params.get('view') || 'drivers',
        selected: params.get('selected') ? params.get('selected').split(',') : [],
        tab: params.get('tab') || 'race',
    };
}

async function restoreFromURL() {
    const { year, view, selected, tab } = readState();

    selectedYear = year;
    selectedView = view;
    currentTab = tab;

    // Sync UI
    document.querySelectorAll('.year-option').forEach(el => {
        el.classList.toggle('current', el.innerHTML.trim() == year);
    });
    setActive(view);
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });

    if (view === 'drivers') {
        await fetchDriverStandings(year);
        if (selected.length) {
            selected.forEach(id => {
                const driver = drivers.find(d => d.driverId === id);
                if (driver) handleDriverSelection(driver);
            });
        }
    } else if (view === 'teams') {
        await fetchTeamStandings(year);
        if (selected.length) {
            selected.forEach(id => {
                const team = drivers.find(d => d.teamId === id);
                if (team) handleTeamSelection(team);
            });
        }
    }
}

// ── Snapshot / Share Button ──────────────────────────────────
document.getElementById('snapshot-btn').addEventListener('click', () => {
    const svgEl = document.querySelector('#chart svg');
    if (!svgEl) return;

    // Clone so we don't mutate the live SVG
    const clone = svgEl.cloneNode(true);

    // ── 1. Inline all computed styles on every element ──────
    const allEls = [clone, ...clone.querySelectorAll('*')];
    const liveEls = [svgEl, ...svgEl.querySelectorAll('*')];

    liveEls.forEach((liveEl, i) => {
        const computed = window.getComputedStyle(liveEl);
        const cloneEl = allEls[i];

        // Properties that matter for SVG rendering
        const props = [
            'fill', 'stroke', 'stroke-width', 'opacity',
            'font-family', 'font-size', 'font-weight',
            'letter-spacing', 'text-anchor', 'dominant-baseline'
        ];

        props.forEach(prop => {
            const val = computed.getPropertyValue(prop);
            if (val) cloneEl.style[prop] = val;
        });
    });

    // ── 2. Force-set text fills (CSS variables won't resolve in canvas) ──
    clone.querySelectorAll('text').forEach((t, i) => {
        const live = svgEl.querySelectorAll('text')[i];
        const fill = window.getComputedStyle(live).fill;
        // If fill is empty or 'none', default to white
        t.setAttribute('fill', fill && fill !== 'none' ? fill : '#f0f0f0');

        // Inline font explicitly
        t.setAttribute('font-family', 'Arial, sans-serif'); // canvas-safe fallback
    });

    // ── 3. Resolve CSS variable colors on paths/rects ───────
    clone.querySelectorAll('path, rect, circle, line').forEach((el, i) => {
        const live = svgEl.querySelectorAll('path, rect, circle, line')[i];
        if (!live) return;
        const computed = window.getComputedStyle(live);
        const stroke = computed.stroke;
        const fill = computed.fill;
        if (stroke) el.setAttribute('stroke', stroke);
        if (fill) el.setAttribute('fill', fill);
    });

    // ── 4. Add background rect so canvas isn't transparent ──
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#080808');
    clone.insertBefore(bg, clone.firstChild);

    // ── 5. Serialize and render ──────────────────────────────
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
        const watermarkH = 36;
        const padding = 40;

        const vb = svgEl.viewBox.baseVal;
        const canvas = document.createElement('canvas');
        canvas.width = vb.width || img.naturalWidth;
        canvas.height = (vb.height || img.naturalHeight) + watermarkH;

        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Chart image
        ctx.drawImage(img, 0, 0, vb.width, vb.height);

        // Watermark bar
        const barY = canvas.height - watermarkH;
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0, barY, canvas.width, watermarkH);

        // Red accent
        ctx.fillStyle = '#E10600';
        ctx.fillRect(0, barY, 3, watermarkH);

        // Domain
        ctx.font = 'bold 13px Arial, sans-serif';
        ctx.fillStyle = '#f0f0f0';
        ctx.fillText(window.location.hostname, padding, barY + 23);

        // Filter label
        const label = buildSnapshotLabel();
        ctx.fillStyle = '#666666';
        ctx.font = '12px Arial, sans-serif';
        const labelW = ctx.measureText(label).width;
        ctx.fillText(label, canvas.width - labelW - padding, barY + 23);

        const link = document.createElement('a');
        link.download = `f1-chart-${selectedYear}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        URL.revokeObjectURL(url);
    };

    img.onerror = (e) => console.error('SVG render failed:', e);
    img.src = url;
});

function buildSnapshotLabel() {
    if (selectedView === 'drivers' && selectedDrivers.length) {
        return selectedDrivers.map(d => d.familyName.toUpperCase()).join(' vs ') + ` · ${selectedYear}`;
    } else if (selectedView === 'teams' && selectedTeams.length) {
        return selectedTeams.map(t => t.name.toUpperCase()).join(' vs ') + ` · ${selectedYear}`;
    }
    return `F1 ${selectedYear}`;
}


restoreFromURL();

// Update X-axis based on number of
const updateXAxis = (numRaces) => {
    // console.log("Updating X-axis with", numRaces)
    // Update X-axis
    xScale.domain([1, numRaces]);
    svg.select(".x-axis")
        .transition().duration(500)
        .call(d3.axisBottom(xScale).ticks(numRaces));
}

