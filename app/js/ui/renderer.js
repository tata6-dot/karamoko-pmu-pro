/**
 * RENDERER
 */

const UIRenderer = {
  renderTableauChevaux(chevaux, containerId = 'tableau-chevaux') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
          <thead>
            <tr style="background:#0f3460;">
              <th style="padding:12px;text-align:left;color:#e94560;">N°</th>
              <th style="padding:12px;text-align:left;color:#e94560;">Nom</th>
              <th style="padding:12px;text-align:left;color:#e94560;">Cote</th>
              <th style="padding:12px;text-align:center;color:#e94560;" colspan="5">Performances</th>
              <th style="padding:12px;text-align:left;color:#e94560;">Score</th>
              <th style="padding:12px;text-align:left;color:#e94560;">Niveau</th>
            </tr>
          </thead>
          <tbody>
    `;

    chevaux.forEach((c, i) => {
      html += `
        <tr style="border-bottom:1px solid #2a2a4a;" data-index="${i}">
          <td style="padding:8px;">${c.numero}</td>
          <td style="padding:8px;"><input type="text" class="input-nom" value="${c.nom || ''}" style="width:100%;padding:6px;background:#1a1a2e;border:1px solid #2a2a4a;color:white;border-radius:4px;" data-field="nom"></td>
          <td style="padding:8px;"><input type="number" class="input-cote" value="${c.cote || 10}" min="0.1" max="100" step="0.1" style="width:60px;padding:6px;background:#1a1a2e;border:1px solid #2a2a4a;color:white;border-radius:4px;" data-field="cote"></td>
          ${(c.performances || [0,0,0,0,0]).map((p, j) => `
            <td style="padding:8px;"><input type="number" class="input-perf" value="${p}" min="0" max="9" style="width:40px;padding:6px;background:#1a1a2e;border:1px solid #2a2a4a;color:white;border-radius:4px;text-align:center;" data-field="perf-${j}"></td>
          `).join('')}
          <td class="score-cell" style="padding:8px;font-weight:bold;">-</td>
          <td class="niveau-cell" style="padding:8px;"><span style="padding:4px 12px;background:#2a2a4a;border-radius:20px;font-size:0.75rem;">-</span></td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    this.attachTableListeners(container);
  },

  attachTableListeners(container) {
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        window.dispatchEvent(new CustomEvent('pmu:recalculer'));
      });
    });
  },

  updateScores(scores) {
    const rows = document.querySelectorAll('#tableau-chevaux tbody tr');
    
    rows.forEach(row => {
      const nom = row.querySelector('.input-nom')?.value;
      const scoreData = scores.find(s => s.cheval === nom);
      
      if (scoreData) {
        const scoreCell = row.querySelector('.score-cell');
        const niveauCell = row.querySelector('.niveau-cell');
        
        if (scoreCell) scoreCell.textContent = scoreData.score.toFixed(1);
        if (niveauCell) {
          niveauCell.innerHTML = `<span style="padding:4px 12px;background:${scoreData.niveau.couleur};border-radius:20px;font-size:0.75rem;color:white;">${scoreData.niveau.label}</span>`;
        }
      }
    });
  },

  renderGazette(gazette, containerId = 'gazette-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (gazette.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:#a0a0a0;">📭 Aucun cheval GAZETTE</div>';
      return;
    }

    let html = `
      <div style="background:#16213e;padding:20px;border-radius:8px;border:1px solid #2a2a4a;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
          <h3 style="color:#e94560;">📰 GAZETTE SINAYOKO</h3>
          <span style="background:#0f3460;padding:4px 12px;border-radius:20px;font-size:0.85rem;">${gazette.length} pronostic${gazette.length > 1 ? 's' : ''}</span>
        </div>
    `;

    gazette.forEach((g, i) => {
      html += `
        <div style="display:flex;align-items:center;gap:15px;padding:15px;background:#1a1a2e;border-radius:8px;margin-bottom:10px;border-left:4px solid ${g.niveau.couleur};">
          <div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:${i < 3 ? ['gold','silver','#cd7f32'][i] : '#e94560'};color:${i < 3 ? '#1a1a2e' : 'white'};border-radius:50%;font-weight:bold;">${i + 1}</div>
          <div style="flex:1;">
            <div style="font-size:1.1rem;font-weight:600;">${g.cheval}</div>
            <div style="font-size:0.85rem;color:#a0a0a0;">Score: <strong>${g.score}</strong> | Cote: ${g.cote} | Confiance: <strong>${g.niveau.confiance}%</strong></div>
          </div>
          <div style="padding:6px 16px;background:${g.niveau.couleur};border-radius:20px;color:white;font-weight:600;font-size:0.8rem;">${g.niveau.label}</div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  renderConsensus(consensus, containerId = 'consensus-container') {
    const container = document.getElementById(containerId);
    if (!container || consensus.length === 0) return;

    let html = `
      <div style="background:#16213e;padding:20px;border-radius:8px;border:1px solid #2a2a4a;">
        <h3 style="color:#2196F3;margin-bottom:15px;">🤝 CONSENSUS</h3>
    `;

    consensus.forEach(c => {
      html += `
        <div style="display:flex;justify-content:space-between;padding:10px;background:#1a1a2e;border-radius:4px;margin-bottom:8px;border-left:3px solid ${c.niveau.couleur};">
          <span style="font-weight:600;">${c.cheval}</span>
          <span style="color:#a0a0a0;">${c.score} | ${c.niveau.confiance}%</span>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  renderSpeciaux(speciaux, containerId = 'speciaux-container') {
    const container = document.getElementById(containerId);
    if (!container || speciaux.length === 0) return;

    let html = `
      <div style="background:#16213e;padding:20px;border-radius:8px;border:1px solid #2a2a4a;">
        <h3 style="color:#FF9800;margin-bottom:15px;">⭐ SPÉCIAUX</h3>
    `;

    speciaux.forEach(s => {
      html += `
        <div style="display:flex;justify-content:space-between;padding:10px;background:#1a1a2e;border-radius:4px;margin-bottom:8px;border-left:3px solid ${s.niveau.couleur};">
          <span style="font-weight:600;">${s.cheval}</span>
          <span style="color:#a0a0a0;">${s.score}</span>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  renderCombinaisons(combos, containerId = 'combos-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (combos.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:#a0a0a0;">🎯 Aucune combinaison</div>';
      return;
    }

    let html = `
      <div style="background:#16213e;padding:20px;border-radius:8px;border:1px solid #2a2a4a;">
        <h3 style="color:#e94560;margin-bottom:15px;">🎯 COMBINAISONS OPTIMALES</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:15px;">
    `;

    combos.forEach((c, i) => {
      const color = c.confiance >= 80 ? '#4CAF50' : c.confiance >= 70 ? '#FFC107' : '#FF9800';
      html += `
        <div style="background:#1a1a2e;padding:15px;border-radius:8px;border:1px solid ${c.confiance >= 80 ? '#4CAF50' : '#2a2a4a'};">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
            <span style="background:#0f3460;padding:2px 10px;border-radius:4px;font-size:0.8rem;font-weight:600;">${c.type}</span>
            <span style="color:#a0a0a0;font-size:0.9rem;">#${i + 1}</span>
          </div>
          <div style="font-size:1.1rem;font-weight:600;margin-bottom:10px;">${c.chevaux.join(' <span style="color:#e94560;">+</span> ')}</div>
          <div style="display:flex;gap:20px;margin-bottom:10px;">
            <div style="text-align:center;"><div style="font-size:0.75rem;color:#a0a0a0;">Score</div><div style="font-size:1.2rem;font-weight:bold;color:#e94560;">${c.score.toFixed(1)}</div></div>
            <div style="text-align:center;"><div style="font-size:0.75rem;color:#a0a0a0;">Confiance</div><div style="font-size:1.2rem;font-weight:bold;color:#e94560;">${c.confiance}%</div></div>
          </div>
          <div style="height:6px;background:#0f3460;border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${c.confiance}%;background:${color};border-radius:3px;transition:width 0.5s;"></div>
          </div>
          ${c.miseRecommandee ? `<div style="margin-top:8px;font-size:0.85rem;color:#a0a0a0;">💰 ${c.miseRecommandee}</div>` : ''}
        </div>
      `;
    });

    html += '</div></div>';
    container.innerHTML = html;
  },

  renderStats(stats, containerId = 'stats-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:15px;margin-bottom:20px;">
        <div style="background:#1a1a2e;padding:20px;border-radius:8px;text-align:center;border:1px solid #2a2a4a;">
          <div style="font-size:2rem;font-weight:bold;color:#e94560;">${stats.totalCourses || 0}</div>
          <div style="font-size:0.85rem;color:#a0a0a0;margin-top:5px;">Courses analysées</div>
        </div>
        <div style="background:#1a1a2e;padding:20px;border-radius:8px;text-align:center;border:1px solid #2a2a4a;">
          <div style="font-size:2rem;font-weight:bold;color:#e94560;">${Object.keys(stats.hippodromes || {}).length}</div>
          <div style="font-size:0.85rem;color:#a0a0a0;margin-top:5px;">Hippodromes</div>
        </div>
        <div style="background:#1a1a2e;padding:20px;border-radius:8px;text-align:center;border:1px solid #2a2a4a;">
          <div style="font-size:2rem;font-weight:bold;color:#e94560;">${stats.derniereCourse ? new Date(stats.derniereCourse).toLocaleDateString() : '-'}</div>
          <div style="font-size:0.85rem;color:#a0a0a0;margin-top:5px;">Dernière course</div>
        </div>
      </div>
    `;
  },

  renderHistorique(courses, containerId = 'historique-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (courses.length === 0) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:#a0a0a0;">Aucune course dans l\'historique</div>';
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:10px;">';
    
    courses.forEach(c => {
      html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:15px;background:#1a1a2e;border-radius:8px;border:1px solid #2a2a4a;" data-id="${c.id}">
          <div>
            <div style="font-weight:600;">${c.hippodrome || 'Course'}</div>
            <div style="font-size:0.85rem;color:#a0a0a0;">${new Date(c.date).toLocaleDateString()} | ${c.chevaux?.length || 0} chevaux</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="window.dispatchEvent(new CustomEvent('pmu:charger-course', {detail: {id: ${c.id}}}))" style="width:36px;height:36px;border-radius:50%;background:#0f3460;color:white;border:none;cursor:pointer;">📂</button>
            <button onclick="if(confirm('Supprimer ?')) window.dispatchEvent(new CustomEvent('pmu:supprimer-course', {detail: {id: ${c.id}}}))" style="width:36px;height:36px;border-radius:50%;background:#f44336;color:white;border:none;cursor:pointer;">🗑️</button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }
};