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
let stableProgress = 0;
let resizeRestoreFrame = 0;
let resizeStateLocked = false;
let resizeReleaseFrame = 0;
let lastViewportWidth = window.innerWidth;
let lastViewportHeight = window.innerHeight;
// CSS 3D rotation is applied only to the internal drum around its horizontal
// left-to-right axle. The page transports the parchment longitudinally as before.
const rotationMap = { top: -1, bottom: 1 };

function effectiveRadius(roller) {
  const drum = roller.querySelector('.roller-core');
  // offsetHeight is the untransformed radial measurement of the horizontal
  // drum, so it stays stable as the cylinder turns in perspective.
  return Math.max(18, drum.offsetHeight / 2);
}

function setTransport(progress) {
  if (Math.abs(progress - lastProgress) < 0.001) return;
  lastProgress = progress;
  if (!resizeStateLocked && !document.body.classList.contains('is-resizing')) stableProgress = progress;
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
  // Keep the two visible scrolls in the same visual phase. Transport and
  // progress still use each roller's measured radius above; only the rendered
  // presentation is shared so the top and bottom designs stay identical.
  const sharedAngle = Math.abs(topAngle);
  topRollerCylinder.style.setProperty('--angle', `${sharedAngle}deg`);
  bottomRollerCylinder.style.setProperty('--angle', `${sharedAngle}deg`);
  topRollerCylinder.style.transform = `rotateX(${sharedAngle}deg)`;
  bottomRollerCylinder.style.transform = `rotateX(${sharedAngle}deg)`;
  document.body.classList.toggle('has-scrolled', progress > 0.012);

  const activeIndex = Math.min(sections.length - 1, Math.floor(progress * sections.length + 0.18));
  const active = sections[activeIndex]?.dataset.section || 'profile';
  navItems.forEach((item) => item.classList.toggle('is-active', item.dataset.target === active));
  statusText.textContent = sectionNames[active];
}

function update() {
  document.documentElement.style.setProperty('--usable-vh', `${Math.max(320, window.innerHeight)}px`);
  const maxScroll = documentScrollRange();
  const measuredProgress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
  const viewportChanged = window.innerWidth !== lastViewportWidth || window.innerHeight !== lastViewportHeight;
  const progress = resizeStateLocked || document.body.classList.contains('is-resizing') || viewportChanged ? stableProgress : measuredProgress;
  lastViewportWidth = window.innerWidth;
  lastViewportHeight = window.innerHeight;
  setTransport(progress);
  frame = 0;
}

function requestUpdate() {
  if (!frame) frame = requestAnimationFrame(update);
}

function documentScrollRange() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

window.addEventListener('scroll', requestUpdate, { passive: true });
// roller-scene.js owns the single revision-safe resize pipeline. Once it has
// committed the new reading window, restore the same normalized document
// progress against the new scroll range without accumulating offsets.
window.addEventListener('cv-layout-resized', (event) => {
  const preservedProgress = Math.min(1, Math.max(0, Number(event.detail?.progress) || 0));
  const revision = Number(event.detail?.revision) || 0;
  if (revision < (window.__cvResizeRestoreRevision || 0)) return;
  window.__cvResizeRestoreRevision = revision;
  stableProgress = preservedProgress;
  resizeStateLocked = true;
  cancelAnimationFrame(resizeReleaseFrame);
  lastProgress = -1;
  cancelAnimationFrame(resizeRestoreFrame);
  resizeRestoreFrame = requestAnimationFrame(() => requestAnimationFrame(() => {
    if (revision !== window.__cvResizeRestoreRevision) return;
    const maxScroll = documentScrollRange();
    // The document normally uses smooth scrolling for navigation. A resize
    // restore is a state correction, so it must be atomic or the animation
    // will be interrupted by the next resize and accumulate drift.
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, maxScroll * preservedProgress);
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
    lastProgress = -1;
    setTransport(preservedProgress);
    resizeRestoreFrame = 0;
  }));
});

window.addEventListener('cv-layout-stable', (event) => {
  const revision = Number(event.detail?.revision) || 0;
  if (revision !== (window.__cvResizeRestoreRevision || 0)) return;
  cancelAnimationFrame(resizeReleaseFrame);
  resizeReleaseFrame = requestAnimationFrame(() => {
    resizeReleaseFrame = requestAnimationFrame(() => {
      if (revision === (window.__cvResizeRestoreRevision || 0)) {
        resizeStateLocked = false;
        resizeReleaseFrame = 0;
      }
    });
  });
});

navItems.forEach((item) => {
  item.addEventListener('click', (event) => {
    event.preventDefault();
    const targetIndex = sections.findIndex((section) => section.dataset.section === item.dataset.target);
    if (targetIndex < 0) return;
    const maxScroll = documentScrollRange();
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
