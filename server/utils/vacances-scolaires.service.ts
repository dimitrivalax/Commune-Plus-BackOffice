/**
 * Service vacances scolaires françaises par code postal.
 * Données : API data.education.gouv.fr (open data).
 */

const API_BASE =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records';
const FALLBACK_CSV_URL =
  'https://raw.githubusercontent.com/AntoineAugusti/vacances-scolaires/master/data.csv';

/** Zone A, B ou C (métropole). Corse = B pour le calendrier. */
export type ZoneScolaire = 'A' | 'B' | 'C';

/** Un enregistrement vacances renvoyé par l'API. */
export interface VacancesRecord {
  description: string;
  population: string;
  start_date: string;
  end_date: string;
  location: string;
  zones: string;
  annee_scolaire: string;
}

/** Options pour récupérer les vacances. */
export interface FetchVacancesOptions {
  population?: 'Élèves' | 'Enseignants';
  limit?: number;
  anneeScolaire?: string;
}

/** Résultat du service par code postal. */
export interface VacancesByCodePostalResult {
  zone: ZoneScolaire | null;
  vacances: VacancesRecord[];
  error?: string;
}

const FALLBACK_ZONE_COLUMN: Record<ZoneScolaire, string> = {
  A: 'vacances_zone_a',
  B: 'vacances_zone_b',
  C: 'vacances_zone_c',
};

let fallbackCacheByZone: Record<ZoneScolaire, VacancesRecord[]> | null = null;

// Département (numéro ou 2A/2B) → zone (depuis 2016)
const DEPARTEMENT_TO_ZONE: Record<string, ZoneScolaire> = {
  '01': 'A', '03': 'A', '07': 'A', '15': 'A', '16': 'A', '19': 'A', '21': 'A', '23': 'A', '24': 'A',
  '25': 'A', '26': 'A', '33': 'A', '38': 'A', '39': 'A', '42': 'A', '43': 'A', '58': 'A', '63': 'A',
  '69': 'A', '70': 'A', '71': 'A', '73': 'A', '74': 'A', '79': 'A', '86': 'A', '87': 'A', '90': 'A',
  '02': 'B', '04': 'B', '05': 'B', '06': 'B', '08': 'B', '10': 'B', '14': 'B', '17': 'B', '18': 'B',
  '22': 'B', '27': 'B', '28': 'B', '29': 'B', '35': 'B', '44': 'B', '45': 'B', '49': 'B', '50': 'B',
  '51': 'B', '52': 'B', '53': 'B', '54': 'B', '55': 'B', '56': 'B', '57': 'B', '59': 'B', '60': 'B',
  '61': 'B', '62': 'B', '76': 'B', '80': 'B', '83': 'B', '84': 'B', '85': 'B', '88': 'B', '89': 'B',
  '2A': 'B', '2B': 'B',
  '09': 'C', '11': 'C', '12': 'C', '30': 'C', '31': 'C', '32': 'C', '34': 'C', '48': 'C', '66': 'C',
  '75': 'C', '77': 'C', '78': 'C', '81': 'C', '82': 'C', '91': 'C', '92': 'C', '93': 'C', '94': 'C', '95': 'C',
};

function codePostalToDepartement(codePostal: string): string | null {
  const cp = String(codePostal).trim().replace(/\s/g, '');
  if (!/^\d{5}$/.test(cp)) return null;
  const num = cp.slice(0, 2);
  if (num === '20') return cp.startsWith('200') || cp.startsWith('201') ? '2A' : '2B';
  if (num === '97' || num === '98') return cp.slice(0, 3);
  return num;
}

function departementToZone(dep: string | null): ZoneScolaire | null {
  if (!dep) return null;
  const d = dep.length === 2 || dep.length === 3 ? dep : String(dep).padStart(2, '0').slice(0, 2);
  return DEPARTEMENT_TO_ZONE[d] ?? null;
}

/** Déduit la zone scolaire (A, B, C) à partir d'un code postal. */
export function codePostalToZone(codePostal: string): ZoneScolaire | null {
  return departementToZone(codePostalToDepartement(codePostal));
}

