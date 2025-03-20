//2023 F1 Points

//----Global Variables----
let selectedYear = 2024; // Default year
let drivers = [];
let selectedDrivers = [];
let seasonRaces = 24

// Fetch F1 data from API
async function fetchDriverStandings(year = 2024) {
    try {
        const response = await fetch(`https://ergast.com/api/f1/${year}/driverStandings.json`);
        const data = await response.json();
        console.log("Fetched Data:", data);
        seasonRaces = data.MRData.total;
        console.log("Rounds:", seasonRaces);
        selectedDrivers = []; // Reset selected drivers
        drivers = []; // Reset drivers
        updateChart();
        if (!data || !data.MRData.StandingsTable.StandingsLists.length) {
            console.error("No standings data found.");
            return;
        }
        
 
        // Extract driver standings
        const standings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
        // console.log("Driver standings:", standings);
        updateDriverList(standings);
        selectedDrivers = []; // Reset selected drivers
        // drivers = []; // Reset drivers
        
        const responseYear = await fetch(`https://ergast.com/api/f1/${year}.json`);
        const dataYear = await responseYear.json();
        const numberOfRaces = dataYear.MRData.total
        console.log(numberOfRaces);
        updateXAxis(numberOfRaces)
        console.log("Fetched Data:", dataYear);

    } catch (error) {
        console.error("Error fetching F1 data:", error);
    }
}

//Places Points
const driverPoints = (driver) => {
    const points = driver.map((place) => {
        if (place === 1) return 25;
        if (place === 2) return 18;
        if (place === 3) return 15;
        if (place === 4) return 12;
        if (place === 5) return 10;
        if (place === 6) return 8;
        if (place === 7) return 6;
        if (place === 8) return 4;
        if (place === 9) return 2;
        if (place === 10) return 1;
        return 0;
    });
    // Convert to cumulative points
    console.log("Points:", points.length);
    seasonRaces = points.length
    return points.map((sum => value => sum += value)(0));
};


async function getDriverResults({driverId}, season) {
    let resultsDriver = [0]
    console.log("Fetching results for driver:", driverId, "in season:", season);
    const url = `https://ergast.com/api/f1/${season}/drivers/${driverId}/results.json`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        console.log("Fetched Data:", data);
        let eachRace = data.MRData.RaceTable.Races
/*         eachRace.forEach(result => {
            // console.log("Result:", result.Results[0].position);
            let raceResult = Number(result.Results[0].position);
            let roundNumber = Number(result.round);
            console.log("Round Number:", roundNumber,"Result:",raceResult, "DriverL:", resultsDriver.length);

            if(resultsDriver.length == roundNumber){
                resultsDriver.splice(roundNumber,0, raceResult)
            } else {
                resultsDriver.splice(roundNumber,0,20)
            }

                while (resultsDriver.length <= roundNumber) {
                    resultsDriver.push(20); // Default value for missing races
                }
            
                // Assign result to correct index
                resultsDriver[roundNumber] = raceResult;

        }
        ) */

        for (let i = 0; i < eachRace.length; i++) {
            let raceResult = Number(eachRace[i].Results[0].position);
            let roundNumber = Number(eachRace[i].round); // Convert to zero-based index
        
            console.log("Round Number:", roundNumber, "Result:", raceResult, "DriverL:", resultsDriver.length);
        
            // Ensure all missing rounds are populated with default value (20)
            for (let j = resultsDriver.length; j <= roundNumber; j++) {
                resultsDriver.push(20);
            }
        
            // Assign the actual race result
            resultsDriver[roundNumber] = raceResult;
        }
        

        // console.log(resultsDriver);
        // console.log("Driver Points:", driverPoints(resultsDriver));
        return driverPoints(resultsDriver);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}
// getDriverResults("max_verstappen", 2023)
// getDriverResults("max_verstappen", 2023).then(results => console.log(results));
// console.log("Driver 1 Results:", resultsDriver1);




