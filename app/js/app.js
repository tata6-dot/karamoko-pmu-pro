/**
 * KARAMOKO PMU PRO - Application Principale
 */

class KaramokoPMApp {
  constructor() {
    this.course = null;
    this.analyse = null;
    this.params = {
      hippodrome: 'Vincennes',
      distance: '2700m',
      corde: 'gauche',
      meteo: 'bon'
    };
  }

  async init() {
    console.log('Initialisation Karamoko PMU Pro...');
    
    await loadHippodromeData();
    await PMUDatabase.init();
    
    // Demarrer la sauvegarde auto
    if (typeof BackupManager !== 'undefined') {
      BackupManager.startAutoSave(() => this.course);
    }
    
    // Verifier s'il y a une session precedente
    const autoSave = await PMUDatabase.recupererAutoSave();
    if (autoSave) {
      if (confirm('Une session precedente a ete trouvee. Reprendre ?')) {
        this.course = autoSave;
        this.afficherVueAnalyse();
      }
    }
    
    this.attachGlobalEvents();
    this.afficherVueAccueil();
    
    console.log('Application prete');
  }

  attachGlobalEvents() {
    document.getElementById('btn-import-pdf')?.addEventListener('click', () => this.importerPDF());
    document.getElementById('btn-manuel')?.addEventListener('click', () => this.nouvelleSaisie());
    document.getElementById('btn-calculer')?.addEventListener('click', () => this.calculer());
    document.getElementById('btn-sauvegarder')?.addEventListener('click', () => this.sauvegarderCourse());
    document.getElementById('btn-export')?.addEventListener('click', () => this.exporter());
    
    document.getElementById('hippodrome-select')?.addEventListener('change', (e) => {
      this.params.hippodrome = e.target.value;
      this.mettreAJourDistances();
    });
    
    document.getElementById('distance-select')?.addEventListener('change', (e) => {
      this.params.distance = e.target.value;
    });
    
    document.getElementById('corde-select')?.addEventListener('change', (e) => {
      this.params.corde = e.target.value;
    });

    window.addEventListener('pmu:course-pret', (e) => {
      this.course = e.detail;
      this.afficherVueAnalyse();
    });
    
    window.addEventListener('pmu:recalculer', () => this.calculer());
    
    window.addEventListener('pmu:charger-course', async (e) => {
      const course = await PMUDatabase.getCourse(e.detail.id);
      if (course) {
        this.course = course;
        this.afficherVueAnalyse();
      }
    });
    
    window.addEventListener('pmu:supprimer-course', async (e) => {
      await PMUDatabase.supprimerCourse(e.detail.id);
      this.afficherHistorique();
    });
  }

  afficherVueAccueil() {
    this.cacherToutesVues();
    const el = document.getElementById('vue-accueil');
    if (el) el.style.display = 'block';
  }

  afficherVueSaisie() {
    this.cacherToutesVues();
    const el = document.getElementById('vue-saisie');
    if (el) {
      el.style.display = 'block';
      if (typeof ManualEntry !== 'undefined') {
        ManualEntry.genererFormulaire(16);
      }
    }
  }

  afficherVueAnalyse() {
    this.cacherToutesVues();
    const el = document.getElementById('vue-analyse');
    if (el) el.style.display = 'block';
    
    if (this.course) {
      if (typeof UIRenderer !== 'undefined') {
        UIRenderer.renderTableauChevaux(this.course.chevaux);
      }
      this.calculer();
    }
  }

  async afficherHistorique() {
    this.cacherToutesVues();
    const el = document.getElementById('vue-historique');
    if (el) el.style.display = 'block';
    
    if (typeof PMUDatabase !== 'undefined') {
      const courses = await PMUDatabase.getCourses();
      const stats = await PMUDatabase.getStatistiques();
      if (typeof UIRenderer !== 'undefined') {
        UIRenderer.renderHistorique(courses);
        UIRenderer.renderStats(stats);
      }
    }
  }

