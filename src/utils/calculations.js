export const calculateDifferences = async (driver1, driver2, getDriverResults, selectedYear) => {
  try {
      const driver1Points = await getDriverResults(driver1, selectedYear);
      const driver2Points = await getDriverResults(driver2, selectedYear);

      if (!driver1Points || !driver2Points) {
          throw new Error("Error fetching driver points.");
      }

      const averagePoints = driver1Points.map((_, index) =>
          Math.round((driver1Points[index] + driver2Points[index]) / 2)
      );

      const driver1Diff = driver1Points.map((points, index) => points - averagePoints[index]);
      const driver2Diff = driver2Points.map((points, index) => points - averagePoints[index]);

      return { averagePoints, driver1Diff, driver2Diff };
  } catch (error) {
      console.error("Error calculating differences:", error);
      return { averagePoints: [], driver1Diff: [], driver2Diff: [] };
  }
};