// console.log("variable",ver)

const verPoints = []

// console.log(verPoints)

const perPoints = []

// console.log(perPoints)

const calculateDifferences = async (driver1, driver2) => {
    let driver1Points = await getDriverResults(driver1, selectedYear);
    let driver2Points = await getDriverResults(driver2, selectedYear);
   
    console.log("Driver 1 Points:", driver1Points);
    console.log("Driver 2 Points:", driver2Points);
   
    const averagePoints = driver1Points.map((points, index) =>
        Math.round((driver1Points[index] + driver2Points[index]) / 2)
    );

    const driver1Diff = driver1Points.map((points, index) => points - averagePoints[index]);
    const driver2Diff = driver2Points.map((points, index) => points - averagePoints[index]);
    updateChartWithData(averagePoints, driver1Diff, driver2Diff)
    return { averagePoints, driver1Diff, driver2Diff };
};

/* const calculateDifferences = async (selectedDrivers) => {
    if (selectedDrivers.length < 2) {
        console.error("At least two drivers must be selected.");
        return;
    }

    // Fetch points for all selected drivers
    let allDriverPoints = await Promise.all(
        selectedDrivers.map(driver => getDriverResults(driver, selectedYear))
    );

    console.log("All Drivers' Points:", allDriverPoints);

    // Calculate average points per race
    let numRaces = allDriverPoints[0].length; // Assuming all drivers have the same number of races
    let averagePoints = Array(numRaces).fill(0).map((_, raceIndex) => {
        let sum = allDriverPoints.reduce((acc, points) => acc + points[raceIndex], 0);
        return Math.round(sum / selectedDrivers.length);
    });

    // Calculate differences from the average for each driver
    let driversDiffs = selectedDrivers.map((driver, driverIndex) => ({
        driverId: driver,
        differences: allDriverPoints[driverIndex].map((points, index) => points - averagePoints[index])
    }));

    // Update chart (modify function to handle multiple drivers)
    updateChartWithData(averagePoints, driversDiffs);

    return { averagePoints, driversDiffs };
}; */


// const { averagePoints, driver1Diff, driver2Diff } = calculateDifferences(driverPoints(ver), driverPoints(per));

// console.log("Average Points:", averagePoints);
// console.log("Verstappen Difference:", driver1Diff);
// console.log("Pérez Difference:", driver2Diff);


/* const pointDiff = []
verPoints.forEach((points, index) => {
    pointDiff.push(points - perPoints[index])
})
console.log(pointDiff) */

