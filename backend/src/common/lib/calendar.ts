// Booking times are stored as plain UTC-labelled fields standing in for
// Ghana wall-clock time (Africa/Accra is UTC+0 year-round — see
// lib/availability.ts), same as every other display of a booking time in
// this app. A trailing "Z" would tell Google Calendar this is a real UTC
// instant and it would convert to the viewer's own device timezone, showing
// the wrong wall-clock time to anyone not physically in Ghana — so these are
// passed as floating (no "Z") local times with an explicit ctz instead.
function toGoogleCalendarDateTime(iso: string): string {
  return iso.replace(/[-:]/g, "").split(".")[0];
}

export function buildGoogleCalendarUrl(params: {
  title: string;
  startTime: string;
  endTime: string;
  details: string;
  location: string;
}): string {
  const { title, startTime, endTime, details, location } = params;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${toGoogleCalendarDateTime(startTime)}/${toGoogleCalendarDateTime(endTime)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&ctz=Africa/Accra`;
}
