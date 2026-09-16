// Run with: node outputs/about-3d/verify.cjs
// Pure geometry/controller checks. Real browser screenshots complement these mocks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const project = path.resolve(__dirname, '../..');
const results = [];
function pass(name) { results.push(name); console.log('PASS ' + name); }

class Element {
  constructor() {
    this.handlers = {}; this.dataset = {}; this.attributes = {}; this.hidden = false;
    this.clientWidth = 780; this.clientHeight = 650; this.captures = new Set();
    this.classList = { add() {}, remove() {} };
  }
  addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); }
  emit(name, values = {}) { for (const handler of this.handlers[name] || []) handler({ preventDefault() {}, ...values }); }
  setAttribute(name, value) { this.attributes[name] = value; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); this.emit('lostpointercapture', { pointerId: id }); }
  focus() {}
}

(async () => {
  const THREE = await import(pathToFileURL(path.join(project, 'assets/js/vendor/three.module.min.js')));
  const { createSculpture } = await import(pathToFileURL(path.join(project, 'assets/js/studio-sculpture-geometry.js')));
  const sculpt = createSculpture(THREE, new THREE.Texture());
  const original = sculpt.group.children.map(mesh => mesh.geometry.attributes.position.array.slice());
  assert.equal(sculpt.stats.ribCount, 15);
  assert.ok(sculpt.stats.restGap > sculpt.stats.ribThickness);
  for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    sculpt.deform(x, y);
    assert.ok(sculpt.stats.deformation.maxDisplacement > .2);
    sculpt.group.children.forEach((mesh, index) => {
      const position = mesh.geometry.attributes.position.array;
      assert.ok(position.every(Number.isFinite));
      assert.ok(mesh.geometry.attributes.normal.array.every(Number.isFinite));
      for (let i = 0; i < position.length; i += 3) {
        if (original[index][i + 1] <= .18) {
          assert.equal(position[i], original[index][i]);
          assert.equal(position[i + 1], original[index][i + 1]);
          assert.equal(position[i + 2], original[index][i + 2]);
        }
      }
    });
  }
  pass('15 closed ribs have visible gaps; all eight extreme bends are finite and keep feet anchored');
  sculpt.deform(100, -100);
  assert.equal(sculpt.stats.deformation.x, 1);
  assert.equal(sculpt.stats.deformation.y, -1);
  sculpt.deform(0, 0);
  sculpt.group.children.forEach((mesh, i) => assert.deepEqual(mesh.geometry.attributes.position.array, original[i]));
  pass('geometry clamps extreme inputs and restores every original vertex exactly');
  const geometryStats = JSON.parse(JSON.stringify(sculpt.stats));
  sculpt.dispose();

  const source = fs.readFileSync(path.join(project, 'assets/js/studio-sculpture.js'), 'utf8')
    .replace('import("./vendor/three.module.min.js")', 'Promise.resolve(mockThree)')
    .replace('import("./studio-sculpture-geometry.js")', 'Promise.resolve(mockGeometry)');
  async function setup({ reduced = false, deferTexture = false } = {}) {
    const nodes = new Map();
    const root = new Element();
    root.querySelector = selector => { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); };
    const document = new Element(); document.hidden = false; document.querySelector = () => root;
    const window = new Element();
    const media = new Element(); media.matches = reduced;
    const coarse = new Element(); coarse.matches = false;
    const observers = [];
    let time = 0, id = 0, renderCount = 0, lastDeform = [0, 0], textureResolve;
    const frames = new Map();
    const texturePromise = new Promise(resolve => { textureResolve = resolve; });
    const mockThree = {
      ...THREE,
      WebGLRenderer: class {
        constructor() { this.shadowMap = {}; this.capabilities = { getMaxAnisotropy: () => 8 }; }
        setClearColor() {} setPixelRatio() {} setSize() {} dispose() {}
        render() { renderCount++; }
      },
      TextureLoader: class { loadAsync() { return deferTexture ? texturePromise : Promise.resolve(new THREE.Texture()); } }
    };
    const mockGeometry = { createSculpture: () => ({ group: new THREE.Group(), deform(x,y) { lastDeform = [x,y]; }, dispose() {} }) };
    class Observer {
      constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
      observe() {} disconnect() {}
    }
    window.IntersectionObserver = Observer;
    const context = { console, document, window, mockThree, mockGeometry, AbortController,
      matchMedia: query => query.includes('reduced') ? media : coarse,
      IntersectionObserver: Observer, ResizeObserver: class { observe() {} disconnect() {} },
      requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
      cancelAnimationFrame: key => frames.delete(key), devicePixelRatio: 1.25 };
    vm.runInNewContext(source, context, { filename: 'studio-sculpture.js' });
    observers[1].callback([{ isIntersecting: true }]);
    observers[0].callback([{ isIntersecting: true }], observers[0]);
    async function flush() { for (let i=0;i<12;i++) await Promise.resolve(); }
    await flush();
    function step(count = 1) {
      for (let i=0;i<count;i++) {
        time += 1000/60;
        const queue = [...frames.values()]; frames.clear();
        queue.forEach(callback => callback(time));
      }
    }
    return { root, node: selector => nodes.get(selector), document, window, media, observers, frames,
      step, flush, resolveTexture() { textureResolve(new THREE.Texture()); },
      get deformation() { return lastDeform; }, get renders() { return renderCount; } };
  }

  const env = await setup();
  const canvas = env.node('[data-sculpture-canvas]');
  env.step(2);
  assert.equal(env.root.dataset.sculptureState, 'ready');
  const down = { pointerId: 1, clientX: 200, clientY: 300, isPrimary: true, button: 0, pointerType: 'mouse' };
  canvas.emit('pointerdown', down);
  canvas.emit('pointermove', { pointerId: 1, clientX: 10000, clientY: -10000 });
  env.step(90);
  assert.ok(env.deformation[0] > .9 && env.deformation[1] > .9);
  assert.ok(env.deformation.every(value => Math.abs(value) <= 1.03));
  canvas.emit('pointerup', { pointerId: 1 });
  env.step(240);
  assert.deepEqual(env.deformation, [0,0]);
  pass('actual pointer controller visibly deforms, clamps distant drag and settles exactly to zero');
  canvas.emit('pointerdown', down);
  canvas.emit('pointermove', { pointerId: 1, clientX: -800, clientY: 400 });
  env.step(30); canvas.emit('pointercancel', { pointerId: 1 }); env.step(240);
  assert.deepEqual(env.deformation, [0,0]);
  pass('pointer cancellation releases capture and settles');
  canvas.emit('keydown', { key: 'ArrowUp' }); env.step(90);
  assert.ok(env.deformation[1] > .8);
  canvas.emit('keyup', { key: 'ArrowUp' }); env.step(240);
  assert.deepEqual(env.deformation, [0,0]);
  pass('keyboard direction changes geometry and key release returns it');
  env.node('[data-sculpture-pause]').emit('click'); env.step(10);
  const pausedRenders = env.renders; env.step(120);
  assert.equal(env.renders, pausedRenders); assert.equal(env.frames.size, 0);
  canvas.emit('keydown', { key: 'ArrowRight' }); env.step(40);
  assert.ok(env.deformation[0] > .5);
  env.observers[1].callback([{isIntersecting:false}]); env.step(20);
  assert.equal(env.frames.size, 0);
  env.observers[1].callback([{isIntersecting:true}]); env.step(2);
  assert.deepEqual(env.deformation, [0,0]);
  pass('pause stops idle rendering; offscreen cancels frames and clears drag state');
  const reduced = await setup({ reduced: true }); reduced.step(2);
  assert.equal(reduced.frames.size, 0);
  const reducedCanvas = reduced.node('[data-sculpture-canvas]');
  reducedCanvas.emit('keydown', { key: 'ArrowRight' }); reduced.step(1);
  assert.equal(reduced.deformation[0], .85);
  reducedCanvas.emit('keyup', { key: 'ArrowRight' }); reduced.step(1);
  assert.deepEqual(reduced.deformation, [0,0]);
  assert.equal(reduced.node('[data-sculpture-pause]').disabled, true);
  pass('reduced motion is static at rest and responds instantly without elastic motion');
  const interrupted = await setup({deferTexture:true});
  interrupted.node('[data-sculpture-canvas]').emit('webglcontextlost');
  interrupted.resolveTexture(); await interrupted.flush();
  assert.equal(interrupted.root.dataset.sculptureState, 'fallback');
  assert.equal(interrupted.node('.sculpture-fallback').hidden, false);
  interrupted.node('[data-sculpture-canvas]').emit('webglcontextrestored'); interrupted.step(2);
  assert.equal(interrupted.root.dataset.sculptureState, 'ready');
  pass('context loss during async initialization keeps fallback until restoration');
  const oldHtml = fs.readFileSync(path.join(project, 'backups/about-3d-20260916-001838-116/index.html'),'utf8');
  const newHtml = fs.readFileSync(path.join(project,'index.html'),'utf8');
  const strip = value => value.replace(/\r/g,'').replace(/    <section class="section studio[\s\S]*?<\/section>/,'')
    .replace(/^.*(?:assets\/css\/studio-sculpture.css|assets\/js\/studio-sculpture.js).*\n/gm,'');
  assert.equal(strip(newHtml),strip(oldHtml));
  pass('all HTML outside About is unchanged except the two dedicated asset includes');
  fs.writeFileSync(path.join(__dirname,'verification.json'), JSON.stringify({ checkedAt:new Date().toISOString(), results, geometryStats },null,2));
})().catch(error => { console.error(error); process.exitCode = 1; });