document.querySelectorAll(".year-option").forEach(yearOption => {
    yearOption.addEventListener("click", function() {
        document.querySelectorAll(".year-option").forEach(el => el.classList.remove("current"));
        const clickedYear = this.innerHTML;
        console.log("Selected year:", clickedYear);
        selectedYear = clickedYear; // Update selected year
        this.classList.add("current");
        showLoadingMessage()
        clearChart();
        showLoadingMessage();
        fetchDriverStandings(clickedYear); // Fetch new data
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
        .text("Loading...");
}




// Populate the driver list dynamically
function updateDriverList(standings) {
    const driverList = d3.select("#driver-list");
    driverList.html(""); // Clear previous list

    standings.forEach(driver => {
        const driverId = driver.Driver.driverId;
        driverList.append("li")
            .attr("class", "list-group-item")
            .attr("data-driver", driverId)
            .text(`${driver.Driver.code}`)
            .on("click", function() {
                // console.log("Driver selected:", driverId);
                handleDriverSelection(driverId);
            });
        drivers.push({
            driverId: driverId,
        });
    });
}
console.log("Drivers:", drivers);

const handleDriverSelection = (driverId) => {

    // const driver = d3.select(this); // Read driver from attribute
    if (!selectedDrivers) selectedDrivers = []; // Ensure it's always an array

    // Check if the driver is valid before proceeding
    console.log("Drivers:", driverId);

    if (!drivers.find(dri => dri.driverId === driverId)) {
        console.error(`Invalid driver selected: ${driverId}`);
        return;
    }

    // Toggle selection
    if (selectedDrivers.includes(driverId)) {
        console.log("Deselecting driver:", driverId);
        selectedDrivers = selectedDrivers.filter(d => d !== driverId);
    } else if (selectedDrivers.length < 2){
        console.log("Selecting driver:", driverId);
        selectedDrivers.push(driverId);
    }

    // Update list styling
    
    d3.selectAll(".list-group-item")
        .classed("selected", function () {
            const elementDriverId = d3.select(this).attr("data-driver");
            return selectedDrivers.includes(elementDriverId);
        });

    // Update chart if at least 2 drivers are selected
    if (selectedDrivers.length === 2) {
        updateChart();
    }
    console.log(`Selected drivers: ${selectedDrivers}`);
}


// Available colors for different drivers
const colors = d3.scaleOrdinal(d3.schemeCategory10);
//----Chart----

// let chart = document.getElementById("chart");

// Set up chart dimensions
const w = Math.min(window.innerWidth * 0.9, 1148); // Scale width based on screen
const h = Math.min(window.innerHeight * 0.6, 470); // Adjust height for small screens
const margin = { top: 20, right: 20, bottom: 50, left: 50 };
const width = w - margin.left - margin.right;
const height = h - margin.top - margin.bottom;

// Create SVG element
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", w)
    .attr("height", h)
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
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .text("Points Difference");

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
/* svg.append("g")
.attr("class", "grid")    
.attr("color", "grey")
.call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

svg.append("g")
    .attr("class", "grid")
    .attr("color", "grey")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickSize(-height).tickFormat("")); */

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
    if (selectedDrivers.length !== 2) {
        console.warn("Please select exactly two drivers to compare.");
        return;
    }

    const [driver1, driver2] = selectedDrivers;
    console.log("Selected drivers:", driver1, driver2);
    console.log(drivers.find(dri => dri.driverId === driver1))
    // Pass the actual arrays of points, not strings
    const { averagePoints, driver1Diff, driver2Diff } = calculateDifferences(
        drivers.find(dri => dri.driverId === driver1), 
        drivers.find(dri => dri.driverId === driver2)
    );
}

const updateChartWithData = async (averagePoints, driver1Diff, driver2Diff) => {
    const [driver1, driver2] = selectedDrivers;
    console.log(driver1Diff, driver2Diff);
    if (driver1Diff.length === 0 || driver2Diff.length === 0) {
        console.warn("No data available to calculate differences.");
        return;
    }

    // Determine new Y-axis range
    const minY = Math.min(...driver1Diff, ...driver2Diff);
    const maxY = Math.max(...driver1Diff, ...driver2Diff);

    // Update yScale domain with padding
    yScale.domain([minY - 10, maxY + 10]);

    // Update Y-axis
    svg.select(".y-axis")
        .transition().duration(500)
        .call(d3.axisLeft(yScale));

    // Remove old lines
    svg.selectAll(".line").remove();
    svg.selectAll(".legend").remove();

    // Define line generator
    const lineGenerator = d3.line()
        .x((d, i) => xScale(i))
        .y(d => yScale(d));

    // Draw driver1 line
    svg.append("path")
        .datum(driver1Diff)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", colors(driver1))
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);

    // Draw driver2 line
    svg.append("path")
        .datum(driver2Diff)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", colors(driver2))
        .attr("stroke-width", 2)
        .attr("d", lineGenerator);

    // Add legend
    svg.append("text")
        .attr("class", "legend")
        .attr("x", width - 50)
        .attr("y", 20)
        .attr("fill", colors(driver1))
        .text(`${driver1}`);
    
    svg.append("text")
        .attr("class", "legend")
        .attr("x", width - 50)
        .attr("y", 40)
        .attr("fill", colors(driver2)) // Match text color with line color
        .text(`${driver2}`);
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

