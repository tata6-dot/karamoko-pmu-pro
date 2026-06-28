/* ============================================
   KARAMOKO PMU PRO - Sauvegarde automatique
   ============================================ */

const BackupManager = (function() {
  'use strict';

  const CONFIG = {
    autoSaveInterval: 30000,
    maxBackups: 10,
    backupPrefix: 'karamoko_backup_',
    settingsKey: 'karamoko_settings'
  };

  let autoSaveTimer = null;

  function getTimestamp() { return new Date().toISOString(); }
  
  function generateBackupId() { return CONFIG.backupPrefix + Date.now(); }

  function getAllBackups() {
    const backups = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CONFIG.backupPrefix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          backups.push({ id: key, ...data });
        } catch (e) { console.warn('Backup corrompu:', key); }
      }
    }
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  function cleanOldBackups() {
    const backups = getAllBackups();
    if (backups.length > CONFIG.maxBackups) {
      backups.slice(CONFIG.maxBackups).forEach(b => localStorage.removeItem(b.id));
    }
  }

  // ---------- API PUBLIQUE ----------
  return {
    create(data, label = 'Sauvegarde') {
      const backup = {
        id: generateBackupId(),
        label,
        timestamp: Date.now(),
        dateISO: getTimestamp(),
        version: '1.0',
        data
      };
      localStorage.setItem(backup.id, JSON.stringify(backup));
      cleanOldBackups();
      console.log(`[Backup] Créée: "${label}"`);
      return backup.id;
    },

    restore(backupId) {
      const raw = localStorage.getItem(backupId);
      if (!raw) { console.error('[Backup] Introuvable:', backupId); return null; }
      try {
        const backup = JSON.parse(raw);
        console.log(`[Backup] Restaurée: "${backup.label}"`);
        return backup.data;
      } catch (e) { console.error('[Backup] Erreur:', e); return null; }
    },

    delete(backupId) {
      localStorage.removeItem(backupId);
      console.log('[Backup] Supprimée:', backupId);
    },

    list() {
      return getAllBackups().map(b => ({
        id: b.id,
        label: b.label,
        date: new Date(b.timestamp).toLocaleString(),
        timestamp: b.timestamp
      }));
    },

    startAutoSave(dataProvider) {
      if (autoSaveTimer) return;
      if (typeof dataProvider !== 'function') return;
      autoSaveTimer = setInterval(() => {
        const data = dataProvider();
        if (data) this.create(data, 'Auto-save');
      }, CONFIG.autoSaveInterval);
      console.log('[Backup] Auto-save activée');
    },

    stopAutoSave() {
      if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
    },

    exportAll() {
      const backups = getAllBackups();
      const blob = new Blob([JSON.stringify(backups, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `karamoko_backups_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    saveSettings(settings) {
      localStorage.setItem(CONFIG.settingsKey, JSON.stringify({ ...settings, savedAt: Date.now() }));
    },

    loadSettings() {
      const raw = localStorage.getItem(CONFIG.settingsKey);
      return raw ? JSON.parse(raw) : null;
    }
  };
})();