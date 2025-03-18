//2023 F1 Points
//Places

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
    return points.map((sum => value => sum += value)(0));
};


const ver = [1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5, 1, 1, 1, 1, 1, 1, 1];
const per = [2, 1, 5, 1, 2, 16, 4, 6, 3, 6, 3, 2, 4, 2, 8, 20, 10, 4, 20, 4, 3, 4];
const ham = [5, 5, 2, 6, 6, 4, 2, 3, 8, 3, 4, 4, 6, 6, 3, 5,20,20,2,8,7,9];
const alo = [3,3,3,4,3,2,7,2,5,7,9,5,2,9,15,8,6,20,20,3,9,7]

console.log("variable",ver)

const verPoints = []
/* ver.forEach((place, index) => {
    if (place === 1) {
        ver[index] = 25;
    } else if (place === 2) {
        ver[index] = 18;
    } else if (place === 3) {
        ver[index] = 15;
    } else if (place === 4) {
        ver[index] = 12;
    } else if (place === 5) {
        ver[index] = 10;
    } else if (place === 6) {
        ver[index] = 8;
    } else if (place === 7) {
        ver[index] = 6;
    } else if (place === 8) {
        ver[index] = 4;
    } else if (place === 9) {
        ver[index] = 2;
    } else if (place === 10) {
        ver[index] = 1;
    } else {
        ver[index] = 0;
    }
    if (index === 0) {
        verPoints.push(ver[index]);
    } else {
        verPoints.push(ver[index] + verPoints[index - 1]);
    }

}) */

console.log(verPoints)

const perPoints = []
/* per.forEach((place, index) => {
    if (place === 1) {
        per[index] = 25;
    } else if (place === 2) {
        per[index] = 18;
    } else if (place === 3) {
        per[index] = 15;
    } else if (place === 4) {
        per[index] = 12;
    } else if (place === 5) {
        per[index] = 10;
    } else if (place === 6) {
        per[index] = 8;
    } else if (place === 7) {
        per[index] = 6;
    } else if (place === 8) {
        per[index] = 4;
    } else if (place === 9) {
        per[index] = 2;
    } else if (place === 10) {
        per[index] = 1;
    } else {
        per[index] = 0;
    }
    if (index === 0) {
        perPoints.push(per[index]);
    } else {
        perPoints.push(per[index] + perPoints[index - 1]);
    }

}) */

// console.log(perPoints)

//average points
/* const averagePoints = []
verPoints.forEach((points, index) => {
    const average = Math.round((verPoints[index] + perPoints[index]) / 2)
    // console.log('Ver:',verPoints[index],'Per:',perPoints[index],'Avg:',average)
    averagePoints.push(average)
})

const verDiff = []
verPoints.forEach((points, index) => {
    verDiff.push(points - averagePoints[index])
})

const perDiff = []
perPoints.forEach((points, index) => {
    perDiff.push(points - averagePoints[index])
})

console.log(perDiff) */

const calculateDifferences = (driver1Points, driver2Points) => {
    const averagePoints = driver1Points.map((points, index) =>
        Math.round((driver1Points[index] + driver2Points[index]) / 2)
    );

    const driver1Diff = driver1Points.map((points, index) => points - averagePoints[index]);
    const driver2Diff = driver2Points.map((points, index) => points - averagePoints[index]);
    return { averagePoints, driver1Diff, driver2Diff };
};

const { averagePoints, driver1Diff, driver2Diff } = calculateDifferences(driverPoints(ver), driverPoints(per));

console.log("Average Points:", averagePoints);
console.log("Verstappen Difference:", driver1Diff);
console.log("Pérez Difference:", driver2Diff);


/* const pointDiff = []
verPoints.forEach((points, index) => {
    pointDiff.push(points - perPoints[index])
})
console.log(pointDiff) */

// Data for multiple drivers
const drivers = {
    "VER": driverPoints(ver),
    "PER": driverPoints(per),
    "HAM": driverPoints(ham),
    "ALO": driverPoints(alo),
};

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
const xScale = d3.scaleLinear().domain([0, 21]).range([0, width]);
const yScale = d3.scaleLinear().domain([0, 25]).range([height, 0]);

// Add axes
svg.append("g")
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
let selectedDrivers = [];

// Populate driver list with clickable items
driverList.selectAll("li")
    .data(Object.keys(drivers))
    .enter()
    .append("li")
    .text(d => d)
    .attr("class", "driver-item")
    .attr("class", "list-group-item")
    .attr("data-driver", d => d) // Store correct driver name
    .on("click", function(event) {
        const driver = d3.select(this).attr("data-driver"); // Read driver from attribute
        console.log(`Selected driver: ${driver}`);
        if (!selectedDrivers) selectedDrivers = []; // Ensure it's always an array
            // Check if the driver is valid before proceeding
    if (!drivers[driver]) {
        console.error(`Invalid driver selected: ${driver}`);
        return;
    }
        // Toggle selection
        if (selectedDrivers.includes(driver)) {
            selectedDrivers = selectedDrivers.filter(d => d !== driver);
        } else if (selectedDrivers.length < 2) {
                selectedDrivers.push(driver);
        }

        // Update list styling
        d3.selectAll(".list-group-item")
            .classed("selected", d => selectedDrivers.includes(d));

        // Update chart if exactly 2 drivers are selected
        if (selectedDrivers.length === 2) {
            updateChart();
        }
        console.log(`Selected drivers: ${selectedDrivers}`);
    });


/* // Dropdown menu for selecting drivers
const driverSelect = d3.select("#driver-list")
    .on("click", updateChart)
    .selectAll("option")
    .data(Object.keys(drivers))
    .enter()
    .append("a")
    .attr("href", "#")
    .attr("value", d => d)
    .attr("class", "list-group-item")
    .attr("style", "color: white; background-color: #343a40;")
    .text(d => d); */

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

    // Pass the actual arrays of points, not strings
    const { averagePoints, driver1Diff, driver2Diff } = calculateDifferences(
        drivers[driver1], 
        drivers[driver2]
    );

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


