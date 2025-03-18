export function showLoadingMessage() {
  const driverList = d3.select("#driver-list");
  driverList.html(""); // Clear current list
  driverList.append("div")
      // .attr("class", "list-group-item text-center font-italic")
      .text("Loading...");
}