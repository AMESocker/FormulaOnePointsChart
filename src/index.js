import { handleDriverSelection, selectedDrivers } from "./handlers/driverSelection.js";
import { updateChart } from "./chart/updateChart.js";
import { fetchDriverStandings } from "./utils/api.js";
import { showLoadingMessage } from "./handlers/showLoadingMessage.js";

// Example usage:
/* document.querySelectorAll(".list-group-item").forEach(item => {
    item.addEventListener("click", () => {
        const driverId = item.getAttribute("data-driver");
        handleDriverSelection(driverId, updateChart);
    });
}); */

let selectedYear = 2024;
let drivers = [];
// let selectedDrivers = [];

document.querySelectorAll(".year-option").forEach(yearOption => {
    yearOption.addEventListener("click", function() {
        document.querySelectorAll(".year-option").forEach(el => el.classList.remove("current"));
        const clickedYear = this.innerHTML;
        console.log("Selected year:", clickedYear);
        selectedYear = clickedYear; // Update selected year

        // yearOption.classList.remove("current");
        this.classList.add("current");
        showLoadingMessage();
        fetchDriverStandings(clickedYear); // Fetch new data
        console.log(drivers);
    });
});

fetchDriverStandings();