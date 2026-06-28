/**
 * MOTEUR SINAYOKO v2.0
 * Logique métier pure
 */

const SinayokoEngine = {
  COEFFICIENTS: {
    COTE_BASE: 100,
    PERFORMANCE_MAX: 9,
    CORRECTION_DEFAUT: 0,
    SEUIL_GAZETTE: 80,
    SEUIL_CONSENSUS: 70,
    SEUIL_SPECIAL: 60
  },

  calculerScore(cheval, params) {
    const { cote, performances, nom } = cheval;
    const { hippodrome, distance, corde } = params;
    
    const coteNum = parseFloat(cote) || 0;
    const perfs = Array.isArray(performances) ? performances : [0,0,0,0,0];
    
    const scoreBase = this.COEFFICIENTS.COTE_BASE - coteNum;
    const bonusPerf = perfs.reduce((sum, p) => sum + (parseInt(p) || 0), 0);
    const correctionCorde = this.getCorrectionCorde(hippodrome, corde, distance);
    const scoreFinal = scoreBase + bonusPerf + correctionCorde;
    const niveau = this.determinerNiveau(scoreFinal, coteNum);
    
    return {
      score: Math.round(scoreFinal * 100) / 100,
      details: { base: scoreBase, performances: bonusPerf, corde: correctionCorde, total: scoreFinal },
      niveau,
      cheval: nom || 'Inconnu',
      cote: coteNum
    };
  },

  determinerNiveau(score, cote) {
    const { SEUIL_GAZETTE, SEUIL_CONSENSUS, SEUIL_SPECIAL } = this.COEFFICIENTS;
    
    if (score >= SEUIL_GAZETTE && cote <= 15) {
      return { label: 'GAZETTE', couleur: '#4CAF50', confiance: 95, description: 'Pronostic fort' };
    }
    if (score >= SEUIL_CONSENSUS && cote <= 20) {
      return { label: 'CONSENSUS', couleur: '#2196F3', confiance: 85, description: 'Bonne chance' };
    }
    if (score >= SEUIL_SPECIAL) {
      return { label: 'SPÉCIAL', couleur: '#FF9800', confiance: 70, description: 'Surprise possible' };
    }
    return { label: 'À SURVEILLER', couleur: '#9E9E9E', confiance: 50, description: 'Faible confiance' };
  },

  getCorrectionCorde(hippodrome, corde, distance) {
    const data = HippodromeData[hippodrome];
    if (!data) return this.COEFFICIENTS.CORRECTION_DEFAUT;
    
    const cordeKey = corde === 'gauche' ? 'corde_gauche' : 'corde_droite';
    const distKey = distance || data.distances[0];
    const calibration = data.calibrations[distKey];
    if (!calibration) return this.COEFFICIENTS.CORRECTION_DEFAUT;
    
    const correction = (calibration[cordeKey] - 1) * 10;
    return Math.round(correction * 10) / 10;
  },

  genererGazette(chevaux, params, limite = 5) {
    const scores = chevaux.map(c => this.calculerScore(c, params));
    return scores.filter(s => s.niveau.label === 'GAZETTE').sort((a, b) => b.score - a.score).slice(0, limite);
  },

  genererConsensus(chevaux, params) {
    const scores = chevaux.map(c => this.calculerScore(c, params));
    return scores.filter(s => s.niveau.label === 'CONSENSUS').sort((a, b) => b.score - a.score);
  },

  genererSpeciaux(chevaux, params) {
    const scores = chevaux.map(c => this.calculerScore(c, params));
    return scores.filter(s => s.niveau.label === 'SPÉCIAL').sort((a, b) => b.score - a.score);
  },

  genererCombinaisons(gazette, doublons, speciaux, maxCombos = 20) {
    const combos = [];
    
    if (gazette.length > 0 && doublons.length > 0) {
      for (const g of gazette) {
        for (const d of doublons) {
          if (g.cheval !== d.cheval) {
            combos.push({
              type: 'G×D',
              chevaux: [g.cheval, d.cheval],
              score: Math.round((g.score + d.score) * 100) / 100,
              confiance: Math.round(Math.min(g.niveau.confiance, d.niveau.confiance) * 0.9),
              details: `${g.cheval} (Gazette) + ${d.cheval} (Doublon)`
            });
          }
        }
      }
    }
    
    if (speciaux.length > 0 && gazette.length > 0) {
      const topGazette = gazette.slice(0, 3);
      for (const s of speciaux) {
        for (const g of topGazette) {
          if (s.cheval !== g.cheval) {
            combos.push({
              type: 'S×G',
              chevaux: [s.cheval, g.cheval],
              score: Math.round((s.score + g.score) * 100) / 100,
              confiance: Math.round(Math.min(s.niveau.confiance, g.niveau.confiance) * 0.8),
              details: `${s.cheval} (Spécial) + ${g.cheval} (Gazette)`
            });
          }
        }
      }
    }
    
    return combos.sort((a, b) => b.score - a.score).slice(0, maxCombos);
  },

  analyserCourse(course, params) {
    const chevaux = course.chevaux || [];
    const tousScores = chevaux.map(c => this.calculerScore(c, params));
    const gazette = this.genererGazette(chevaux, params);
    const consensus = this.genererConsensus(chevaux, params);
    const speciaux = this.genererSpeciaux(chevaux, params);
    const combinaisons = this.genererCombinaisons(gazette, consensus, speciaux);
    
    return {
      course: course.hippodrome || 'Inconnu',
      date: course.date || new Date().toISOString(),
      totalChevaux: chevaux.length,
      analyses: { tousScores, gazette, consensus, speciaux, combinaisons },
      resume: {
        nbGazette: gazette.length,
        nbConsensus: consensus.length,
        nbSpeciaux: speciaux.length,
        nbCombos: combinaisons.length,
        meilleurScore: tousScores.length > 0 ? Math.max(...tousScores.map(s => s.score)) : 0
      }
    };
  }
};

let HippodromeData = {};

async function loadHippodromeData() {
  try {
    const response = await fetch('data/hippodromes.json');
    HippodromeData = await response.json();
    console.log('✅ Données hippodromes chargées');
  } catch (e) {
    console.warn('⚠️ Impossible de charger hippodromes.json');
    HippodromeData = {};
  }
}