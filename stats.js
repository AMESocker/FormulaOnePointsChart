import { getResults } from './api.js';
import { selectedYear } from './script.js';
import { updateChartWithData } from './script.js';

export const calculateDifferences = async (drivers) => {
console.log("Calculating differences for drivers:", drivers);
    try {
        // Fetch points for all drivers
        const pointsPromises = drivers.map(driver => getResults(driver, selectedYear));
        const allDriverPoints = await Promise.all(pointsPromises);

        // Find the maximum number of races among all drivers
        const maxLength = Math.max(...allDriverPoints.map(points => points.length));
        console.log("Max races in season:", maxLength);

        // Normalize arrays so they all have maxLength, filling missing with 0
        const normalizedPoints = allDriverPoints.map(points => {
            const filled = new Array(maxLength).fill(0);
            points.forEach((p, i) => filled[i] = p);
            return filled;
        });

        // Calculate average points
        const averagePoints = normalizedPoints[0].map((_, index) => {
            const sum = normalizedPoints.reduce((acc, points) => acc + points[index], 0);
            return sum / normalizedPoints.length;
        });

        console.log("Average Points:", averagePoints);

        // Calculate differences from average
        const differences = normalizedPoints.map((driverPoints, driverIndex) => {
            return driverPoints.map((points, index) => points - averagePoints[index]);
        });

        // Update chart
        updateChartWithData(averagePoints, ...differences);

        // Return driver diffs
        const driverDiffs = drivers.map((driver, index) => ({
            driver,
            averagePoints,
            diff: differences[index]
        }));

        return driverDiffs;
    } catch (error) {
        console.error("Error calculating differences:", error);
    }
};