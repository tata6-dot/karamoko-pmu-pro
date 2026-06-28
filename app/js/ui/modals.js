/**
 * MODALS
 */

const PMUModals = {
  info(titre, message) {
    this.afficher({
      titre,
      contenu: `<p>${message}</p>`,
      boutons: [{ label: 'OK', action: () => this.fermer(), classe: 'btn-primary' }]
    });
  },

  confirm(titre, message, onConfirm) {
    this.afficher({
      titre,
      contenu: `<p>${message}</p>`,
      boutons: [
        { label: 'Annuler', action: () => this.fermer(), classe: 'btn-secondary' },
        { label: 'Confirmer', action: () => { onConfirm(); this.fermer(); }, classe: 'btn-danger' }
      ]
    });
  },

  chargement(message = 'Chargement...') {
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `
      <div style="background:#16213e;padding:40px;border-radius:12px;text-align:center;border:1px solid #2a2a4a;">
        <div style="width:50px;height:50px;border:3px solid #2a2a4a;border-top-color:#e94560;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
        <p>${message}</p>
      </div>
    `;
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000;';
    document.body.appendChild(overlay);
  },

  fermer() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
  },

  afficher(config) {
    this.fermer();
    
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000;';
    overlay.innerHTML = `
      <div style="background:#16213e;padding:30px;border-radius:12px;max-width:500px;width:90%;border:1px solid #2a2a4a;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="color:#e94560;">${config.titre}</h3>
          <button onclick="PMUModals.fermer()" style="background:none;border:none;color:#a0a0a0;font-size:1.5rem;cursor:pointer;">×</button>
        </div>
        <div style="margin-bottom:20px;">${config.contenu}</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          ${config.boutons.map(b => `
            <button onclick="${b.action.toString().includes('PMUModals.fermer') ? 'PMUModals.fermer()' : 'this.onclick()'}" style="padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-size:1rem;${b.classe === 'btn-primary' ? 'background:#e94560;color:white;' : b.classe === 'btn-danger' ? 'background:#f44336;color:white;' : 'background:#0f3460;color:white;'}">${b.label}</button>
          `).join('')}
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }
};