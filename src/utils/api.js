import { updateDriverList } from ".././handlers/updateDriverList.js";

export const getDriverResults = async (driverId, season) => {

  const url = `https://ergast.com/api/f1/${season}/drivers/${driverId}/results.json`;

  try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch driver data.");
      return await response.json();
  } catch (error) {
      console.error("Error fetching driver results:", error);
      return [];
  }
};

// Fetch F1 data from API
export async function fetchDriverStandings(year = 2024) {
  try {
      const response = await fetch(`https://ergast.com/api/f1/${year}/driverStandings.json`);
      const data = await response.json();
      // console.log("F1 data:", data);
      if (!data || !data.MRData.StandingsTable.StandingsLists.length) {
          console.error("No standings data found.");
          return;
      }

      // Extract driver standings
      const standings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
      // console.log("Driver standings:", standings);
      updateDriverList(standings);
      selectedDrivers = []; // Reset selected drivers
  } catch (error) {
      console.error("Error fetching F1 data:", error);
  }
}