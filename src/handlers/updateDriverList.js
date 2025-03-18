// Populate the driver list dynamically
export function updateDriverList(standings) {
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