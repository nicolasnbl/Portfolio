import { pick } from '../i18n/lang.js';

// « Voir Cibel → » : le site Cibel est en maintenance, le lien ouvre un petit pop-up qui le dit.
export function setupMaintenance() {
  const links = document.querySelectorAll('a[data-maintenance]');
  if (!links.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'maintenance-dialog';
  dialog.innerHTML = `
    <p class="maintenance-title">Cibel</p>
    <p>${pick('Le site est actuellement en maintenance.', 'The website is currently under maintenance.')}</p>
    <form method="dialog"><button type="submit" class="maintenance-close">${pick('Fermer', 'Close')}</button></form>`;
  document.body.append(dialog);
  // Un clic en dehors de la fenêtre la ferme aussi.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  for (const link of links) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      dialog.showModal();
    });
  }
}
