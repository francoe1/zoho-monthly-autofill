/* Shared pure rules, usable by the popup, isolated content script and Node tests. */
(() => {
  "use strict";
  const defaults = Object.freeze({ hours: "08:00", description: "", includeWeekends: false, skipExisting: true });
  function formatMinutes(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  function normalizeHours(value) {
    const match = /^(\d{1,2})(?::([0-5]\d))?$/.exec(String(value).trim());
    const minutes = match ? Number(match[1]) * 60 + Number(match[2] || 0) : NaN;
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) {
      throw new Error("Hours per day must be between 00:01 and 24:00. Use HH:MM or whole hours.");
    }
    return { hours: formatMinutes(minutes), minutes };
  }
  function validateConfig(value) {
    const { hours, minutes } = normalizeHours(value.hours);
    if (typeof value.description !== "string" || !value.description.trim()) throw new Error("Enter a global description.");
    if (value.description.length > 10000) throw new Error("Description exceeds the local limit of 10,000 characters.");
    if (typeof value.includeWeekends !== "boolean" || typeof value.skipExisting !== "boolean") throw new Error("Invalid settings.");
    return { hours, minutes, description: value.description, includeWeekends: value.includeWeekends, skipExisting: value.skipExisting };
  }
  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) throw new Error("Invalid Zoho date.");
    const date = new Date(`${value}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid Zoho date.");
    return date;
  }
  function isWeekend(value, marked) {
    const day = parseDate(value).getUTCDay();
    return marked === true || marked === "true" || day === 0 || day === 6;
  }
  function hasExisting(value) {
    return !["", "00:00"].includes(String(value).trim());
  }
  function planDays(days, config) {
    const result = { targets: [], skippedWeekends: 0, skippedExisting: 0 };
    for (const day of days) {
      if (!config.includeWeekends && isWeekend(day.date, day.weekend)) result.skippedWeekends++;
      else if (config.skipExisting && hasExisting(day.value)) result.skippedExisting++;
      else result.targets.push({ ...day });
    }
    result.totalHours = formatMinutes(result.targets.length * config.minutes);
    return result;
  }
  const api = Object.freeze({ defaults, formatMinutes, normalizeHours, validateConfig, parseDate, isWeekend, hasExisting, planDays });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.ZohoAutofillCore = api;
})();
