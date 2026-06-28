/**
 * PARSER PDF PMU
 * Import intelligent des programmes de courses
 * Version robuste avec fallback et validation
 */

const PDFParser = {
  config: {
    cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    workerUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    timeout: 30000,
    maxSize: 10 * 1024 * 1024, // 10MB
    fallbackActif: false
  },

  /**
   * Initialise PDF.js avec fallback
   */
  async init() {
    if (typeof pdfjsLib !== 'undefined') return true;
    
    try {
      await this.loadScript(this.config.cdnUrl);
      pdfjsLib.GlobalWorkerOptions.workerSrc = this.config.workerUrl;
      console.log('✅ PDF.js chargé depuis CDN');
      return true;
    } catch (e) {
      console.warn('⚠️ CDN indisponible:', e.message);
      this.config.fallbackActif = true;
      return false;
    }
  },

  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Impossible de charger ${url}`));
      script.timeout = this.config.timeout;
      document.head.appendChild(script);
    });
  },

  /**
   * Parse un fichier PDF
   */
  async parse(file) {
    // Vérification préliminaire
    if (!file || file.size === 0) {
      throw new Error('Fichier vide ou invalide');
    }
    
    if (file.size > this.config.maxSize) {
      throw new Error(`Fichier trop volumineux (${(file.size/1024/1024).toFixed(1)}MB > 10MB)`);
    }

    // Vérifier l'extension
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Le fichier doit être au format PDF');
    }

    const pdfDisponible = await this.init();
    
    if (!pdfDisponible) {
      throw new Error('PDF.js non disponible. Utilisez la saisie manuelle ou vérifiez votre connexion.');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let texteComplet = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        texteComplet += content.items.map(item => item.str).join(' ') + '\n';
      }

      return this.extraireDonnees(texteComplet, file.name);
      
    } catch (e) {
      console.error('Erreur parsing PDF:', e);
      throw new Error(`Erreur lors de la lecture du PDF: ${e.message}`);
    }
  },

  /**
   * Extrait les données structurées du texte brut
   * Supporte plusieurs formats de programmes PMU
   */
  extraireDonnees(texte, nomFichier = '') {
    const lignes = texte.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
    
    const course = {
      nomFichier: nomFichier,
      hippodrome: this.detecterHippodrome(lignes),
      date: this.detecterDate(lignes),
      heure: this.detecterHeure(lignes),
      numeroCourse: this.detecterNumeroCourse(lignes),
      typeCourse: this.detecterTypeCourse(lignes),
      distance: this.detecterDistance(lignes),
      chevaux: [],
      metadonnees: {
        nbLignes: lignes.length,
        dateExtraction: new Date().toISOString()
      }
    };

    // Patterns de détection des chevaux (plusieurs formats possibles)
    const patterns = [
      // Format standard: N° Nom Cote P1 P2 P3 P4 P5
      /^(\d+)\s+([A-Za-zÀ-ÿ\s\-'"]+?)\s+(\d+(?:[,.]\d+)?)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)$/,
      // Format avec parenthèses: N° Nom (driver) Cote P1 P2 P3 P4 P5
      /^(\d+)\s+([A-Za-zÀ-ÿ\s\-'"]+?)\s*\([^)]*\)\s+(\d+(?:[,.]\d+)?)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)$/,
      // Format compact: N°NomCoteP1P2P3P4P5
      /^(\d+)([A-Z][a-zA-ZÀ-ÿ\s\-'"]*?)(\d+(?:[,.]\d+)?)(\d)(\d)(\d)(\d)(\d)$/
    ];

    let chevauxTrouves = 0;
    
    for (const ligne of lignes) {
      for (const pattern of patterns) {
        const match = ligne.match(pattern);
        if (match) {
          const cheval = {
            numero: parseInt(match[1]),
            nom: this.nettoyerNom(match[2]),
            cote: parseFloat(match[3].replace(',', '.')),
            performances: [
              parseInt(match[4]),
              parseInt(match[5]),
              parseInt(match[6]),
              parseInt(match[7]),
              parseInt(match[8])
            ],
            source: 'pdf'
          };
          
          // Validation basique
          if (cheval.cote > 0 && cheval.cote <= 100 && 
              cheval.performances.every(p => p >= 0 && p <= 9)) {
            course.chevaux.push(cheval);
            chevauxTrouves++;
            break; // Passer à la ligne suivante
          }
        }
      }
    }

    // Post-traitement
    if (course.chevaux.length === 0) {
      // Essayer le mode "détection agressive"
      course.chevaux = this.detectionAggressive(lignes);
    }

    // Validation finale
    if (course.chevaux.length === 0) {
      throw new Error('Aucun cheval détecté dans le PDF. Le format peut être non supporté ou le PDF est scanné (image).');
    }

    // Trier par numéro
    course.chevaux.sort((a, b) => a.numero - b.numero);
    
    // Vérifier la cohérence
    const validation = Validator.verifierCohérence(course);
    if (!validation.coherente) {
      course.avertissements = validation.avertissements;
    }

    return course;
  },

  /**
   * Mode détection agressive pour les formats non standards
   */
  detectionAggressive(lignes) {
    const chevaux = [];
    
    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      
      // Chercher un numéro suivi d'un nom en début de ligne
      const matchDebut = ligne.match(/^(\d+)\s+([A-Z][a-zA-ZÀ-ÿ\s\-'"]{2,30})/);
      if (matchDebut) {
        const numero = parseInt(matchDebut[1]);
        const nom = this.nettoyerNom(matchDebut[2]);
        
        // Chercher les données numériques sur cette ligne ou les suivantes
        let donneesNumeriques = [];
        
        // Essayer sur la même ligne
        const numsMemeLigne = ligne.match(/(\d+(?:[,.]\d+)?)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)/g);
        if (numsMemeLigne) {
          donneesNumeriques = numsMemeLigne[0].split(/\s+/).map(n => parseFloat(n.replace(',', '.')));
        }
        
        // Essayer la ligne suivante
        if (donneesNumeriques.length < 6 && i + 1 < lignes.length) {
          const ligneSuivante = lignes[i + 1];
          const numsSuivante = ligneSuivante.match(/(\d+(?:[,.]\d+)?)\s+(\d)\s+(\d)\s+(\d)\s+(\d)\s+(\d)/);
          if (numsSuivante) {
            donneesNumeriques = numsSuivante.slice(1).map(n => parseFloat(n.replace(',', '.')));
          }
        }
        
        if (donneesNumeriques.length >= 6) {
          chevaux.push({
            numero,
            nom,
            cote: donneesNumeriques[0],
            performances: donneesNumeriques.slice(1, 6).map(n => Math.round(n)),
            source: 'pdf-agressif'
          });
        }
      }
    }
    
    return chevaux;
  },

  nettoyerNom(nom) {
    return nom
      .replace(/\s+/g, ' ')
      .replace(/[^A-Za-zÀ-ÿ\s\-'"]/g, '')
      .trim()
      .substring(0, 50);
  },

  detecterHippodrome(lignes) {
    const texte = lignes.join(' ');
    const hippodromesConnus = [
      'Vincennes', 'Auteuil', 'Enghien', 'Cagnes-sur-Mer', 'Cagnes',
      'Marseille', 'Paris', 'Lyon', 'Toulouse', 'Bordeaux',
      'Nantes', 'Strasbourg', 'Deauville', 'Chantilly', 'Longchamp'
    ];
    
    for (const h of hippodromesConnus) {
      if (texte.includes(h)) return h;
    }
    
    // Détection par contexte
    const matchHippodrome = texte.match(/(?:Hippodrome|Réunion|Course)\s*(?:de|du|d')?\s*([A-Z][a-zA-ZÀ-ÿ\s]+?)(?:\s+-|\s*\d|$)/);
    if (matchHippodrome) {
      return matchHippodrome[1].trim();
    }
    
    return 'Inconnu';
  },

  detecterDate(lignes) {
    const texte = lignes.join(' ');
    
    // Format JJ/MM/AAAA
    const match1 = texte.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match1) return `${match1[3]}-${match1[2]}-${match1[1]}`;
    
    // Format JJ-MM-AAAA
    const match2 = texte.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (match2) return `${match2[3]}-${match2[2]}-${match2[1]}`;
    
    // Format AAAA-MM-JJ
    const match3 = texte.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match3) return `${match3[1]}-${match3[2]}-${match3[3]}`;
    
    return new Date().toISOString().split('T')[0];
  },

  detecterHeure(lignes) {
    const texte = lignes.join(' ');
    const match = texte.match(/(\d{1,2})[hH:](\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '13:30';
  },

  detecterNumeroCourse(lignes) {
    const texte = lignes.join(' ');
    const match = texte.match(/(?:Course|R\d+C)\s*(\d+)|R\d+\s*C(\d+)/i);
    return match ? (match[1] || match[2]) : '1';
  },

  detecterTypeCourse(lignes) {
    const texte = lignes.join(' ').toLowerCase();
    if (texte.includes('trot')) return 'Trot';
    if (texte.includes('plat')) return 'Plat';
    if (texte.includes('obstacle') || texte.includes('haies')) return 'Obstacle';
    if (texte.includes('steeple')) return 'Steeple';
    return 'Inconnu';
  },

  detecterDistance(lignes) {
    const texte = lignes.join(' ');
    const match = texte.match(/(\d{3,4})\s*m/);
    return match ? match[1] + 'm' : '2700m';
  }
};