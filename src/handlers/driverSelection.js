export let selectedDrivers = [];

export const handleDriverSelection = (driverId, updateChart) => {
    if (!selectedDrivers) selectedDrivers = [];

    if (selectedDrivers.includes(driverId)) {
        selectedDrivers = selectedDrivers.filter(d => d !== driverId);
    } else if (selectedDrivers.length < 2) {
        selectedDrivers.push(driverId);
    }

    d3.selectAll(".list-group-item")
        .classed("selected", d => selectedDrivers.includes(d.getAttribute("data-driver")));

    if (selectedDrivers.length === 2) {
        updateChart();
    }

    console.log(`Selected drivers: ${selectedDrivers}`);
};
