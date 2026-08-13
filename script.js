document.body.classList.add('js-enabled');

const experience = document.querySelector('.scroll-experience');
const stage = document.querySelector('.scroll-stage');
const track = document.querySelector('.parchment-track');
const topRoller = document.querySelector('.roller--top');
const bottomRoller = document.querySelector('.roller--bottom');
const topRollerCylinder = topRoller.querySelector('.roller-cylinder');
const bottomRollerCylinder = bottomRoller.querySelector('.roller-cylinder');
const statusText = document.querySelector('.status-text');
const navItems = [...document.querySelectorAll('.section-nav__item')];
const sections = [...document.querySelectorAll('.paper-section')];

const sectionNames = {
  opening: 'resting at profile', profile: 'reading profile', experience: 'reading experience',
  education: 'reading education', skills: 'reading skills',
  projects: 'reading projects', strengths: 'reading strengths', contact: 'at contact'
};

let frame = 0;
let lastProgress = -1;
// Longitudinal feed prototype: CSS 3D rotation is applied only to the
// internal cylinder around its left-to-right horizontal axis.
const rotationMap = { top: -1, bottom: 1 };

function effectiveRadius(roller) {
  const drum = roller.querySelector('.roller-core');
  // offsetHeight is the untransformed layout height, so the radius does not
  // change as the cylinder turns and foreshortens in perspective.
  return Math.max(18, drum.offsetHeight / 2);
}

function setTransport(progress) {
  if (Math.abs(progress - lastProgress) < 0.001) return;
  lastProgress = progress;
  const maxTravel = Math.max(0, track.scrollHeight - stage.querySelector('.reading-window').clientHeight);
  track.style.transform = `translate3d(0, ${-maxTravel * progress}px, 0)`;

  // Rotation is derived from parchment travel / measured effective radius.
  // This makes the angle reversible: returning to the same progress restores
  // the exact same wheel angle, including after a refreshed deep link.
  const travel = maxTravel * progress;
  window.__cvLayoutState = { ...window.__cvLayoutState, progress, travel, maxTravel, viewportHeight: window.innerHeight };
  window.dispatchEvent(new CustomEvent('cv-transport', { detail: window.__cvLayoutState }));
  const topAngle = rotationMap.top * (travel / effectiveRadius(topRoller)) * (180 / Math.PI);
  const bottomAngle = rotationMap.bottom * (travel / effectiveRadius(bottomRoller)) * (180 / Math.PI);
  topRollerCylinder.style.setProperty('--angle', `${topAngle}deg`);
  bottomRollerCylinder.style.setProperty('--angle', `${bottomAngle}deg`);
  topRollerCylinder.style.transform = `rotateX(${topAngle}deg)`;
  bottomRollerCylinder.style.transform = `rotateX(${bottomAngle}deg)`;
  document.body.classList.toggle('has-scrolled', progress > 0.012);

  const activeIndex = Math.min(sections.length - 1, Math.floor(progress * sections.length + 0.18));
  const active = sections[activeIndex]?.dataset.section || 'profile';
  navItems.forEach((item) => item.classList.toggle('is-active', item.dataset.target === active));
  statusText.textContent = sectionNames[active];
}

function update() {
  document.documentElement.style.setProperty('--usable-vh', `${Math.max(320, window.innerHeight)}px`);
  const maxScroll = experience.offsetHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
  setTransport(progress);
  frame = 0;
}

function requestUpdate() {
  if (!frame) frame = requestAnimationFrame(update);
}

window.addEventListener('scroll', requestUpdate, { passive: true });
window.addEventListener('resize', () => {
  const preservedProgress = lastProgress >= 0 ? lastProgress : null;
  requestAnimationFrame(() => {
    if (preservedProgress !== null) {
      const maxScroll = experience.offsetHeight - window.innerHeight;
      window.scrollTo(0, Math.max(0, maxScroll * preservedProgress));
    }
    // Force a render after geometry changes so both wheel centres and their
    // travel/radius angles are recalculated at the new responsive size.
    lastProgress = -1;
    requestUpdate();
  });
});

navItems.forEach((item) => {
  item.addEventListener('click', (event) => {
    event.preventDefault();
    const targetIndex = sections.findIndex((section) => section.dataset.section === item.dataset.target);
    if (targetIndex < 0) return;
    const maxScroll = experience.offsetHeight - window.innerHeight;
    const progress = targetIndex / (sections.length - 1);
    window.scrollTo({ top: maxScroll * progress, behavior: 'smooth' });
  });
});

const projectDialog = document.querySelector('#project-dialog');
const projectDialogTitle = document.querySelector('#project-dialog-title');
const projectDialogCategory = document.querySelector('#project-dialog-category');
const projectDialogBody = document.querySelector('#project-dialog-body');
const dialogClose = document.querySelector('.dialog-close');
const projectRecords = {
  webcv: {
    title: 'Personal WebCV', category: 'Interactive document · Active',
    body: '<p>A professional document designed as a continuous parchment scroll. The project explores how a familiar CV can become more memorable without hiding the information recruiters need.</p><p><strong>Contribution:</strong> visual direction, semantic structure, responsive transport, and the interaction system.</p><p><strong>Record:</strong> HTML · CSS · JavaScript</p>'
  },
  dashboard: {
    title: 'Quiet dashboard', category: 'Interface study · Prototype',
    body: '<p>A study in reducing visual noise around dense information. Hierarchy, spacing and clear states do the work instead of decorative effects.</p><p><strong>Contribution:</strong> information structure, interaction patterns, and accessibility considerations.</p><p><strong>Record:</strong> UI systems · data presentation · responsive interface</p>'
  },
  experiments: {
    title: 'Small useful things', category: 'Experiments · Ongoing',
    body: '<p>A collection of small web experiments exploring motion, writing and the satisfying edge between analogue materials and digital tools.</p><p><strong>Contribution:</strong> concept, prototyping, implementation, and documentation.</p><p><strong>Record:</strong> web platform · motion · creative direction</p>'
  }
};
let dialogTrigger = null;

function closeProjectDialog() {
  if (!projectDialog?.open) return;
  projectDialog.close();
  dialogTrigger?.focus();
}

document.querySelectorAll('.project-open').forEach((button) => {
  button.addEventListener('click', () => {
    const record = projectRecords[button.dataset.project];
    if (!record || !projectDialog) return;
    dialogTrigger = button;
    projectDialogTitle.textContent = record.title;
    projectDialogCategory.textContent = record.category;
    projectDialogBody.innerHTML = record.body;
    projectDialog.showModal();
    dialogClose.focus();
  });
});

dialogClose?.addEventListener('click', closeProjectDialog);
projectDialog?.addEventListener('click', (event) => {
  if (event.target === projectDialog) closeProjectDialog();
});
projectDialog?.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeProjectDialog();
});

requestUpdate();
requestAnimationFrame(() => document.body.classList.add('is-ready'));
