/* Three.js mechanical layer only. CV content stays semantic HTML. */
(async () => {
  const stage = document.querySelector('.scroll-stage');
  const canvas = document.querySelector('.roller-webgl');
  const experience = document.querySelector('.scroll-experience');
  const readingWindow = document.querySelector('.reading-window');
  const topReference = document.querySelector('.roller--top');
  const bottomReference = document.querySelector('.roller--bottom');
  if (!stage || !canvas || !experience || !readingWindow) return;

  const fallback = (reason) => {
    document.body.classList.remove('webgl-ready');
    document.body.classList.add('webgl-fallback');
    canvas.setAttribute('data-fallback-reason', reason || 'WebGL unavailable');
  };

  let THREE;
  try {
    THREE = await import('https://unpkg.com/three@0.161.0/build/three.module.js');
  } catch (error) {
    fallback('Three.js could not be loaded');
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (error) {
    fallback('WebGL is unavailable');
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 1, 3000);
  camera.position.set(0, 0, 1000);
  camera.lookAt(0, 0, 0);

  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const fill = new THREE.HemisphereLight(0xf1d8a7, 0x1c2a21, 1.65);
  scene.add(fill);
  const key = new THREE.DirectionalLight(0xffd89b, 2.3);
  key.position.set(-360, 480, 720);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8da784, .35);
  rim.position.set(440, 120, -260);
  scene.add(rim);

  const textureCanvas = (width, height, draw) => {
    const image = document.createElement('canvas');
    image.width = width; image.height = height;
    draw(image.getContext('2d'), width, height);
    return image;
  };

  const makeWoodTexture = () => new THREE.CanvasTexture(textureCanvas(768, 160, (ctx, w, h) => {
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#815331'); base.addColorStop(.42, '#5b351f'); base.addColorStop(1, '#3e2214');
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .35;
    for (let i = 0; i < 34; i += 1) {
      ctx.beginPath(); ctx.strokeStyle = i % 3 ? '#c18a50' : '#211109'; ctx.lineWidth = i % 5 === 0 ? 2.4 : .8;
      for (let x = -10; x <= w + 10; x += 14) {
        const y = (i * 19 + Math.sin(x / 41 + i) * 8 + h * .08) % h;
        if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y + Math.sin(x / 24 + i) * 2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = .72;
    for (const knot of [{ x: 132, y: 56, rx: 22, ry: 10 }, { x: 592, y: 105, rx: 28, ry: 13 }]) {
      ctx.save(); ctx.translate(knot.x, knot.y); ctx.rotate(-.15);
      ctx.strokeStyle = '#241109'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, knot.rx, knot.ry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#b17b44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(2, 1, knot.rx * .62, knot.ry * .5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }));

  const makeGreyTexture = (base, detail) => new THREE.CanvasTexture(textureCanvas(512, 128, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = .32;
    for (let i = 0; i < 30; i += 1) { ctx.strokeStyle = detail; ctx.lineWidth = i % 4 ? 1 : 2; ctx.beginPath(); ctx.moveTo(0, (i * 23) % h); ctx.lineTo(w, (i * 23 + 7) % h); ctx.stroke(); }
  }));

  const woodMap = makeWoodTexture();
  woodMap.wrapS = THREE.RepeatWrapping; woodMap.wrapT = THREE.ClampToEdgeWrapping; woodMap.colorSpace = THREE.SRGBColorSpace;
  const woodNormal = makeGreyTexture('#8080ff', '#9c9cff'); woodNormal.wrapS = THREE.RepeatWrapping;
  const woodRoughness = makeGreyTexture('#c9c9c9', '#9b9b9b'); woodRoughness.wrapS = THREE.RepeatWrapping;
  const paperMap = new THREE.CanvasTexture(textureCanvas(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e5c88f'; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = .2;
    for (let i = 0; i < 90; i += 1) { ctx.fillStyle = i % 2 ? '#fff0c6' : '#8f6038'; ctx.fillRect((i * 71) % w, (i * 31) % h, 2 + i % 4, 1); }
  }));
  paperMap.wrapS = THREE.RepeatWrapping; paperMap.wrapT = THREE.ClampToEdgeWrapping; paperMap.colorSpace = THREE.SRGBColorSpace;

  const woodMaterial = new THREE.MeshStandardMaterial({ map: woodMap, normalMap: woodNormal, roughnessMap: woodRoughness, roughness: .88, metalness: .02 });
  const endMaterial = new THREE.MeshStandardMaterial({ map: woodMap, normalMap: woodNormal, roughness: .92, metalness: .01, color: 0x9b6a3c });
  const axleMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2119, roughness: .7, metalness: .45 });
  const bearingMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3323, roughness: .82, metalness: .12 });
  const paperMaterial = new THREE.MeshStandardMaterial({ map: paperMap, roughness: .95, metalness: 0 });
  const paperEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0xb18556, roughness: .98 });
  const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0x9e6333, roughness: .74, metalness: .04 });
  const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xb98a4c, roughness: .65 });

  const makeEngravingMaterial = (label) => {
    const map = new THREE.CanvasTexture(textureCanvas(1024, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = 'rgba(26, 12, 5, .88)'; ctx.font = '600 27px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, w / 2, h / 2);
    }));
    map.wrapS = THREE.RepeatWrapping; map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map, color: 0x241309, transparent: true, alphaTest: .18, roughness: .96, metalness: 0 });
  };

  const materialsToDispose = [woodMaterial, endMaterial, axleMaterial, bearingMaterial, paperMaterial, paperEdgeMaterial, stripeMaterial, markerMaterial];
  const groups = [];
  let layout = null;
  let rendered = false;
  let hidden = document.hidden;
  const showMeasurements = new URLSearchParams(window.location.search).has('measure');
  let measurementOverlay = null;

  const disposeObject = (object) => {
    object.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material && !materialsToDispose.includes(node.material)) {
        if (node.material.map) node.material.map.dispose();
        node.material.dispose();
      }
    });
    scene.remove(object);
  };

  const buildRoller = (reference, isTop) => {
    const group = new THREE.Group();
    const cssScale = layout.worldPerCss;
    const { drumLengthCss, drumDiameterCss, contactMeshWidthCss, endCapDepthCss, visibleAxleLengthCss, axleDiameterCss } = layout.geometry;
    const length = drumLengthCss * cssScale;
    const radius = (drumDiameterCss / 2) * cssScale;
    const capRadius = radius * 1.14;
    const capDepth = endCapDepthCss * cssScale;
    const axleLength = visibleAxleLengthCss * cssScale;
    const axleRadius = (axleDiameterCss / 2) * cssScale;
    const contactWidth = contactMeshWidthCss * cssScale;
    const sign = isTop ? -1 : 1;

    group.userData = { radius, length, sign, drum: null, isTop, paperMeshes: [], paperBaseRadius: radius * 1.12 };
    const fixed = new THREE.Group(); group.add(fixed);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(axleRadius, axleRadius, length + capDepth * 2 + axleLength * 2, 24), axleMaterial);
    axle.rotation.z = Math.PI / 2; axle.castShadow = true; fixed.add(axle);
    for (const side of [-1, 1]) {
      const x = side * (length / 2 + capDepth + axleLength * .72);
      const support = new THREE.Mesh(new THREE.BoxGeometry(radius * .3, radius * 2.2, radius * 1.9), bearingMaterial);
      support.position.x = x; support.castShadow = true; support.receiveShadow = true; fixed.add(support);
      const bearing = new THREE.Mesh(new THREE.CylinderGeometry(capRadius * .72, capRadius * .72, radius * .3, 40), bearingMaterial);
      bearing.rotation.z = Math.PI / 2; bearing.position.x = side * (length / 2 + capDepth + radius * .22); bearing.castShadow = true; fixed.add(bearing);
    }

    const horizontalOrientation = new THREE.Group();
    horizontalOrientation.rotation.z = Math.PI / 2;
    group.add(horizontalOrientation);
    const drumGroup = new THREE.Group();
    horizontalOrientation.add(drumGroup);
    group.userData.drum = drumGroup;

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 64, 2, false), woodMaterial);
    drum.castShadow = true; drum.receiveShadow = true; drumGroup.add(drum);
    const paperRadius = group.userData.paperBaseRadius;
    // Full 360-degree sleeve: the wooden core is structural and remains
    // completely hidden across the hanging parchment width.
    const paperShell = new THREE.Mesh(new THREE.CylinderGeometry(paperRadius, paperRadius, contactWidth, 64, 2, true), paperMaterial);
    paperShell.castShadow = true; paperShell.receiveShadow = true; drumGroup.add(paperShell);
    group.userData.paperMeshes.push(paperShell);
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(capRadius, capRadius * .92, capDepth, 48), endMaterial);
      cap.position.y = side * (length / 2 + capDepth / 2); cap.castShadow = true; cap.receiveShadow = true; drumGroup.add(cap);
      const ridge = new THREE.Mesh(new THREE.TorusGeometry(capRadius * .78, radius * .055, 10, 48), endMaterial);
      ridge.rotation.x = Math.PI / 2; ridge.position.y = side * (length / 2 + capDepth + .01); ridge.castShadow = true; drumGroup.add(ridge);
      const paperEdge = new THREE.Mesh(new THREE.TorusGeometry(paperRadius, radius * .025, 8, 48), paperEdgeMaterial);
      paperEdge.rotation.x = Math.PI / 2; paperEdge.position.y = side * (contactWidth * .47); drumGroup.add(paperEdge);
      group.userData.paperMeshes.push(paperEdge);
      for (let layer = 1; layer <= 3; layer += 1) {
        const layerRing = new THREE.Mesh(new THREE.TorusGeometry(paperRadius - radius * (.035 * layer), radius * .009, 6, 48), paperEdgeMaterial);
        layerRing.rotation.x = Math.PI / 2; layerRing.position.y = side * (contactWidth * (.47 - layer * .012)); drumGroup.add(layerRing);
        group.userData.paperMeshes.push(layerRing);
      }
    }
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.13, radius * .035, 8, 64), stripeMaterial);
    stripe.rotation.x = Math.PI / 2; stripe.position.y = -length * .17; stripe.castShadow = true; drumGroup.add(stripe);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(radius * .075, 12, 8), markerMaterial);
    marker.position.set(radius * .68, length * .12, radius * .68); marker.castShadow = true; drumGroup.add(marker);
    const engraving = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.068, radius * 1.068, contactWidth * .78, 64, 1, true), makeEngravingMaterial(isTop ? 'PROFILE  ·  EXPERIENCE' : 'SKILLS  ·  PROJECTS  ·  CONTACT'));
    engraving.castShadow = true; drumGroup.add(engraving);

    const transition = new THREE.Mesh(new THREE.BoxGeometry(contactWidth, radius * .18, .12), paperMaterial);
    transition.position.y = isTop ? -radius * 1.02 : radius * 1.02; transition.castShadow = true; transition.receiveShadow = true; fixed.add(transition);
    const sheetShadow = new THREE.Mesh(new THREE.PlaneGeometry(contactWidth, radius * .12), new THREE.MeshBasicMaterial({ color: 0x3b2112, transparent: true, opacity: .18, depthWrite: false }));
    sheetShadow.position.set(0, isTop ? -radius * .98 : radius * .98, .1); fixed.add(sheetShadow);

    scene.add(group); groups.push(group); return group;
  };

  const updateCameraAndLayout = () => {
    const stageRect = stage.getBoundingClientRect();
    const height = Math.max(320, stageRect.height);
    const width = Math.max(320, stageRect.width);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const parchmentRect = readingWindow.getBoundingClientRect();
    const parchmentWidth = parchmentRect.width;
    const viewportWidth = window.innerWidth;
    const proportion = viewportWidth < 700 ? { length: 1.03, diameter: .1025, limits: [30, 46] } : viewportWidth < 1024 ? { length: 1.035, diameter: .084, limits: [42, 58] } : { length: 1.035, diameter: .08, limits: [46, 68] };
    const drumDiameterCss = Math.min(proportion.limits[1], Math.max(proportion.limits[0], parchmentWidth * proportion.diameter));
    const drumLengthCss = parchmentWidth * proportion.length;
    const drumOverhangCss = (drumLengthCss - parchmentWidth) / 2;
    const endCapDiameterCss = drumDiameterCss * 1.12;
    const endCapDepthCss = drumDiameterCss * .23;
    const axleDiameterCss = drumDiameterCss * .185;
    const visibleAxleLengthCss = drumDiameterCss * .22;
    const completeAssemblyWidthCss = drumLengthCss + (endCapDepthCss * 2) + (visibleAxleLengthCss * 2);
    const geometry = { parchmentWidth, parchmentLeft: parchmentRect.left - stageRect.left, parchmentRight: parchmentRect.right - stageRect.left, drumLengthCss, drumDiameterCss, drumOverhangCss, endCapDiameterCss, endCapDepthCss, axleDiameterCss, visibleAxleLengthCss, completeAssemblyWidthCss, contactMeshWidthCss: parchmentWidth, drumToDiameterRatio: drumLengthCss / drumDiameterCss, paperRadiusRatio: 1.12 };
    layout = { stageRect, width, height, worldPerCss: viewHeight / height, geometry };
    window.__scrollGeometry = geometry;
    window.__cvLayoutState = { ...window.__cvLayoutState, geometry };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    groups.splice(0).forEach(disposeObject);
    const top = buildRoller(topReference, true);
    const bottom = buildRoller(bottomReference, false);
    const topRect = topReference.getBoundingClientRect();
    const bottomRect = bottomReference.getBoundingClientRect();
    top.position.y = (stageRect.top + height / 2 - (topRect.top + topRect.height / 2)) * layout.worldPerCss;
    bottom.position.y = (stageRect.top + height / 2 - (bottomRect.top + bottomRect.height / 2)) * layout.worldPerCss;
    top.position.z = 2; bottom.position.z = 2;
    updateMeasurementOverlay();
    syncAngle(); requestRender();
  };

  const updateMeasurementOverlay = () => {
    if (!showMeasurements || !layout) return;
    if (!measurementOverlay) {
      measurementOverlay = document.createElement('div');
      measurementOverlay.className = 'roller-measurement';
      measurementOverlay.setAttribute('aria-hidden', 'true');
      stage.appendChild(measurementOverlay);
    }
    const g = layout.geometry;
    const left = g.parchmentLeft;
    const parchmentWidth = g.parchmentWidth;
    const drumLeft = left - g.drumOverhangCss;
    const drumRight = left + parchmentWidth + g.drumOverhangCss;
    measurementOverlay.innerHTML = `<i class="measure-line measure-line--paper-left" style="left:${left}px"></i><i class="measure-line measure-line--paper-right" style="left:${left + parchmentWidth}px"></i><i class="measure-line measure-line--drum-left" style="left:${drumLeft}px"></i><i class="measure-line measure-line--drum-right" style="left:${drumRight}px"></i><span class="measure-label" style="left:${left}px">paper ${Math.round(parchmentWidth)}px · drum ${Math.round(g.drumLengthCss)}px · Ø ${Math.round(g.drumDiameterCss)}px · overhang ${Math.round(g.drumOverhangCss)}px · assembly ${Math.round(g.completeAssemblyWidthCss)}px · ratio ${g.drumToDiameterRatio.toFixed(1)}:1</span>`;
  };

  const syncAngle = (detail = window.__cvLayoutState) => {
    if (!layout || !detail) return;
    const travelWorld = detail.travel * layout.worldPerCss;
    const progress = detail.progress ?? 0;
    groups.forEach((group) => {
      group.userData.drum.rotation.y = group.userData.sign * (travelWorld / group.userData.radius);
      const paperRadiusRatio = group.userData.isTop ? 1.16 - (progress * .08) : 1.08 + (progress * .08);
      const radialScale = (group.userData.radius * paperRadiusRatio) / group.userData.paperBaseRadius;
      group.userData.paperMeshes.forEach((mesh) => mesh.scale.set(radialScale, 1, radialScale));
    });
  };

  let renderFrame = 0;
  const render = () => { renderFrame = 0; if (hidden) return; renderer.render(scene, camera); rendered = true; };
  const requestRender = () => { if (!renderFrame && !hidden) renderFrame = requestAnimationFrame(render); };

  window.addEventListener('cv-transport', (event) => { syncAngle(event.detail); requestRender(); });
  window.addEventListener('resize', () => requestAnimationFrame(updateCameraAndLayout));
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (!hidden) requestRender(); });
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); fallback('WebGL context lost'); });
  canvas.addEventListener('webglcontextrestored', () => { document.body.classList.remove('webgl-fallback'); document.body.classList.add('webgl-ready'); updateCameraAndLayout(); });

  document.body.classList.remove('webgl-fallback');
  document.body.classList.add('webgl-ready');
  updateCameraAndLayout();
  if (!rendered) requestRender();
})();
