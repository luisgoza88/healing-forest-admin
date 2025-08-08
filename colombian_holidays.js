(function (global) {
  function calculateEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = 1 + ((h + l - 7 * m + 114) % 31);
    return new Date(year, month - 1, day);
  }

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function emiliani(date) {
    const day = date.getDay();
    if (day === 1) return date;
    const diff = day === 0 ? 1 : 8 - day;
    return addDays(date, diff);
  }

  function format(date) {
    return date.toISOString().split('T')[0];
  }

  function getHolidaysByYear(year) {
    const easter = calculateEaster(year);
    return [
      format(new Date(year, 0, 1)),
      format(new Date(year, 4, 1)),
      format(new Date(year, 6, 20)),
      format(new Date(year, 7, 7)),
      format(new Date(year, 11, 8)),
      format(new Date(year, 11, 25)),
      format(emiliani(new Date(year, 0, 6))),
      format(emiliani(new Date(year, 2, 19))),
      format(emiliani(new Date(year, 5, 29))),
      format(emiliani(new Date(year, 7, 15))),
      format(emiliani(new Date(year, 9, 12))),
      format(emiliani(new Date(year, 10, 1))),
      format(emiliani(new Date(year, 10, 11))),
      format(addDays(easter, -3)),
      format(addDays(easter, -2)),
      format(emiliani(addDays(easter, 39))),
      format(emiliani(addDays(easter, 60))),
      format(emiliani(addDays(easter, 68))),
    ];
  }

  function getHolidaysRange(startYear, endYear) {
    const holidays = [];
    for (let y = startYear; y <= endYear; y++) {
      holidays.push(...getHolidaysByYear(y));
    }
    return holidays;
  }

  function isHoliday(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    return getHolidaysByYear(dateObj.getFullYear()).includes(format(dateObj));
  }

  global.ColombianHolidays = {
    getHolidaysByYear,
    getHolidaysRange,
    isHoliday,
  };
})(typeof window !== 'undefined' ? window : globalThis);
