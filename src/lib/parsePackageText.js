// Deterministic parser for the semi-structured tour-package text format
// (sections separated by lines containing only "---", ALL-CAPS section
// headers, "DAY N – DATE" headers, and "•" bullet points). See
// src/content/destinations/tamil-nadu-divine-temple-yatra.md for a package
// built from this exact format.

const LABELS = ['Vehicle', 'Group', 'Water', 'Breakfast', 'Lunch', 'Dinner'];
const LABEL_KEY = {
  Vehicle: 'vehicle',
  Group: 'group',
  Water: 'water',
  Breakfast: 'breakfast',
  Lunch: 'lunch',
  Dinner: 'dinner',
};

function titleCase(str) {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function isAllCapsHeader(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('•')) return false;
  return /[A-Z]/.test(trimmed) && trimmed === trimmed.toUpperCase();
}

function splitBlocks(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (line.trim() === '---') {
      blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  blocks.push(current);

  return blocks
    .map((b) => {
      const copy = [...b];
      while (copy.length && !copy[0].trim()) copy.shift();
      while (copy.length && !copy[copy.length - 1].trim()) copy.pop();
      return copy;
    })
    .filter((b) => b.length > 0);
}

function nonEmptyLines(block) {
  return block.map((l) => l.trim()).filter((l) => l.length > 0);
}

function parseHeaderBlock(block, result) {
  const lines = nonEmptyLines(block);
  if (lines.length === 0) return;

  const first = lines[0];
  result.title = isAllCapsHeader(first) ? titleCase(first) : first;

  for (const line of lines.slice(1)) {
    if (/^\d+\s*Days?\s*\/\s*\d+\s*Nights?$/i.test(line)) {
      result.duration = line;
      continue;
    }
    const routeMatch = line.match(/^Route:\s*(.+)/i);
    if (routeMatch) {
      result.route = routeMatch[1].trim();
      continue;
    }
    const groupMatch = line.match(/^Group Size:\s*(.+)/i);
    if (groupMatch) {
      result.groupSize = groupMatch[1].trim();
      continue;
    }
    const vehicleMatch = line.match(/^Vehicle:\s*(.+)/i);
    if (vehicleMatch) {
      result.vehicle = vehicleMatch[1].trim();
      continue;
    }
    if (!result.departureDates && /[–—-]/.test(line) && /[A-Za-z]/.test(line)) {
      result.departureDates = titleCase(line);
    }
  }
}

function parseHighlightsBlock(block, result) {
  const highlights = [];
  let current = null;
  let subCount = 0;

  for (const raw of block) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('•')) {
      if (current) highlights.push(current);
      current = line.replace(/^•\s*/, '').trim();
      subCount = 0;
    } else if (isAllCapsHeader(line) || /^important (temples|stops|places) covered$/i.test(line)) {
      continue;
    } else if (current) {
      current += subCount === 0 ? `: ${line}` : `, ${line}`;
      subCount++;
    }
  }
  if (current) highlights.push(current);
  result.highlights = highlights;
}

function parseTravelArrangementsBlock(block, result) {
  const nonEmpty = nonEmptyLines(block);
  const arrangements = {};
  let i = /^travel arrangements$/i.test(nonEmpty[0] || '') ? 1 : 0;

  while (i < nonEmpty.length) {
    const line = nonEmpty[i];
    const label = line.replace(/:$/, '');

    if (LABELS.includes(label)) {
      const value = nonEmpty[i + 1];
      if (value && !LABELS.includes(value.replace(/:$/, ''))) {
        arrangements[LABEL_KEY[label]] = value;
        i += 2;
        continue;
      }
    }
    i += 1;
  }
  result.travelArrangements = arrangements;
}

function parseAssistanceBlock(block, result) {
  const lines = nonEmptyLines(block);
  const places = [];
  let note = '';

  for (const line of lines) {
    if (line.startsWith('•')) {
      places.push(line.replace(/^•\s*/, '').trim());
    } else if (/^charges:/i.test(line)) {
      note = line;
    }
  }
  result.assistance = { places, note };
}

function parseImportantNotesBlock(block, result) {
  result.importantNotes = nonEmptyLines(block)
    .filter((l) => l.startsWith('•'))
    .map((l) => l.replace(/^•\s*/, '').trim());
}

function parseSpecialExperienceBlock(block, result) {
  const lines = nonEmptyLines(block);
  const title = titleCase(lines[0]);
  const body = lines
    .slice(1)
    .map((l) => l.replace(/^•\s*/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  result.specialExperience = { title, body };
}

function parseDayBlock(block, dayMatch, result) {
  const day = parseInt(dayMatch[1], 10);
  const date = titleCase(dayMatch[2].trim());

  const lines = [...block];
  const headerIdx = lines.findIndex((l) => l.trim().length > 0);
  lines.splice(headerIdx, 1);

  const titleIdx = lines.findIndex((l) => l.trim().length > 0);
  const title = (lines[titleIdx] || '').trim();
  if (titleIdx >= 0) lines.splice(titleIdx, 1);

  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  result.itinerary.push({ day, date, title, details: lines.join('\n').trim() });
}

/**
 * Parses the semi-structured tour text into fields matching the
 * `destinations` content schema. Fields the text can't supply (location,
 * summary, heroImage, priceFrom, featured) are left for manual entry.
 */
export function parsePackageText(rawText) {
  const result = {
    title: '',
    duration: '',
    route: '',
    departureDates: '',
    groupSize: '',
    vehicle: '',
    highlights: [],
    travelArrangements: {},
    assistance: { places: [], note: '' },
    specialExperience: null,
    itinerary: [],
    importantNotes: [],
  };

  const blocks = splitBlocks(rawText || '');

  for (const block of blocks) {
    const firstLine = (block.find((l) => l.trim().length > 0) || '').trim();
    const upper = firstLine.toUpperCase();
    const dayMatch = firstLine.match(/^DAY\s+(\d+)\s*[–—-]\s*(.+)$/i);

    if (dayMatch) {
      parseDayBlock(block, dayMatch, result);
    } else if (upper === 'TOUR HIGHLIGHTS') {
      parseHighlightsBlock(block, result);
    } else if (upper === 'TRAVEL ARRANGEMENTS') {
      parseTravelArrangementsBlock(block, result);
    } else if (upper.startsWith('DARSHAN ASSISTANCE') || upper.includes('ASSISTANCE')) {
      parseAssistanceBlock(block, result);
    } else if (upper === 'IMPORTANT NOTES') {
      parseImportantNotesBlock(block, result);
    } else if (upper.startsWith('END OF')) {
      continue;
    } else if (result.title === '') {
      parseHeaderBlock(block, result);
    } else if (isAllCapsHeader(firstLine)) {
      parseSpecialExperienceBlock(block, result);
    }
  }

  return result;
}
