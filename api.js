const BASE_URL = "https://api.jolpi.ca/ergast/f1";
// const BASE_URL = "https://ergast.com/api/f1"; // fallback if needed

export async function getDriverStandings(year) {
  console.log("getDriverStandings");
  const url = `${BASE_URL}/${year}/driverStandings.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch driver standings");
  return response.json();
}

export async function getSeasonDetails(year = 2025) {
  console.log("getSeasonDetails");
  const url = `https://api.jolpi.ca/ergast/f1/${year}.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch season details`);
  return response.json();
}

export async function getRaceWinners(year) {
  const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/results/1.json`);
  const data = await response.json();
  const races = data.MRData.RaceTable.Races;

  return races.map(race => ({
    round: race.round,
    raceName: race.raceName,
    date: race.date,
    circuit: race.Circuit.circuitName,
    winner: `${race.Results[0].Driver.givenName} ${race.Results[0].Driver.familyName}`,
    constructor: race.Results[0].Constructor.name
  }));
}

const driverPoints = (driver) => {
  console.log("driverPoints")
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
  // let seasonRaces = points.length
  return driver.map((sum => value => sum += value)(0));
};

import { selectedView } from './script.js';

export async function getResults({ driverId, teamId }, season) {
  if (selectedView === 'drivers') {



    console.log("Fetching full results for driver:", driverId, "in season:", season);

    const raceUrl = `https://api.jolpi.ca/ergast/f1/${season}/drivers/${driverId}/results.json`;
    const sprintUrl = `https://api.jolpi.ca/ergast/f1/${season}/drivers/${driverId}/sprint.json`;

    const resultsDriver = [0]; // index = round number
    try {
      const [raceResponse, sprintResponse] = await Promise.all([
        fetch(raceUrl),
        fetch(sprintUrl)
      ]);

      if (!raceResponse.ok || !sprintResponse.ok) {
        throw new Error(`Fetch error: race ${raceResponse.status}, sprint ${sprintResponse.status}`);
      }

      const raceData = await raceResponse.json();
      const sprintData = await sprintResponse.json();

      console.log("Fetched Driver Results Data:", raceData, sprintData);

      const races = raceData.MRData?.RaceTable?.Races || [];
      const sprints = sprintData.MRData?.RaceTable?.Races || [];

      // Build a quick lookup for sprint points by round
      const sprintPointsByRound = new Map();

      console.log("Sprints:", sprints);

      for (const sprint of sprints) {
        const round = Number(sprint.round);
        const points = Number(sprint.SprintResults[0]?.points || 0);
        sprintPointsByRound.set(round, points);
      }

      // Process full results: main race + sprint per round
      for (const race of races) {
        const round = Number(race.round);
        const racePoints = Number(race.Results[0]?.points || 0);
        const sprintPoints = sprintPointsByRound.get(round) || 0;

        while (resultsDriver.length <= round) {
          resultsDriver.push(0);
        }

        resultsDriver[round] = racePoints + sprintPoints;

        // console.log(`Round ${round}: Main = ${racePoints}, Sprint = ${sprintPoints}, Total = ${resultsDriver[round]}`);
      }

      console.log("Final Results with Sprints:", resultsDriver);
      return driverPoints(resultsDriver);
    } catch (error) {
      console.error("Error fetching combined driver results:", error);
      return null;
    }
  } else if (selectedView === 'teams') {
    console.log("Fetching full results for constructor:", teamId, "in season:", season);

    const raceUrl = `https://api.jolpi.ca/ergast/f1/${season}/constructors/${teamId}/results.json?limit=300`;
    const sprintUrl = `https://api.jolpi.ca/ergast/f1/${season}/constructors/${teamId}/sprint.json`;

    const resultsTeam = [0]; // index = round number
    try {
      const [raceResponse, sprintResponse] = await Promise.all([
        fetch(raceUrl),
        fetch(sprintUrl)
      ]);

      if (!raceResponse.ok || !sprintResponse.ok) {
        throw new Error(`Fetch error: race ${raceResponse.status}, sprint ${sprintResponse.status}`);
      }

      const raceData = await raceResponse.json();
      const sprintData = await sprintResponse.json();

      console.log("Fetched Constructor Results Data:", raceData, sprintData);

      const races = raceData.MRData?.RaceTable?.Races || [];
      const sprints = sprintData.MRData?.RaceTable?.Races || [];

            // Build a quick lookup for sprint points by round
      const sprintPointsByRound = new Map();

      console.log("Sprints:", sprints);
      
      for (const sprint of sprints) {
        const round = Number(sprint.round);
        const points = (Number(sprint.SprintResults[0]?.points)+(Number(sprint.SprintResults[1]?.points)) || 0);
        sprintPointsByRound.set(round, points);
      }

      // Process full results 
      for (const race of races) {
        const round = Number(race.round);
        const racePoints = (Number(race.Results[0]?.points)+(Number(race.Results[1]?.points)) || 0);
        const sprintPoints = sprintPointsByRound.get(round) || 0;

        while (resultsTeam .length <= round) {
          resultsTeam.push(0);
        }

        resultsTeam [round] = racePoints + sprintPoints;

        // console.log(`Round ${round}: Main = ${racePoints}, Sprint = ${sprintPoints}, Total = ${resultsTeam[round]}`);
      }

      console.log("Final Results with Sprints:", resultsTeam);
      return driverPoints(resultsTeam);
      console.log("Line Completed");
  } catch (error) {
      console.error("Error fetching combined driver results:", error);
      return null;
    }
  }
}