  cacherToutesVues() {
    ['vue-accueil', 'vue-saisie', 'vue-analyse', 'vue-historique'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  async importerPDF() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      if (typeof PMUModals !== 'undefined') {
        PMUModals.chargement('Analyse du PDF...');
      }
      
      try {
        if (typeof PDFParser !== 'undefined') {
          const course = await PDFParser.parse(file);
          this.course = course;
          if (typeof PMUModals !== 'undefined') PMUModals.fermer();
          this.afficherVueAnalyse();
        } else {
          throw new Error('PDFParser non disponible');
        }
      } catch (err) {
        if (typeof PMUModals !== 'undefined') PMUModals.fermer();
        alert('Erreur: ' + err.message);
      }
    };
    
    input.click();
  }

  nouvelleSaisie() {
    this.course = null;
    this.afficherVueSaisie();
  }

  calculer() {
    if (!this.course || !this.course.chevaux || !this.course.chevaux.length) return;
    
    this.mettreAJourDonneesTableau();
    
    if (typeof Validator !== 'undefined') {
      const paramsValidation = Validator.validerParams(this.params);
      this.params = paramsValidation.params;
    }
    
    if (typeof SinayokoEngine !== 'undefined') {
      this.analyse = SinayokoEngine.analyserCourse(this.course, this.params);
      
      if (typeof UIRenderer !== 'undefined' && this.analyse) {
        UIRenderer.updateScores(this.analyse.analyses?.tousScores || []);
        UIRenderer.renderGazette(this.analyse.analyses?.gazette || []);
        UIRenderer.renderConsensus(this.analyse.analyses?.consensus || {});
        UIRenderer.renderSpeciaux(this.analyse.analyses?.speciaux || {});
        UIRenderer.renderCombinaisons(this.analyse.analyses?.combinaisons || []);
      }
    }
    
    this.sauvegarderAuto();
  }

  mettreAJourDonneesTableau() {
    const rows = document.querySelectorAll('#tableau-chevaux tbody tr');
    
    rows.forEach((row, i) => {
      if (this.course.chevaux[i]) {
        const nom = row.querySelector('.input-nom')?.value?.trim();
        const cote = row.querySelector('.input-cote')?.value;
        const perfs = Array.from(row.querySelectorAll('.input-perf')).map(p => p.value);
        
        if (nom) {
          this.course.chevaux[i].nom = nom;
          this.course.chevaux[i].cote = parseFloat(cote) || 0;
          this.course.chevaux[i].performances = perfs.map(p => parseInt(p) || 0);
        }
      }
    });
  }

  async sauvegarderCourse() {
    if (!this.course) return;
    
    try {
      if (typeof PMUDatabase !== 'undefined') {
        const id = await PMUDatabase.sauvegarderCourse(this.course);
        alert('Course sauvegardee (ID: ' + id + ')');
      }
    } catch (e) {
      alert('Erreur de sauvegarde: ' + e.message);
    }
  }

  async autoSave() {
    if (this.course) {
      if (typeof PMUDatabase !== 'undefined') {
        await PMUDatabase.sauvegardeAuto(this.course);
      }
      if (typeof BackupManager !== 'undefined') {
        BackupManager.create(this.course, 'Auto-save');
      }
    }
  }

  exporter() {
    if (!this.course) return;
    
    if (typeof PMUExporter !== 'undefined') {
      PMUExporter.exportCourseRapide(this.course, this.analyse?.analyses);
      alert('Export reussi !');
    }
  }

  mettreAJourDistances() {
    if (typeof HippodromeData === 'undefined') return;
    
    const hippodrome = HippodromeData[this.params.hippodrome];
    const select = document.getElementById('distance-select');
    
    if (hippodrome && select && hippodrome.distances) {
      select.innerHTML = hippodrome.distances.map(d => 
        '<option value="' + d + '">' + d + '</option>'
      ).join('');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new KaramokoPMApp();
  window.app.init();
});