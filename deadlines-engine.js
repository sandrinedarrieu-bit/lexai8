// ─── Jours fériés France (calcul dynamique) ───────────────────────────────
function getJoursFeries(annee) {
  const paques = (y) => {
    const a = y % 19, b = Math.floor(y/100), c = y % 100;
    const d = Math.floor(b/4), e = b%4, f = Math.floor((b+8)/25);
    const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15)%30;
    const i = Math.floor(c/4), k = c%4, l = (32+2*e+2*i-h-k)%7;
    const m = Math.floor((a+11*h+22*l)/451);
    const mois = Math.floor((h+l-7*m+114)/31);
    const jour = ((h+l-7*m+114)%31)+1;
    return new Date(y, mois-1, jour);
  };
  const P = paques(annee);
  const d = (m,j) => new Date(annee,m-1,j).toDateString();
  const offset = (date,n) => { const r=new Date(date); r.setDate(r.getDate()+n); return r.toDateString(); };
  return new Set([
    d(1,1),   // Jour de l'an
    offset(P,1),  // Lundi de Pâques
    d(5,1),   // Fête du Travail
    d(5,8),   // Victoire 1945
    offset(P,39), // Ascension
    offset(P,50), // Lundi de Pentecôte
    d(7,14),  // Fête Nationale
    d(8,15),  // Assomption
    d(11,1),  // Toussaint
    d(11,11), // Armistice
    d(12,25), // Noël
  ]);
}

// ─── Calcul du délai en jours ouvrables (hors week-end + fériés) ──────────
function addJoursOuvrables(dateDebut, nbJours) {
  let date = new Date(dateDebut);
  let compteur = 0;
  while (compteur < nbJours) {
    date.setDate(date.getDate() + 1);
    const feries = getJoursFeries(date.getFullYear());
    const jour = date.getDay();
    if (jour !== 0 && jour !== 6 && !feries.has(date.toDateString()))
      compteur++;
  }
  return date;
}

// ─── Calcul délai calendaire simple (jours francs) ────────────────────────
function addJoursCalendaires(dateDebut, nbJours) {
  const d = new Date(dateDebut);
  d.setDate(d.getDate() + nbJours);
  return d;
}// ─── Catalogue des délais légaux par type d'acte ─────────────────────────
const TYPES_ACTES = {

  // ── Droit du travail ──────────────────────────────────────────────────
  cdd_requalification: {
    label: 'CDD → requalification CDI',
    delai: 24, unite: 'mois', mode: 'calendaire',
    source: 'Art. L1471-1 Code du travail'
  },
  licenciement_contestation: {
    label: 'Contestation licenciement',
    delai: 12, unite: 'mois', mode: 'calendaire',
    source: 'Art. L1471-1 Code du travail'
  },
  preavis_cdi: {
    label: 'Préavis CDI (cadre)',
    delai: 3, unite: 'mois', mode: 'calendaire',
    source: 'Convention collective applicable'
  },

  // ── Procédure civile (NCPC) ───────────────────────────────────────────
  mise_en_demeure_reponse: {
    label: 'Réponse mise en demeure',
    delai: 8, unite: 'jours', mode: 'ouvrable',
    source: 'Usage / contrat'
  },
  assignation_comparution: {
    label: 'Délai de comparution (assignation)',
    delai: 15, unite: 'jours', mode: 'calendaire',
    source: 'Art. 855 CPC'
  },
  appel_jugement: {
    label: 'Appel d\'un jugement',
    delai: 1, unite: 'mois', mode: 'calendaire',
    source: 'Art. 538 CPC'
  },
  opposition_jugement: {
    label: 'Opposition à jugement',
    delai: 1, unite: 'mois', mode: 'calendaire',
    source: 'Art. 571 CPC'
  },
  conclusions_fond: {
    label: 'Conclusions au fond (appel)',
    delai: 3, unite: 'mois', mode: 'calendaire',
    source: 'Art. 908 CPC'
  },

  // ── Droit commercial ──────────────────────────────────────────────────
  garantie_vices_caches: {
    label: 'Action vices cachés',
    delai: 24, unite: 'mois', mode: 'calendaire',
    source: 'Art. 1648 Code civil'
  },
  prescription_commerciale: {
    label: 'Prescription action commerciale',
    delai: 5, unite: 'ans', mode: 'calendaire',
    source: 'Art. L110-4 Code commerce'
  },

  // ── Baux ──────────────────────────────────────────────────────────────
  conge_bail_commercial: {
    label: 'Congé bail commercial',
    delai: 6, unite: 'mois', mode: 'calendaire',
    source: 'Art. L145-9 Code commerce'
  },
  renouvellement_bail: {
    label: 'Demande renouvellement bail',
    delai: 6, unite: 'mois', mode: 'calendaire',
    source: 'Art. L145-10 Code commerce'
  },
};// ─── Calcul d'une échéance à partir d'un type d'acte ─────────────────────
function calculerEcheance(typeActe, dateOrigine) {
  const config = TYPES_ACTES[typeActe];
  if (!config) throw new Error(`Type d'acte inconnu : ${typeActe}`);

  const debut = new Date(dateOrigine);
  let echeance;

  if (config.unite === 'jours') {
    echeance = config.mode === 'ouvrable'
      ? addJoursOuvrables(debut, config.delai)
      : addJoursCalendaires(debut, config.delai);

  } else if (config.unite === 'mois') {
    echeance = new Date(debut);
    echeance.setMonth(echeance.getMonth() + config.delai);

  } else if (config.unite === 'ans') {
    echeance = new Date(debut);
    echeance.setFullYear(echeance.getFullYear() + config.delai);
  }

  return {
    typeActe,
    label:        config.label,
    source:       config.source,
    dateOrigine:  debut.toISOString().split('T')[0],
    dateEcheance: echeance.toISOString().split('T')[0],
    delaiJours:   Math.ceil((echeance - debut) / (1000*60*60*24)),
  };
}

// ─── Exemple d'utilisation ────────────────────────────────────────────────
// const result = calculerEcheance('mise_en_demeure_reponse', '2026-06-03');
// → { dateEcheance: '2026-06-13', delaiJours: 8, label: 'Réponse mise en demeure', ... }async function calculerEcheanceAvecClaude(descriptionActe, dateOrigine) {
  const apiKey = localStorage.getItem('anthropic_api_key');
  if (!apiKey) throw new Error('Clé API Anthropic manquante');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Tu es un juriste français expert en procédure.
Acte : "${descriptionActe}"
Date de l'acte : ${dateOrigine}
Réponds UNIQUEMENT en JSON valide, sans texte autour :
{
  "delai_jours": ,
  "mode": "calendaire" ou "ouvrable",
  "date_echeance": "YYYY-MM-DD",
  "source_legale": "article de loi applicable",
  "explication": "une phrase"
}`
      }]
    })
  });

  const data = await res.json();
  const text = data.content[0].text.trim();
  return JSON.parse(text);
}
