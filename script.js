//F1 Points Chart

// TODO create a new page for qualifying head to head battles
// TODO add "W" labels for wins
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

async function fetchDriverStandings(year = 2025) {
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
        console.log("Completed Races:", completedRaces.length);
        updateXAxis(completedRaces.length);

    } catch (error) {
        console.error("Error fetching F1 data:", error);
    }
}

async function fetchTeamStandings(year = 2025) {
    const url = `https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`;
    // const url = `https://ergast.com/api/f1/${year}/constructorStandings.json`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log("Fetched Team Data:", data);

        selectedTeams = []; // Reset selected teams
        teams = []; // Reset teams
        updateChart();
        if (!data || !data.MRData.StandingsTable.StandingsLists.length) {
            console.error("No team standings data found.");
            return;
        }
        // Extract team standings
        const standings = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;
        console.log("Constructor standings:", standings);

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

//TODO refactor code to be able to select more than 2 drivers
import { calculateDifferences } from './stats.js';


document.querySelectorAll(".year-option").forEach(yearOption => {
    yearOption.addEventListener("click", function () {
        document.querySelectorAll(".year-option").forEach(el => el.classList.remove("current"));
        const clickedYear = this.innerHTML;
        console.log("Selected year:", clickedYear);
        selectedYear = clickedYear; // Update selected year
        this.classList.add("current");
        showLoadingMessage()
        clearChart();
        showLoadingMessage();
        console.log("Selected view:", selectedView);
        if (selectedView === 'drivers') {
            fetchDriverStandings(clickedYear); // Fetch new data
        } else if (selectedView === 'teams') {
            fetchTeamStandings(clickedYear); // Fetch new data
        }
    });
});

function clearChart() {
    console.log("Clearing chart...");
    svg.selectAll(".line").remove();  // Remove previous lines
    svg.selectAll(".legend").remove(); // Remove legends
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
    const baseHex = teamColors[team] || "#888"; // fallback gray
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
    return finalColor;
}



let currentView = "drivers"; // default
let currentYear = 2025;



// Populate the driver list dynamically
function updateDriverList(standings) {
    const driverList = d3.select("#driver-list");
    driverList.html(""); // Clear previous list

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
            .text(`${driver.Driver.code}`)
            .on("click", function () {
                // console.log("Driver selected:", driverId);
                handleDriverSelection(driverId);
            });
        drivers.push(driverId);
    });
}
console.log("Drivers:", drivers);

function updateTeamList(standings) {
    const driverList = d3.select("#driver-list");
    driverList.html(""); // Clear previous list

    standings.forEach(team => {
        const teamId = {
            teamId: team.Constructor.constructorId,
            name: team.Constructor.name,
        }
        driverList.append("li")
            .attr("class", "list-group-item")
            .attr("data-team", teamId.teamId)
            .text(`${team.Constructor.name}`)
            .on("click", function () {
                // console.log("Driver selected:", driverId);
                handleTeamSelection(teamId);
            });
        drivers.push(teamId);
    });

}
const handleDriverSelection = (driverObj) => {

    // const driver = d3.select(this); // Read driver from attribute
    if (!selectedDrivers) selectedDrivers = []; // Ensure it's always an array

    // Check if the driver is valid before proceeding
    // console.log("Drivers:", driverObj);

    if (!drivers.find(dri => dri.driverId === driverObj.driverId)) {
        console.error(`Invalid driver selected: ${driverObj}`);
        return;
    }

    // Toggle selection
if (selectedDrivers.some(d => d.driverId === driverObj.driverId)) {
  selectedDrivers = selectedDrivers.filter(d => d.driverId !== driverObj.driverId);
} else if (selectedDrivers.length < 8) {
  selectedDrivers.push(driverObj);
}

    d3.selectAll(".list-group-item")
        .classed("selected", function () {
            const elementDriverId = d3.select(this).attr("data-driver");
            return selectedDrivers.some(d => d.driverId.includes(elementDriverId));
        });

    // Update chart if at least 2 drivers are selected
    if (selectedDrivers.length >= 2) {
        updateChart();
    }
    console.log(selectedDrivers);
}

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
    }
    console.log(selectedTeams);
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
const xScale = d3.scaleLinear().domain([0, 24]).range([0, width]);
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
        console.log("Selected drivers:", driver1, driver2);
        console.log(drivers.find(dri => dri.driverId === driver1.driverId))
        calculateDifferences(selectedDrivers)
    } else if (selectedView === 'teams') {
        const [team1, team2] = selectedTeams;
        console.log("Selected teams:", team1, team2);
        console.log(teams.find(team => team.teamId === team1.teamId))
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

    // Define line generator
    const lineGenerator = d3.line()
        .x((d, i) => xScale(i))
        .y(d => yScale(d));

    if (selectedView === 'drivers') {
        selectedDrivers.forEach((driver, i) => {
            
            svg.append("path")
                .datum(driversDiffs[i])
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", d =>  getDriverColor(driver))
                .attr("stroke-width", 4)
                .attr("d", lineGenerator);

            svg.append("text")
                .attr("class", "legend")
                .attr("x", 0 + 10)
                .attr("y", 20 + i * 25)
                .attr("fill", d => getDriverColor(driver))
                .text(`${driver.familyName}`);
        });
    } else if (selectedView === 'teams') {
        selectedTeams.forEach((team, i) => {
            svg.append("path")
                .datum(driversDiffs[i])
                .attr("class", "line")
                .attr("fill", "none")
                .attr("stroke", d => teamColors[team.name])
                .attr("stroke-width", 4)
                .attr("d", lineGenerator);

            svg.append("text")
                .attr("class", "legend")
                .attr("x", 0 + 10)
                .attr("y", 20 + i * 25)
                .attr("fill", d => teamColors[team.name])
                .text(`${team.name}`);
        })
    }

    svg.append("g")
        .attr("class", "grid")
        .attr("color", "grey")
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

    svg.append("g")
        .attr("class", "grid")
        .attr("color", "grey")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(""));


}

document.getElementById("show-drivers").addEventListener("click", () => {
    selectedView = "drivers";
    fetchDriverStandings(selectedYear, selectedView);
    setActive("drivers");
});

document.getElementById("show-teams").addEventListener("click", () => {
    selectedView = "teams";
    fetchTeamStandings(selectedYear, selectedView);
    setActive("teams");
});

function setActive(view) {
    document.getElementById("show-drivers").classList.toggle("active", view === "drivers");
    document.getElementById("show-teams").classList.toggle("active", view === "teams");
}


// Call API on page load
fetchDriverStandings();


// Initial chart (empty)
updateChart();

// // Add lines
// svg.append("path")
//     .datum(verDiff)
//     .attr("fill", "none")
//     .attr("stroke", "blue")
//     .attr("stroke-width", 2)
//     .attr("d", lineGenerator);

// svg.append("path")
//     .datum(perDiff)
//     .attr("fill", "none")
//     .attr("stroke", "yellow")
//     .attr("stroke-width", 2)
//     .attr("d", lineGenerator);

// Update X-axis based on number of
const updateXAxis = (numRaces) => {
    console.log("Updating X-axis with", numRaces)
    // Update X-axis
    xScale.domain([0, numRaces]);
    svg.select(".x-axis")
        .transition().duration(500)
        .call(d3.axisBottom(xScale).ticks(numRaces));
}

