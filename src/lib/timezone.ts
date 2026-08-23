export const APP_TIME_ZONE = "Europe/Istanbul";

const dateOptions: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

const timeOptions: Intl.DateTimeFormatOptions = {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

export function formatAppDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toLocaleDateString("tr-TR", dateOptions);
}

export function formatAppDateTime(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  const day = value.toLocaleDateString("tr-TR", dateOptions);
  const time = value.toLocaleTimeString("tr-TR", timeOptions);
  return `${day} - ${time}`;
}

export function formatAppDateTimeShort(date: Date) {
  return date.toLocaleString("tr-TR", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
