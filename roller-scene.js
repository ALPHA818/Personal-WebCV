/* Three.js mechanical layer only. CV content stays semantic HTML. */
(async () => {
  const stage = document.querySelector('.scroll-stage');
  const canvas = document.querySelector('.roller-webgl');
  const experience = document.querySelector('.scroll-experience');
  const readingWindow = document.querySelector('.reading-window');
  const topReference = document.querySelector('.roller--top');
  const bottomReference = document.querySelector('.roller--bottom');
  if (!stage || !canvas || !experience || !readingWindow) return;

  const setRendererPath = (path) => { document.body.dataset.rollerRenderer = path; };

  const fallback = (reason) => {
    document.body.classList.remove('webgl-ready');
    document.body.classList.add('webgl-fallback');
    canvas.setAttribute('data-fallback-reason', reason || 'WebGL unavailable');
    setRendererPath('fallback');
  };

  if (new URLSearchParams(window.location.search).has('fallback')) {
    fallback('forced diagnostic fallback');
    return;
  }

  let THREE;
  try {
    THREE = await import('https://unpkg.com/three@0.161.0/build/three.module.js');
  } catch (error) {
    fallback('Three.js could not be loaded');
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  } catch (error) {
    fallback('WebGL is unavailable');
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 1, 3000);
  camera.position.set(0, 0, 1000);
  camera.lookAt(0, 0, 0);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;

  const fill = new THREE.HemisphereLight(0xe7d6b2, 0x21130a, .24);
  scene.add(fill);
  const key = new THREE.DirectionalLight(0xffd39a, 1.42);
  key.position.set(-420, 560, 430);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -760;
  key.shadow.camera.right = 760;
  key.shadow.camera.top = 520;
  key.shadow.camera.bottom = -520;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 2200;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.018;
  scene.add(key);
  const oppositeFill = new THREE.DirectionalLight(0xd8e0d2, .3);
  oppositeFill.position.set(380, 180, 300);
  scene.add(oppositeFill);
  const rim = new THREE.DirectionalLight(0x8da784, .28);
  rim.position.set(440, 160, -380);
  scene.add(rim);
  key.target.position.set(0, 0, 0);
  scene.add(key.target);

  const textureCanvas = (width, height, draw) => {
    const image = document.createElement('canvas');
    image.width = width; image.height = height;
    draw(image.getContext('2d'), width, height);
    return image;
  };

  const makeWoodTexture = () => new THREE.CanvasTexture(textureCanvas(768, 160, (ctx, w, h) => {
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#6e3b1d'); base.addColorStop(.3, '#4b2411'); base.addColorStop(.62, '#754322'); base.addColorStop(1, '#241006');
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .35;
    for (let i = 0; i < 34; i += 1) {
      ctx.beginPath(); ctx.strokeStyle = i % 3 ? '#a86d32' : '#160803'; ctx.lineWidth = i % 5 === 0 ? 2.8 : .9;
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
      ctx.strokeStyle = '#9a5c27'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(2, 1, knot.rx * .62, knot.ry * .5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }));

  const makeGreyTexture = (base, detail) => new THREE.CanvasTexture(textureCanvas(512, 128, (ctx, w, h) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = .32;
    for (let i = 0; i < 30; i += 1) {
      const x = (i * 67) % w; const y = (i * 31) % h;
      ctx.strokeStyle = detail; ctx.lineWidth = i % 4 ? 1 : 2; ctx.beginPath();
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 12 + (i % 9), y - 5 + (i % 11), x + 24 + (i % 17), y + 3 - (i % 7)); ctx.stroke();
    }
  }));

  const woodMap = makeWoodTexture();
  woodMap.wrapS = THREE.RepeatWrapping; woodMap.wrapT = THREE.ClampToEdgeWrapping; woodMap.colorSpace = THREE.SRGBColorSpace;
  const woodNormal = makeGreyTexture('#8080ff', '#9c9cff'); woodNormal.wrapS = THREE.RepeatWrapping;
  const woodRoughness = makeGreyTexture('#c9c9c9', '#9b9b9b'); woodRoughness.wrapS = THREE.RepeatWrapping;
  const paperMap = new THREE.CanvasTexture(textureCanvas(768, 192, (ctx, w, h) => {
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#b9955d'); base.addColorStop(.12, '#d7ba7b'); base.addColorStop(.3, '#f0dca7'); base.addColorStop(.52, '#dfc58c'); base.addColorStop(.8, '#c9a86b'); base.addColorStop(1, '#825b34');
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .3;
    for (let i = 0; i < 260; i += 1) {
      ctx.strokeStyle = i % 3 ? '#f7e2ad' : '#9d7a47'; ctx.lineWidth = i % 9 === 0 ? 1.2 : .5;
      const x = (i * 83) % w; const y = (i * 47) % h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6 + (i % 18), y - 4 + (i % 9), x + 17 + (i % 37), y + ((i % 7) - 3)); ctx.stroke();
    }
    ctx.globalAlpha = .1;
    for (let i = 0; i < 18; i += 1) {
      ctx.fillStyle = i % 2 ? '#9d7a47' : '#ead29a'; ctx.beginPath(); ctx.ellipse((i * 113) % w, (i * 59) % h, 12 + i % 17, 4 + i % 7, i * .3, 0, Math.PI * 2); ctx.fill();
    }
  }));
  paperMap.wrapS = THREE.RepeatWrapping; paperMap.wrapT = THREE.ClampToEdgeWrapping; paperMap.colorSpace = THREE.SRGBColorSpace;

  const woodMaterial = new THREE.MeshStandardMaterial({ map: woodMap, normalMap: woodNormal, roughnessMap: woodRoughness, roughness: .58, metalness: 0, bumpScale: .025, color: 0x633316 });
  const endMaterial = new THREE.MeshStandardMaterial({ map: woodMap, normalMap: woodNormal, roughnessMap: woodRoughness, roughness: .58, metalness: 0, bumpScale: .025, color: 0x75401d });
  const axleMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2119, roughness: .58, metalness: 0 });
  const bearingMaterial = new THREE.MeshStandardMaterial({ color: 0x2b1409, roughness: .58, metalness: 0 });
  const paperNormal = makeGreyTexture('#8080ff', '#9494ff'); paperNormal.wrapS = THREE.RepeatWrapping;
  const paperRoughness = makeGreyTexture('#d6d6d6', '#a7a7a7'); paperRoughness.wrapS = THREE.RepeatWrapping;
  const paperMaterial = new THREE.MeshStandardMaterial({ map: paperMap, normalMap: paperNormal, roughnessMap: paperRoughness, roughness: .82, metalness: 0, bumpScale: .012, color: 0xffe5ad });
  const paperEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x805027, roughness: .82, metalness: 0, bumpScale: .012 });
  const makeCollarTexture = () => new THREE.CanvasTexture(textureCanvas(768, 128, (ctx, w, h) => {
    ctx.fillStyle = '#3a1a0b'; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .82; ctx.strokeStyle = '#b97832'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(w, 14); ctx.moveTo(0, h - 14); ctx.lineTo(w, h - 14); ctx.stroke();
    ctx.globalAlpha = .9; ctx.fillStyle = '#b97832'; ctx.strokeStyle = '#180803'; ctx.lineWidth = 2;
    for (let x = 0; x < w + 48; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, h / 2 - 22); ctx.lineTo(x + 12, h / 2); ctx.lineTo(x, h / 2 + 22); ctx.lineTo(x - 12, h / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 24, h / 2, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 24, h / 2 - 13, 7, .2, Math.PI - .2); ctx.arc(x + 24, h / 2 + 13, 7, Math.PI + .2, Math.PI * 2 - .2); ctx.stroke();
    }
    ctx.globalAlpha = .42; ctx.strokeStyle = '#e0a75a'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x + 9, h - 26); ctx.stroke(); }
  }));
  const collarMap = makeCollarTexture(); collarMap.wrapS = THREE.RepeatWrapping; collarMap.colorSpace = THREE.SRGBColorSpace;
  const collarMaterial = new THREE.MeshStandardMaterial({ map: collarMap, normalMap: woodNormal, roughnessMap: woodRoughness, roughness: .58, metalness: 0, bumpScale: .025, color: 0xd18a3e });
  const materialsToDispose = [woodMaterial, endMaterial, axleMaterial, bearingMaterial, paperMaterial, paperEdgeMaterial, collarMaterial];
  const smoothGeometry = (geometry) => { geometry.computeVertexNormals(); return geometry; };
  const groups = [];
  let layout = null;
  let parchmentShadowReceiver = null;
  let rendered = false;
  const captureMode = new URLSearchParams(window.location.search).has('capture');
  let hidden = captureMode ? false : document.hidden;
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
    const { drumLengthCss, drumDiameterCss, paperShellWidthCss, finialLengthCss, visibleAxleLengthCss, axleDiameterCss } = layout.geometry;
    const length = drumLengthCss * cssScale;
    const radius = (drumDiameterCss / 2) * cssScale;
    const finialLength = finialLengthCss * cssScale;
    const axleLength = visibleAxleLengthCss * cssScale;
    const axleRadius = (axleDiameterCss / 2) * cssScale;
    const paperShellWidth = paperShellWidthCss * cssScale;
    const sign = isTop ? -1 : 1;

    group.name = 'roller-position-group';
    group.userData = {
      radius,
      length,
      sign,
      rotatingAssembly: null,
      stationaryAssembly: null,
      permanentWoodAssembly: null,
      leftEndAssembly: null,
      rightEndAssembly: null,
      accumulatedPaperAssembly: null,
      isTop,
      paperRadiusMeshes: [],
      paperBaseRadius: radius * 1.18,
      paperRadius: radius * 1.18,
      contactStripCount: 0
    };
    const fixed = new THREE.Group();
    fixed.name = 'stationary-assembly';
    group.userData.stationaryAssembly = fixed;
    group.add(fixed);
    const axle = new THREE.Mesh(smoothGeometry(new THREE.CylinderGeometry(axleRadius, axleRadius, length + finialLength * 2 + axleLength * 2, 32)), axleMaterial);
    axle.rotation.z = Math.PI / 2; axle.castShadow = true; fixed.add(axle);
    let firstSupport = null;
    for (const side of [-1, 1]) {
      const x = side * (length / 2 + finialLength + axleLength * .72);
      // Compact rounded bearings stay behind the handle; the old tall blocks
      // were part of the visible silhouette and made the roller look modern.
      const support = new THREE.Mesh(smoothGeometry(new THREE.CylinderGeometry(radius * .25, radius * .29, radius * .28, 32)), bearingMaterial);
      support.rotation.z = Math.PI / 2; support.position.x = x; support.castShadow = true; support.receiveShadow = true; fixed.add(support);
      if (!firstSupport) firstSupport = support;
      const bearing = new THREE.Mesh(smoothGeometry(new THREE.CylinderGeometry(radius * .34, radius * .34, radius * .22, 40)), bearingMaterial);
      bearing.rotation.z = Math.PI / 2; bearing.position.x = side * (length / 2 + finialLength + axleLength * .25); bearing.castShadow = true; fixed.add(bearing);
    }

    const horizontalOrientation = new THREE.Group();
    horizontalOrientation.name = 'roller-orientation';
    horizontalOrientation.rotation.z = Math.PI / 2;
    group.add(horizontalOrientation);
    const rotatingAssembly = new THREE.Group();
    rotatingAssembly.name = 'rotating-assembly';
    horizontalOrientation.add(rotatingAssembly);
    group.userData.rotatingAssembly = rotatingAssembly;

    const permanentWoodAssembly = new THREE.Group();
    permanentWoodAssembly.name = 'permanent-wood-assembly';
    const leftEndAssembly = new THREE.Group();
    leftEndAssembly.name = 'left-end-assembly';
    const rightEndAssembly = new THREE.Group();
    rightEndAssembly.name = 'right-end-assembly';
    const accumulatedPaperAssembly = new THREE.Group();
    accumulatedPaperAssembly.name = 'accumulated-paper-assembly';
    permanentWoodAssembly.add(leftEndAssembly, rightEndAssembly);
    rotatingAssembly.add(permanentWoodAssembly, accumulatedPaperAssembly);
    group.userData.permanentWoodAssembly = permanentWoodAssembly;
    group.userData.leftEndAssembly = leftEndAssembly;
    group.userData.rightEndAssembly = rightEndAssembly;
    group.userData.accumulatedPaperAssembly = accumulatedPaperAssembly;

    const drum = new THREE.Mesh(smoothGeometry(new THREE.CylinderGeometry(radius, radius, length, 64, 4, false)), woodMaterial);
    drum.castShadow = true; drum.receiveShadow = true; permanentWoodAssembly.add(drum);
    const paperRadius = group.userData.paperBaseRadius;
    // Full 360-degree sleeve: the wooden core is structural and remains
    // completely hidden across the hanging parchment width.
    const paperShell = new THREE.Mesh(smoothGeometry(new THREE.CylinderGeometry(paperRadius, paperRadius, paperShellWidth, 64, 4, false)), paperMaterial);
    paperShell.castShadow = true; paperShell.receiveShadow = true; accumulatedPaperAssembly.add(paperShell);
    group.userData.paperRadiusMeshes.push(paperShell);
    let firstEnd = null;
    for (const side of [-1, 1]) {
      // One continuous LatheGeometry forms the wrapped collar, shoulder,
      // neck, single bulb, subtle secondary swell and terminal knob.
      const paperDiameter = paperRadius * 2;
      const collarLength = paperDiameter * .42;
      const handleLength = paperDiameter * .55;
      const axialStart = -collarLength * .45;
      const axialEnd = collarLength * .55 + handleLength;
      const profile = [
        [paperRadius * 1.04, axialStart], [paperRadius * 1.17, axialStart + collarLength * .04],
        [paperRadius * 1.24, axialStart + collarLength * .13], [paperRadius * 1.24, axialStart + collarLength * .25],
        [paperRadius * 1.16, axialStart + collarLength * .31], [paperRadius * 1.08, axialStart + collarLength * .37],
        [paperRadius * .84, axialStart + collarLength * .43], [paperRadius * .54, axialStart + collarLength * .49],
        [paperRadius * .40, axialStart + collarLength * .55], [paperRadius * .46, axialStart + collarLength * .64],
        [paperRadius * .58, axialStart + collarLength * .73], [paperRadius * .64, axialStart + collarLength * .82],
        [paperRadius * .60, axialStart + collarLength * .89], [paperRadius * .48, axialStart + collarLength * .95],
        [paperRadius * .34, axialStart + collarLength + handleLength * .16], [paperRadius * .28, axialStart + collarLength + handleLength * .3],
        [paperRadius * .32, axialStart + collarLength + handleLength * .43], [paperRadius * .38, axialStart + collarLength + handleLength * .56],
        [paperRadius * .34, axialStart + collarLength + handleLength * .66], [paperRadius * .24, axialStart + collarLength + handleLength * .77],
        [paperRadius * .17, axialStart + collarLength + handleLength * .86], [paperRadius * .20, axialStart + collarLength + handleLength * .91],
        [paperRadius * .16, axialStart + collarLength + handleLength * .96], [paperRadius * .08, axialEnd], [0, axialEnd + paperDiameter * .018]
      ].map(([r, y]) => new THREE.Vector3(r, y, 0));
      const smoothProfile = new THREE.CatmullRomCurve3(profile, false, 'catmullrom', .28)
        .getPoints(128).map((point) => new THREE.Vector2(Math.max(0, point.x), point.y));
      const endPiece = new THREE.Mesh(smoothGeometry(new THREE.LatheGeometry(smoothProfile, 64)), collarMaterial);
      endPiece.position.y = side * (length / 2);
      if (side < 0) endPiece.rotation.z = Math.PI;
      endPiece.castShadow = true; endPiece.receiveShadow = true;
      (side < 0 ? leftEndAssembly : rightEndAssembly).add(endPiece);
      if (!firstEnd) firstEnd = endPiece;

      const paperEdge = new THREE.Mesh(smoothGeometry(new THREE.TorusGeometry(paperRadius, radius * .025, 12, 64)), paperEdgeMaterial);
      paperEdge.rotation.x = Math.PI / 2; paperEdge.position.y = side * (paperShellWidth * .47); accumulatedPaperAssembly.add(paperEdge);
      group.userData.paperRadiusMeshes.push(paperEdge);
      for (let layer = 1; layer <= 6; layer += 1) {
        const layerRing = new THREE.Mesh(smoothGeometry(new THREE.TorusGeometry(paperRadius - radius * (.018 * layer), radius * (.0045 + layer * .0007), 10, 64)), paperEdgeMaterial);
        layerRing.rotation.x = Math.PI / 2; layerRing.position.y = side * (paperShellWidth * (.47 - layer * .009)); accumulatedPaperAssembly.add(layerRing);
        group.userData.paperRadiusMeshes.push(layerRing);
      }
    }
    scene.add(group); groups.push(group);
    if (showMeasurements) {
      console.assert(group.scale.equals(new THREE.Vector3(1, 1, 1)), 'Roller position group must not scale');
      console.assert(fixed.scale.equals(new THREE.Vector3(1, 1, 1)), 'Stationary assembly must not scale');
      console.assert(rotatingAssembly.scale.equals(new THREE.Vector3(1, 1, 1)), 'Rotating assembly must not scale');
      console.assert(permanentWoodAssembly.scale.equals(new THREE.Vector3(1, 1, 1)), 'Permanent wood assembly must not scale');
      console.assert(leftEndAssembly.scale.equals(new THREE.Vector3(1, 1, 1)), 'Left end assembly must not scale');
      console.assert(rightEndAssembly.scale.equals(new THREE.Vector3(1, 1, 1)), 'Right end assembly must not scale');
      console.assert(drum.parent === permanentWoodAssembly, 'Wooden drum must rotate with the assembly');
      console.assert(paperShell.parent === accumulatedPaperAssembly, 'Rolled parchment must rotate with the assembly');
      console.assert(firstEnd?.parent === leftEndAssembly, 'Continuous end must rotate with the assembly');
      console.assert(firstSupport?.parent === fixed && fixed !== rotatingAssembly, 'Support must remain stationary');
    }
    return group;
  };

  let pendingResizeFrame = 0;
  let layoutRevision = 0;
  let resizeObserver = null;
  let resizeSourceCount = 0;
  let stableResizeFrame = 0;
  let resizeSavedProgress = null;

  const clampProgress = (value) => THREE.MathUtils.clamp(Number.isFinite(Number(value)) ? Number(value) : 0, 0, 1);

  const rebuildResponsiveLayout = (revision = layoutRevision, preservedProgress = window.__cvLayoutState?.progress) => {
    if (revision !== layoutRevision) return;
    const root = document.documentElement;
    const stageRect = stage.getBoundingClientRect();
    const height = Math.max(320, stageRect.height);
    const width = Math.max(320, stageRect.width);
    const viewportWidth = window.innerWidth;
    const mobile = viewportWidth < 700;
    const clearance = mobile ? 14 : 22;
    const lengthRatio = mobile ? 1.03 : 1.035;
    const diameterRatio = mobile ? .135 : .112;
    const diameterLimits = mobile ? [44, 60] : [68, 88];
    const visibleFinialOverhangRatio = (.42 * .55 + .55 + .018) * 1.18;
    const paperRadiusRatio = 1.18;
    const paperOuterRadiusRatio = 1.24;
    const assemblyOuterRadiusRatio = paperRadiusRatio * 1.24;
    // Preserve the progress captured when the resize burst began. Reading it
    // only after layout settles would adopt the browser's temporary scroll
    // correction as the new baseline.
    const savedProgress = clampProgress(preservedProgress);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);

    // CSS owns the responsive width. Read the rendered box after the first
    // frame of CSS has settled; Three.js consumes this measurement only.
    const initialParchmentRect = readingWindow.getBoundingClientRect();
    const parchmentWidth = initialParchmentRect.width;
    const drumDiameterCss = Math.min(diameterLimits[1], Math.max(diameterLimits[0], parchmentWidth * diameterRatio));
    const drumLengthCss = parchmentWidth * lengthRatio;
    const drumOverhangCss = (drumLengthCss - parchmentWidth) / 2;
    const endCapDiameterCss = drumDiameterCss * 1.14;
    const finialLengthCss = drumDiameterCss * (mobile ? .64 : .7);
    const axleDiameterCss = drumDiameterCss * .185;
    const visibleAxleLengthCss = drumDiameterCss * .22;
    const visibleFinialOverhangCss = drumDiameterCss * visibleFinialOverhangRatio;
    const completeAssemblyWidthCss = drumLengthCss + (visibleFinialOverhangCss * 2);
    const finalPaperOuterRadiusCss = drumDiameterCss * paperOuterRadiusRatio / 2;
    const finalAssemblyOuterRadiusCss = drumDiameterCss * assemblyOuterRadiusRatio / 2;
    const topCenterCss = clearance + finalAssemblyOuterRadiusCss;
    const bottomCenterCss = height - clearance - finalAssemblyOuterRadiusCss;
    const bearingOffsetCss = (drumLengthCss / 2) + finialLengthCss + (visibleAxleLengthCss * .25);
    root.style.setProperty('--top-bearing-y', `${topCenterCss}px`);
    root.style.setProperty('--left-bearing-x', `${(width / 2) - bearingOffsetCss}px`);
    root.style.setProperty('--right-bearing-x', `${(width / 2) + bearingOffsetCss}px`);

    const geometry = { parchmentWidth, parchmentLeft: initialParchmentRect.left - stageRect.left, parchmentRight: initialParchmentRect.right - stageRect.left, drumLengthCss, drumDiameterCss, drumOverhangCss, endCapDiameterCss, finialLengthCss, visibleFinialOverhangCss, finalPaperOuterRadiusCss, finalAssemblyOuterRadiusCss, axleDiameterCss, visibleAxleLengthCss, completeAssemblyWidthCss, paperShellWidthCss: parchmentWidth, drumToDiameterRatio: drumLengthCss / drumDiameterCss, paperRadiusRatio };
    layout = { stageRect, width, height, worldPerCss: viewHeight / height, geometry };
    window.__scrollGeometry = geometry;
    groups.splice(0).forEach(disposeObject);
    if (parchmentShadowReceiver) disposeObject(parchmentShadowReceiver);

    const top = buildRoller(topReference, true);
    const bottom = buildRoller(bottomReference, false);
    top.position.y = (height / 2 - topCenterCss) * layout.worldPerCss;
    bottom.position.y = (height / 2 - bottomCenterCss) * layout.worldPerCss;
    top.position.z = 2; bottom.position.z = 2;
    scene.updateMatrixWorld(true);

    const canvasRect = renderer.domElement.getBoundingClientRect();
    const projectContact = (roller, isTop) => {
      const localY = (isTop ? -1 : 1) * roller.userData.radius * 1.24;
      const worldPoint = roller.localToWorld(new THREE.Vector3(0, localY, 0));
      const ndc = worldPoint.project(camera);
      return canvasRect.top + (1 - ((ndc.y + 1) / 2)) * canvasRect.height;
    };
    const projectedTopContactPage = projectContact(top, true);
    const projectedBottomContactPage = projectContact(bottom, false);
    const overlap = 2;
    const parchmentTop = projectedTopContactPage - stageRect.top - overlap;
    const parchmentBottom = projectedBottomContactPage - stageRect.top + overlap;
    const parchmentHeight = Math.max(320, parchmentBottom - parchmentTop);
    root.style.setProperty('--parchment-top', `${parchmentTop}px`);
    root.style.setProperty('--parchment-height', `${parchmentHeight}px`);
    root.style.setProperty('--parchment-width', `${parchmentWidth}px`);
    root.style.setProperty('--top-contact-y', `${projectedTopContactPage - stageRect.top}px`);
    root.style.setProperty('--bottom-contact-y', `${projectedBottomContactPage - stageRect.top}px`);
    root.style.setProperty('--content-safe-padding', `${Math.max(24, drumDiameterCss * .45)}px`);

    const parchmentRect = readingWindow.getBoundingClientRect();
    const maxTravel = Math.max(0, readingWindow.querySelector('.parchment-track')?.scrollHeight - parchmentRect.height || 0);
    const nextLayoutState = { ...window.__cvLayoutState, progress: savedProgress, travel: maxTravel * savedProgress, maxTravel, viewportHeight: window.innerHeight, geometry, revision };
    window.__cvLayoutState = nextLayoutState;
    const diagnostics = {
      revision,
      projectedTopContact: projectedTopContactPage - stageRect.top,
      actualTop: parchmentRect.top - stageRect.top,
      projectedBottomContact: projectedBottomContactPage - stageRect.top,
      actualBottom: parchmentRect.bottom - stageRect.top,
      topOverlap: (projectedTopContactPage - stageRect.top) - (parchmentRect.top - stageRect.top),
      bottomOverlap: (parchmentRect.bottom - stageRect.top) - (projectedBottomContactPage - stageRect.top),
      visibleTopGap: 0,
      visibleBottomGap: 0,
      visibleTopLip: 0,
      visibleBottomLip: 0,
      resizeSources: resizeSourceCount,
      topContactStripCount: top.userData.contactStripCount,
      bottomContactStripCount: bottom.userData.contactStripCount
    };
    window.__cvResizeDiagnostics = diagnostics;
    syncAngle(nextLayoutState);
    updateMeasurementOverlay();
    requestRender();
    if (revision !== layoutRevision) return;
    window.dispatchEvent(new CustomEvent('cv-layout-resized', { detail: nextLayoutState }));
    stableResizeFrame = requestAnimationFrame(() => {
      stableResizeFrame = requestAnimationFrame(() => {
        if (revision === layoutRevision) {
          document.body.classList.remove('is-resizing');
          resizeSavedProgress = null;
          window.dispatchEvent(new CustomEvent('cv-layout-stable', { detail: { revision } }));
        }
      });
    });
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
    const d = window.__cvResizeDiagnostics || {};
    measurementOverlay.innerHTML = `<i class="measure-line measure-line--paper-left" style="left:${left}px"></i><i class="measure-line measure-line--paper-right" style="left:${left + parchmentWidth}px"></i><i class="measure-line measure-line--drum-left" style="left:${drumLeft}px"></i><i class="measure-line measure-line--drum-right" style="left:${drumRight}px"></i><span class="measure-label" style="left:${left}px">paper ${Math.round(parchmentWidth)}px · drum ${Math.round(g.drumLengthCss)}px · Ø ${Math.round(g.drumDiameterCss)}px · assembly ${Math.round(g.completeAssemblyWidthCss)}px · ratio ${g.drumToDiameterRatio.toFixed(1)}:1<br>contacts ${d.projectedTopContact?.toFixed(1)} / ${d.actualTop?.toFixed(1)} · ${d.projectedBottomContact?.toFixed(1)} / ${d.actualBottom?.toFixed(1)} · overlaps ${d.topOverlap?.toFixed(1)} / ${d.bottomOverlap?.toFixed(1)} · gaps ${d.visibleTopGap}/${d.visibleBottomGap} · lips ${d.visibleTopLip}/${d.visibleBottomLip} · revision ${d.revision} · resize sources ${d.resizeSources} · strips ${d.topContactStripCount}/${d.bottomContactStripCount}</span>`;
  };

  const syncAngle = (detail = window.__cvLayoutState) => {
    if (!layout || !detail) return;
    const travelWorld = Math.max(0, Number(detail.travel) || 0) * layout.worldPerCss;
    const progress = THREE.MathUtils.clamp(Number(detail.progress) || 0, 0, 1);
    const radiusState = [];
    groups.forEach((group) => {
      const { radius, paperBaseRadius, isTop, rotatingAssembly, paperRadiusMeshes } = group.userData;
      rotatingAssembly.rotation.y = group.userData.sign * (travelWorld / radius);

      const woodenCoreRadius = radius;
      const minimumPaperRadius = woodenCoreRadius * 1.04;
      const maximumPaperRadius = woodenCoreRadius * 1.24;
      const desiredPaperRadius = THREE.MathUtils.lerp(
        isTop ? maximumPaperRadius : minimumPaperRadius,
        isTop ? minimumPaperRadius : maximumPaperRadius,
        progress
      );
      const safePaperRadius = THREE.MathUtils.clamp(desiredPaperRadius, minimumPaperRadius, maximumPaperRadius);
      const radialScale = safePaperRadius / paperBaseRadius;

      paperRadiusMeshes.forEach((mesh) => mesh.scale.set(radialScale, 1, radialScale));
      group.userData.paperRadius = safePaperRadius;
      group.userData.radialScale = radialScale;
      group.userData.minimumPaperRadius = minimumPaperRadius;
      group.userData.maximumPaperRadius = maximumPaperRadius;

      if (showMeasurements) {
        const unitScale = new THREE.Vector3(1, 1, 1);
        console.assert(group.scale.equals(unitScale), 'Roller position group must remain unscaled');
        console.assert(group.userData.stationaryAssembly.scale.equals(unitScale), 'Stationary assembly must remain unscaled');
        console.assert(rotatingAssembly.scale.equals(unitScale), 'Rotating assembly must remain unscaled');
        console.assert(group.userData.permanentWoodAssembly.scale.equals(unitScale), 'Permanent wood must remain unscaled');
        console.assert(group.userData.leftEndAssembly.scale.equals(unitScale), 'Left end must remain unscaled');
        console.assert(group.userData.rightEndAssembly.scale.equals(unitScale), 'Right end must remain unscaled');
        console.assert(Number.isFinite(safePaperRadius) && safePaperRadius >= minimumPaperRadius, 'Paper radius must stay positive');
        console.assert(radialScale > 0, 'Paper radial scale must stay positive');
      }
      radiusState.push({
        isTop,
        progress,
        paperRadius: safePaperRadius,
        radialScale,
        minimumPaperRadius,
        maximumPaperRadius
      });
    });
    window.__scrollRadiusState = radiusState;
  };

  let renderFrame = 0;
  const render = () => { renderFrame = 0; if (hidden) return; renderer.render(scene, camera); rendered = true; };
  const requestRender = () => { if (!renderFrame && !hidden) renderFrame = requestAnimationFrame(render); };

  const scheduleResize = () => {
    document.body.classList.add('is-resizing');
    cancelAnimationFrame(stableResizeFrame);
    if (!pendingResizeFrame && resizeSavedProgress === null) {
      resizeSavedProgress = clampProgress(window.__cvLayoutState?.progress);
    }
    cancelAnimationFrame(pendingResizeFrame);
    pendingResizeFrame = requestAnimationFrame(() => {
      pendingResizeFrame = requestAnimationFrame(() => {
        pendingResizeFrame = 0;
        const revision = ++layoutRevision;
        const preservedProgress = resizeSavedProgress ?? window.__cvLayoutState?.progress;
        rebuildResponsiveLayout(revision, preservedProgress);
      });
    });
  };

  window.addEventListener('cv-transport', (event) => { syncAngle(event.detail); requestRender(); });
  document.addEventListener('visibilitychange', () => {
    hidden = captureMode ? false : document.hidden;
    if (!hidden) requestRender();
  });
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); fallback('WebGL context lost'); });
  canvas.addEventListener('webglcontextrestored', () => { document.body.classList.remove('webgl-fallback'); document.body.classList.add('webgl-ready'); scheduleResize(); });

  document.body.classList.remove('webgl-fallback');
  document.body.classList.add('webgl-ready');
  setRendererPath('webgl');
  try {
    layoutRevision += 1;
    rebuildResponsiveLayout(layoutRevision);
  } catch (error) {
    console.error('Roller scene failed while building geometry', error);
    fallback(error?.message || 'Roller geometry failed');
    return;
  }
  window.addEventListener('resize', scheduleResize);
  resizeSourceCount += 1;
  window.addEventListener('orientationchange', scheduleResize);
  resizeSourceCount += 1;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleResize);
    resizeSourceCount += 1;
  }
  resizeObserver = new ResizeObserver(scheduleResize);
  resizeObserver.observe(stage);
  resizeSourceCount += 1;
  if (captureMode) render();
  else if (!rendered) requestRender();
})();
