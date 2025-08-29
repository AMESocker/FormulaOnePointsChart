// dataProcessing.js
export function extractStandings(data) {
    if (!data || !data.MRData.StandingsTable.StandingsLists.length) return [];
    return data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
}

export function getCompletedRaces(seasonData) {
    const races = seasonData.MRData.RaceTable.Races;
    const today = new Date();
    return races.filter(r => new Date(r.date) <= today);
}
