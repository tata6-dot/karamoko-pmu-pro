/**
 * COMBINATOR - Générateur de combinaisons
 */

const Combinator = {
  genererToutesCombinaisons(analyses, typeJeu = 'simple') {
    const { gazette, consensus, speciaux } = analyses;
    
    switch(typeJeu) {
      case 'simple': return this.combinaisonsSimples(gazette, consensus);
      case 'couple': return this.combinaisonsCouple(gazette, consensus, speciaux);
      case 'trio': return this.combinaisonsTrio(gazette, consensus, speciaux);
      default: return this.combinaisonsSimples(gazette, consensus);
    }
  },

  combinaisonsSimples(gazette, consensus) {
    const combos = [];
    const tous = [...gazette, ...consensus].sort((a, b) => b.score - a.score);
    
    for (let i = 0; i < Math.min(tous.length, 5); i++) {
      combos.push({
        type: 'SIMPLE',
        chevaux: [tous[i].cheval],
        score: tous[i].score,
        confiance: tous[i].niveau.confiance,
        miseRecommandee: this.calculerMise(tous[i].niveau.confiance)
      });
    }
    return combos;
  },

  combinaisonsCouple(gazette, consensus, speciaux) {
    const combos = [];
    const base = [...gazette, ...consensus.slice(0, 3)];
    
    for (let i = 0; i < base.length; i++) {
      for (let j = i + 1; j < base.length; j++) {
        combos.push({
          type: 'COUPLE',
          chevaux: [base[i].cheval, base[j].cheval],
          score: Math.round((base[i].score + base[j].score) * 100) / 100,
          confiance: Math.round((base[i].niveau.confiance + base[j].niveau.confiance) / 2),
          miseRecommandee: this.calculerMise((base[i].niveau.confiance + base[j].niveau.confiance) / 2)
        });
      }
    }
    return combos.sort((a, b) => b.score - a.score).slice(0, 10);
  },

  combinaisonsTrio(gazette, consensus, speciaux) {
    const combos = [];
    const base = [...gazette.slice(0, 3), ...consensus.slice(0, 2), ...speciaux.slice(0, 1)];
    
    for (let i = 0; i < base.length; i++) {
      for (let j = i + 1; j < base.length; j++) {
        for (let k = j + 1; k < base.length; k++) {
          combos.push({
            type: 'TRIO',
            chevaux: [base[i].cheval, base[j].cheval, base[k].cheval],
            score: Math.round((base[i].score + base[j].score + base[k].score) * 100) / 100,
            confiance: Math.round((base[i].niveau.confiance + base[j].niveau.confiance + base[k].niveau.confiance) / 3),
            miseRecommandee: this.calculerMise((base[i].niveau.confiance + base[j].niveau.confiance + base[k].niveau.confiance) / 3)
          });
        }
      }
    }
    return combos.sort((a, b) => b.score - a.score).slice(0, 15);
  },

  calculerMise(confiance) {
    if (confiance >= 90) return 'Mise forte (5-10€)';
    if (confiance >= 80) return 'Mise moyenne (2-5€)';
    if (confiance >= 70) return 'Mise faible (1-2€)';
    return 'Mise symbolique (0.5-1€)';
  }
};