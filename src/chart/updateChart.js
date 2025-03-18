import { calculateDifferences } from "../utils/calculations.js";
import { getDriverResults } from "../utils/api.js";

export const updateChart = async (selectedDrivers, drivers, selectedYear, updateChartWithData) => {
    if (selectedDrivers.length !== 2) {
        console.warn("Please select exactly two drivers to compare.");
        return;
    }

    const driver1 = drivers.find(d => d.driverId === selectedDrivers[0]);
    const driver2 = drivers.find(d => d.driverId === selectedDrivers[1]);

    if (!driver1 || !driver2) {
        console.error("Driver data not found.");
        return;
    }

    try {
        const { averagePoints, driver1Diff, driver2Diff } = await calculateDifferences(driver1, driver2, getDriverResults, selectedYear);
        updateChartWithData(averagePoints, driver1Diff, driver2Diff);
    } catch (error) {
        console.error("Error updating chart:", error);
    }
};
