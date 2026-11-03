import { pick } from './i18n/lang.js';

// Clic sur l'icône e-mail : l'adresse est copiée dans le presse-papiers, la pastille passe au vert
// avec une coche et une bulle « Adresse copiée » s'affiche. Si la copie échoue, le lien mailto s'ouvre.
const CHECK =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function setupMailCopy() {
  const link = document.querySelector('.icon-mail');
  if (!link) return;
  const email = link.getAttribute('href').replace('mailto:', '');
  const icon = link.innerHTML;
  const bubble = document.createElement('span');
  bubble.className = 'copy-bubble';
  bubble.setAttribute('role', 'status');
  bubble.innerHTML = `${pick('Adresse copiée', 'Address copied')} ✓<small>${email}</small>`;
  link.parentElement.append(bubble);
  let timer;

  link.addEventListener('click', async (event) => {
    if (!navigator.clipboard) return;
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      window.location.href = link.href;
      return;
    }
    clearTimeout(timer);
    link.classList.remove('copied');
    void link.offsetWidth; // relance l'animation si on reclique
    link.classList.add('copied');
    link.innerHTML = CHECK;
    bubble.classList.add('show');
    timer = setTimeout(() => {
      link.classList.remove('copied');
      link.innerHTML = icon;
      bubble.classList.remove('show');
    }, 2200);
  });
}
