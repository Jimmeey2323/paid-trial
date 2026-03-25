const DEFAULT_LOOKAHEAD_DAYS = 30;

const CENTER_ALIASES = {
  'Supreme Headquarters, Bandra': ['bandra', 'supreme headquarters', 'supreme hq'],
  'Kwality House, Kemps Corner': ['kemps', 'kemps corner', 'kwality house', 'grant road']
};

const TYPE_ALIASES = {
  'Barre 57': ['barre 57', 'studio barre 57', 'barre57'],
  Barre: ['barre', 'band barre'],
  powerCycle: ['powercycle', 'power cycle'],
  'Strength Lab': ['strength lab', 'strength']
};

function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pickString(...values) {
  const match = values.find((value) => typeof value === 'string' && value.trim());
  return match ? match.trim() : '';
}

function pickNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function safeDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function deriveDurationMinutes(startDate, endDate, fallback) {
  if (Number.isFinite(fallback) && fallback > 0) {
    return Math.round(fallback);
  }

  if (!startDate || !endDate) {
    return null;
  }

  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

function inferClassFormat(title = '') {
  const normalizedTitle = slugify(title);

  for (const [classFormat, aliases] of Object.entries(TYPE_ALIASES)) {
    if (aliases.some((alias) => normalizedTitle.includes(slugify(alias)))) {
      return classFormat;
    }
  }

  return title || 'Class';
}

function normalizeLocationName(rawLocation = '') {
  const normalized = slugify(rawLocation);

  for (const [center, aliases] of Object.entries(CENTER_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(slugify(alias)))) {
      return center;
    }
  }

  return rawLocation || 'Studio TBA';
}

function extractSessions(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.sessions,
    payload?.data,
    payload?.items,
    payload?.results,
    payload?.content,
    payload?.hostSessions,
    payload?.response?.sessions,
    payload?.response?.data
  ];

  const match = candidates.find((candidate) => Array.isArray(candidate));
  return Array.isArray(match) ? match : [];
}

function normalizeSession(rawSession) {
  const startsAtRaw = rawSession.startsAt || rawSession.startAt || rawSession.start_time || rawSession.start || rawSession.startDate;
  const endsAtRaw = rawSession.endsAt || rawSession.endAt || rawSession.end_time || rawSession.end || rawSession.endDate;
  const startsAt = safeDate(startsAtRaw);
  const endsAt = safeDate(endsAtRaw);
  const title = pickString(
    rawSession.name,
    rawSession.title,
    rawSession.sessionName,
    rawSession.session_name,
    rawSession.eventName,
    rawSession.productName,
    rawSession.product?.name,
    rawSession.class?.name,
    rawSession.sessionType?.name
  ) || 'Scheduled class';
  const locationRaw = pickString(
    rawSession.locationName,
    rawSession.location?.name,
    rawSession.location?.title,
    rawSession.venue?.name,
    rawSession.site?.name,
    rawSession.room?.name,
    rawSession.address?.name,
    rawSession.place?.name
  );
  const locationName = normalizeLocationName(locationRaw);
  const instructorName = pickString(
    rawSession.teacher?.name,
    rawSession.teacher?.fullName,
    rawSession.teacherName,
    rawSession.instructor?.name,
    rawSession.instructor?.fullName,
    rawSession.staff?.name
  );
  const classFormat = pickString(rawSession.classFormat, rawSession.sessionType?.name) || inferClassFormat(title);
  const bookingUrl = pickString(rawSession.bookingUrl, rawSession.bookUrl, rawSession.url, rawSession.link);
  const price = pickNumber(
    rawSession.price?.amount,
    rawSession.priceAmount,
    rawSession.price,
    rawSession.cost?.amount
  );
  const spotsRemaining = pickNumber(
    rawSession.spotsRemaining,
    rawSession.remainingSpots,
    rawSession.availableSpots,
    rawSession.spots?.remaining,
    rawSession.capacityRemaining
  );
  const durationMinutes = deriveDurationMinutes(
    startsAt,
    endsAt,
    pickNumber(rawSession.durationMinutes, rawSession.duration)
  );

  return {
    id: String(rawSession.id || rawSession.sessionId || rawSession.uuid || rawSession.slug || `${title}-${startsAtRaw}`),
    title,
    classFormat,
    instructorName,
    locationName,
    startsAt: startsAt ? startsAt.toISOString() : '',
    endsAt: endsAt ? endsAt.toISOString() : '',
    durationMinutes,
    bookingUrl,
    price,
    spotsRemaining,
    raw: rawSession
  };
}

function filterByCenter(session, center) {
  if (!center) {
    return true;
  }

  const haystack = slugify(`${session.locationName} ${session.title}`);
  const aliases = CENTER_ALIASES[center] || [center];
  return aliases.some((alias) => haystack.includes(slugify(alias)));
}

function filterByType(session, classFormat) {
  if (!classFormat) {
    return true;
  }

  const haystack = slugify(`${session.classFormat} ${session.title}`);
  const aliases = TYPE_ALIASES[classFormat] || [classFormat];
  return aliases.some((alias) => haystack.includes(slugify(alias)));
}

function buildGroupedSessions(sessions) {
  const groups = new Map();

  sessions.forEach((session) => {
    const startsAt = safeDate(session.startsAt);
    const key = startsAt ? startsAt.toISOString().split('T')[0] : 'unknown';

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(session);
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, items]) => ({
      date,
      items: items.sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    }));
}

function defaultDateRange(days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + days);

  return {
    startDate: today.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

class ScheduleService {
  constructor() {
    this.edgeFunctionUrl = String(process.env.SUPABASE_MOMENCE_SESSIONS_URL || process.env.MOMENCE_SESSIONS_FUNCTION_URL || '').trim();
    this.edgeFunctionKey = String(process.env.SUPABASE_MOMENCE_SESSIONS_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
    this.lookaheadDays = Number(process.env.SCHEDULE_LOOKAHEAD_DAYS || DEFAULT_LOOKAHEAD_DAYS);
    this.isConfigured = Boolean(this.edgeFunctionUrl);
  }

  async fetchRawSessions({ startDate, endDate }) {
    if (!this.isConfigured) {
      throw new Error('Supabase Momence sessions function is not configured');
    }

    const requestUrl = new URL(this.edgeFunctionUrl);
    requestUrl.searchParams.set('startDate', startDate);
    requestUrl.searchParams.set('endDate', endDate);

    const headers = {
      Accept: 'application/json'
    };

    if (this.edgeFunctionKey) {
      headers.apikey = this.edgeFunctionKey;
      headers.Authorization = `Bearer ${this.edgeFunctionKey}`;
    }

    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Schedule fetch failed (${response.status}): ${message || response.statusText}`.trim());
    }

    return response.json();
  }

  async getSessions({ startDate, endDate, center, type } = {}) {
    const dateRange = {
      ...defaultDateRange(Number.isFinite(this.lookaheadDays) ? this.lookaheadDays : DEFAULT_LOOKAHEAD_DAYS),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {})
    };

    const rawPayload = await this.fetchRawSessions(dateRange);
    const normalizedSessions = extractSessions(rawPayload)
      .map(normalizeSession)
      .filter((session) => session.startsAt)
      .filter((session) => filterByCenter(session, center))
      .filter((session) => filterByType(session, type));

    return {
      meta: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        center: center || '',
        type: type || '',
        totalSessions: normalizedSessions.length
      },
      sessions: normalizedSessions,
      groupedSessions: buildGroupedSessions(normalizedSessions)
    };
  }
}

module.exports = ScheduleService;