/** Récupère les vacances pour une zone donnée. */
export async function fetchVacancesScolaires(
  zone: ZoneScolaire,
  options: FetchVacancesOptions = {}
): Promise<VacancesRecord[]> {
  const { population = 'Élèves', limit = 100, anneeScolaire } = options;
  const zoneLabel = `Zone ${zone}`;
  let where = `zones="${zoneLabel}" and population="${population}"`;
  if (anneeScolaire) where += ` and annee_scolaire="${anneeScolaire}"`;
  const params = new URLSearchParams({ where, limit: String(limit) });
  const res = await fetch(`${API_BASE}?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Commune-Plus-BackOffice/1.0',
    },
  });
  if (!res.ok) {
    const fallback = await fetchVacancesScolairesFromFallback(zone, options);
    if (fallback.length > 0) return fallback;
    throw new Error(`API vacances: ${res.status}`);
  }
  const data = (await res.json()) as { results?: VacancesRecord[] };
  return data.results ?? [];
}

function toSchoolYear(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function parseFallbackCsvToRecords(csvContent: string, zone: ZoneScolaire): VacancesRecord[] {
  const zoneColumn = FALLBACK_ZONE_COLUMN[zone];
  const lines = csvContent.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0]!.split(',').map((v) => v.trim());
  const dateIndex = headers.indexOf('date');
  const zoneIndex = headers.indexOf(zoneColumn);
  const nameIndex = headers.indexOf('nom_vacances');
  if (dateIndex < 0 || zoneIndex < 0 || nameIndex < 0) return [];

  const records: VacancesRecord[] = [];
  let currentStart: string | null = null;
  let currentEnd: string | null = null;
  let currentName: string | null = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(',');
    const date = String(cols[dateIndex] || '').trim();
    const isVacances = String(cols[zoneIndex] || '').trim().toLowerCase() === 'true';
    const name = String(cols[nameIndex] || '').trim() || 'Vacances scolaires';

    if (isVacances) {
      if (!currentStart) {
        currentStart = `${date}T00:00:00.000Z`;
        currentEnd = `${date}T23:59:59.999Z`;
        currentName = name;
      } else if (currentName === name) {
        currentEnd = `${date}T23:59:59.999Z`;
      } else {
        records.push({
          description: currentName || 'Vacances scolaires',
          population: 'Élèves',
          start_date: currentStart,
          end_date: currentEnd || currentStart,
          location: 'France',
          zones: `Zone ${zone}`,
          annee_scolaire: toSchoolYear(currentStart),
        });
        currentStart = `${date}T00:00:00.000Z`;
        currentEnd = `${date}T23:59:59.999Z`;
        currentName = name;
      }
      continue;
    }

    if (currentStart) {
      records.push({
        description: currentName || 'Vacances scolaires',
        population: 'Élèves',
        start_date: currentStart,
        end_date: currentEnd || currentStart,
        location: 'France',
        zones: `Zone ${zone}`,
        annee_scolaire: toSchoolYear(currentStart),
      });
      currentStart = null;
      currentEnd = null;
      currentName = null;
    }
  }

  if (currentStart) {
    records.push({
      description: currentName || 'Vacances scolaires',
      population: 'Élèves',
      start_date: currentStart,
      end_date: currentEnd || currentStart,
      location: 'France',
      zones: `Zone ${zone}`,
      annee_scolaire: toSchoolYear(currentStart),
    });
  }

  return records;
}

async function fetchVacancesScolairesFromFallback(
  zone: ZoneScolaire,
  options: FetchVacancesOptions = {},
): Promise<VacancesRecord[]> {
  if (!fallbackCacheByZone) {
    const res = await fetch(FALLBACK_CSV_URL, {
      headers: { Accept: 'text/csv' },
    });
    if (!res.ok) return [];
    const csv = await res.text();
    fallbackCacheByZone = {
      A: parseFallbackCsvToRecords(csv, 'A'),
      B: parseFallbackCsvToRecords(csv, 'B'),
      C: parseFallbackCsvToRecords(csv, 'C'),
    };
  }

  let out = fallbackCacheByZone[zone] || [];
  if (options.anneeScolaire) {
    out = out.filter((v) => v.annee_scolaire === options.anneeScolaire);
  }
  return out.slice(0, options.limit ?? 100);
}

/** Récupère la zone et les vacances pour un code postal. */
export async function getVacancesByCodePostal(
  codePostal: string,
  options: FetchVacancesOptions = {}
): Promise<VacancesByCodePostalResult> {
  const zone = codePostalToZone(codePostal);
  if (!zone) {
    return { zone: null, vacances: [], error: 'Zone inconnue pour ce code postal' };
  }
  try {
    const vacances = await fetchVacancesScolaires(zone, options);
    return { zone, vacances };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return { zone, vacances: [], error: message };
  }
}

/** Indique si une date est en vacances pour une zone (à partir de la liste des vacances). */
export function isDateEnVacances(
  date: Date,
  vacances: VacancesRecord[]
): boolean {
  const t = date.getTime();
  return vacances.some((v) => {
    const start = new Date(v.start_date).getTime();
    const end = new Date(v.end_date).getTime();
    return t >= start && t <= end;
  });
}
