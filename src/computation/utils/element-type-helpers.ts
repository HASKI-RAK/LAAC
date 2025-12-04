import { xAPIStatement } from '../../data-access';

export type ElementTypeCode =
  | 'CT'
  | 'CO'
  | 'RQ'
  | 'SE'
  | 'FO'
  | 'RM'
  | 'AN'
  | 'EC'
  | 'EX'
  | 'RA'
  | 'CC'
  | 'AS'
  | 'unknown';

export function detectElementType(stmt: xAPIStatement): ElementTypeCode {
  const typeFromDefinition = stmt.object?.definition?.type;
  let name =
    stmt.object?.definition?.name?.['en'] ||
    stmt.object?.definition?.name?.['en-US'] ||
    '';

  // Strip HTML tags from name (e.g. <h6>Kurzübersicht </h6>)
  name = name.replace(/<[^>]*>/g, '').trim();

  const haystack = (typeFromDefinition || '') + ' ' + name;
  const lowerHaystack = haystack.toLowerCase().replace(/_/g, '-');

  // German mappings
  if (
    lowerHaystack.includes('kurzübersicht') ||
    lowerHaystack.includes('kommentar')
  )
    return 'CT';
  if (lowerHaystack.includes('erklärung') || lowerHaystack.includes('inhalt'))
    return 'CO';
  if (lowerHaystack.includes('reflexion') || lowerHaystack.includes('feedback'))
    return 'RQ';
  if (
    lowerHaystack.includes('selbsteinschätzungstest') ||
    lowerHaystack.includes('selftest')
  )
    return 'SE';
  if (lowerHaystack.includes('forum') || lowerHaystack.includes('diskussion'))
    return 'FO';
  if (
    lowerHaystack.includes('zusatzliteratur') ||
    lowerHaystack.includes('literatur')
  )
    return 'RM';
  if (lowerHaystack.includes('animation')) return 'AN';
  if (lowerHaystack.includes('übung') || lowerHaystack.includes('practice'))
    return 'EC';
  if (lowerHaystack.includes('beispiel')) return 'EX';
  if (
    lowerHaystack.includes('anwendung') ||
    lowerHaystack.includes('realitätsbezug')
  )
    return 'RA';
  if (
    lowerHaystack.includes('zusammenfassung') ||
    lowerHaystack.includes('fazit')
  )
    return 'CC';
  if (
    lowerHaystack.includes('aufgabe') ||
    lowerHaystack.includes('hausaufgabe')
  )
    return 'AS';

  // English mappings
  if (lowerHaystack.includes('commentary')) return 'CT';
  if (lowerHaystack.includes('content')) return 'CO';
  if (lowerHaystack.includes('reflection') || lowerHaystack.includes('quiz'))
    return 'RQ';
  if (lowerHaystack.includes('self-assessment')) return 'SE';
  if (lowerHaystack.includes('discussion')) return 'FO';
  if (lowerHaystack.includes('reading') || lowerHaystack.includes('resource'))
    return 'RM';
  // animation already covered
  if (lowerHaystack.includes('exercise')) return 'EC';
  if (lowerHaystack.includes('example')) return 'EX';
  if (lowerHaystack.includes('application')) return 'RA';
  if (lowerHaystack.includes('conclusion')) return 'CC';
  if (
    lowerHaystack.includes('assignment') ||
    lowerHaystack.includes('homework')
  )
    return 'AS';

  // Abbreviation prefix pattern: "SE - ..." etc.
  if (name) {
    const abbrev = name.split(/\s|-/)[0]?.toUpperCase();
    const codes: ElementTypeCode[] = [
      'CT',
      'CO',
      'RQ',
      'SE',
      'FO',
      'RM',
      'AN',
      'EC',
      'EX',
      'RA',
      'CC',
      'AS',
    ];
    if (codes.includes(abbrev as ElementTypeCode)) {
      return abbrev as ElementTypeCode;
    }
  }

  return 'unknown';
}
