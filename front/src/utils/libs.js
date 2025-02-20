export function calculateDaysBetweenDates(startDate, endDate) {
  // Convert input to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Ensure that we compare only the date part (reset time to midnight)
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  // Calculate the difference in milliseconds and convert to days
  const diffInTime = Math.abs(end - start);
  const diffInDays = Math.ceil(diffInTime / (1000 * 60 * 60 * 24));

  // Ensure at least 1 day is counted
  return diffInDays + 1;
}
