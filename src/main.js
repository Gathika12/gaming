/* ===================================================================
   AETHER PRO // APPLICATION CONTROLLER & RENDER ENGINE
   High-performance canvas sequence rendering, smooth interpolation,
   Web Audio API tactile feedback, scrollytelling sync, and luxury e-commerce.
   =================================================================== */

class AetherEngine {
  constructor() {
    this.totalFrames = 300;
    this.images = new Array(this.totalFrames);
    this.loadedCount = 0;
    this.currentFrame = 1;
    this.targetFrame = 1;
    this.isLoaded = false;
    
    // Canvas elements
    this.canvas = document.getElementById('controller-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: false }) : null;
    
    // Interactive scrubber canvas
    this.scrubberCanvas = document.getElementById('scrubber-canvas');
    this.scrubberCtx = this.scrubberCanvas ? this.scrubberCanvas.getContext('2d', { alpha: false }) : null;
    
    // Audio engine state
    this.audioCtx = null;
    this.soundEnabled = false;

    // Cart state
    this.cart = [
      {
        id: 'aether-pro-onyx',
        name: 'Aether Pro // Wireless Controller',
        edition: 'Onyx Stealth',
        price: 199.00,
        qty: 1,
        img: './hero_images/ezgif-frame-001.jpg'
      }
    ];

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // 1. Immediate priority: Load Frame 1 and draw to hero canvas
    await this.loadPriorityFrame(1);
    this.drawHeroFrame(1);
    this.drawScrubberFrame(1);

    // 2. Progressive background batch loading for remaining 299 frames
    this.preloadAllFrames();

    // 3. Start render loop
    this.startRenderLoop();

    // 4. Initial scroll calculation to activate Stage 1 immediately
    this.onScroll();
  }

  /* -----------------------------------------------------------------
     FRAME PRELOADING ENGINE
     ----------------------------------------------------------------- */
  getFrameUrl(index) {
    const padIndex = String(index).padStart(3, '0');
    return `./hero_images/ezgif-frame-${padIndex}.jpg`;
  }

  loadPriorityFrame(index) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = this.getFrameUrl(index);
      img.onload = () => {
        this.images[index - 1] = img;
        this.loadedCount++;
        resolve(img);
      };
      img.onerror = () => resolve(null);
    });
  }

  preloadAllFrames() {
    const loaderFill = document.getElementById('loader-bar-fill');
    const loaderPercent = document.getElementById('loader-percent');
    const canvasLoader = document.getElementById('canvas-loader');

    let loaded = 0;
    const queue = [];
    for (let i = 1; i <= this.totalFrames; i++) {
      if (i === 1 && this.images[0]) continue;
      queue.push(i);
    }

    const concurrency = 8;
    let inFlight = 0;

    const pump = () => {
      while (inFlight < concurrency && queue.length > 0) {
        const frameIdx = queue.shift();
        inFlight++;
        const img = new Image();
        img.src = this.getFrameUrl(frameIdx);

        img.onload = () => {
          this.images[frameIdx - 1] = img;
          this.loadedCount++;
          loaded++;
          inFlight--;

          const percent = Math.min(100, Math.round((this.loadedCount / this.totalFrames) * 100));
          if (loaderFill) loaderFill.style.width = `${percent}%`;
          if (loaderPercent) loaderPercent.innerText = `${percent}%`;

          // If user started scrolling before full load, draw whatever is closest
          if (Math.abs(this.currentFrame - frameIdx) < 2) {
            this.drawHeroFrame(Math.round(this.currentFrame));
          }

          if (this.loadedCount >= this.totalFrames) {
            this.isLoaded = true;
            if (canvasLoader) canvasLoader.classList.add('loaded');
          } else {
            pump();
          }
        };

        img.onerror = () => {
          inFlight--;
          pump();
        };
      }
    };

    pump();

    // Safety fallback: dismiss loader after 4 seconds regardless
    setTimeout(() => {
      if (canvasLoader) canvasLoader.classList.add('loaded');
    }, 4000);
  }

  /* -----------------------------------------------------------------
     CANVAS SIZING & RENDERING
     ----------------------------------------------------------------- */
  resizeCanvas() {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvasCssWidth = rect.width;
    this.canvasCssHeight = rect.height;

    if (this.scrubberCanvas && this.scrubberCtx) {
      const sRect = this.scrubberCanvas.getBoundingClientRect();
      this.scrubberCanvas.width = sRect.width * dpr;
      this.scrubberCanvas.height = sRect.height * dpr;
      this.scrubberCtx.scale(dpr, dpr);
      this.scrubberCssWidth = sRect.width;
      this.scrubberCssHeight = sRect.height;
    }

    this.drawHeroFrame(Math.round(this.currentFrame));
  }

  drawHeroFrame(frameIndex) {
    if (!this.ctx || !this.canvas) return;
    const idx = Math.max(1, Math.min(this.totalFrames, frameIndex));
    
    // Find closest loaded image if current frame is loading
    let img = this.images[idx - 1];
    if (!img || !img.complete) {
      for (let offset = 1; offset < 20; offset++) {
        if (this.images[idx - 1 - offset] && this.images[idx - 1 - offset].complete) {
          img = this.images[idx - 1 - offset];
          break;
        }
        if (this.images[idx - 1 + offset] && this.images[idx - 1 + offset].complete) {
          img = this.images[idx - 1 + offset];
          break;
        }
      }
    }
    if (!img) return;

    const w = this.canvasCssWidth;
    const h = this.canvasCssHeight;

    // 1. Clear with deep infinite black
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, w, h);

    // 2. High-performance aspect-ratio contain rendering
    const imgRatio = 1920 / 1080;
    const canvasRatio = w / h;
    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      // Screen is wider than 16:9
      drawH = h;
      drawW = h * imgRatio;
      drawX = (w - drawW) / 2;
      drawY = 0;
    } else {
      // Screen is taller than 16:9 (mobile / portrait)
      drawW = w;
      drawH = w / imgRatio;
      drawX = 0;
      drawY = (h - drawH) / 2;
    }

    this.ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // 3. Subtle radial vignette overlay to blend edges into #050505
    const gradient = this.ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.35,
      w / 2, h / 2, Math.max(w, h) * 0.7
    );
    gradient.addColorStop(0, 'rgba(5, 5, 5, 0)');
    gradient.addColorStop(0.85, 'rgba(5, 5, 5, 0.4)');
    gradient.addColorStop(1, 'rgba(5, 5, 5, 0.95)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);
  }

  drawScrubberFrame(frameIndex) {
    if (!this.scrubberCtx || !this.scrubberCanvas) return;
    const idx = Math.max(1, Math.min(this.totalFrames, frameIndex));
    const img = this.images[idx - 1] || this.images[0];
    if (!img) return;

    const w = this.scrubberCssWidth || this.scrubberCanvas.clientWidth;
    const h = this.scrubberCssHeight || this.scrubberCanvas.clientHeight;

    this.scrubberCtx.fillStyle = '#050505';
    this.scrubberCtx.fillRect(0, 0, w, h);

    const imgRatio = 1920 / 1080;
    const canvasRatio = w / h;
    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      drawH = h;
      drawW = h * imgRatio;
      drawX = (w - drawW) / 2;
      drawY = 0;
    } else {
      drawW = w;
      drawH = w / imgRatio;
      drawX = 0;
      drawY = (h - drawH) / 2;
    }

    this.scrubberCtx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  /* -----------------------------------------------------------------
     ANIMATION & RENDER LOOP
     ----------------------------------------------------------------- */
  startRenderLoop() {
    const loop = () => {
      // Lerp frame smoothing for buttery Awwwards feel
      const diff = this.targetFrame - this.currentFrame;
      if (Math.abs(diff) > 0.05) {
        this.currentFrame += diff * 0.22;
        this.drawHeroFrame(Math.round(this.currentFrame));
        this.updateHudTelemetry(Math.round(this.currentFrame));
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* -----------------------------------------------------------------
     SCROLL SYNCHRONIZATION (0% - 100% Sequence Mapping)
     ----------------------------------------------------------------- */
  onScroll() {
    const scrollyContainer = document.getElementById('scrolly-container');
    if (!scrollyContainer) return;

    const rect = scrollyContainer.getBoundingClientRect();
    const totalScrollDist = scrollyContainer.offsetHeight - window.innerHeight;
    const currentScrollY = -rect.top;

    // Calculate normalized progress p in [0.0, 1.0]
    let p = Math.max(0, Math.min(1, currentScrollY / totalScrollDist));

    // Map scroll progress to 300 frames:
    // 0% - 15%: Assembled Hero (Frame 1)
    // 15% - 65%: Exploded Engineering (Frame 1 -> Frame 300)
    // 65% - 82%: Peak Exploded View (Frame 300)
    // 82% - 100%: Graceful Reassembly (Frame 300 -> Frame 1)
    let calculatedFrame = 1;

    if (p < 0.15) {
      calculatedFrame = 1;
    } else if (p >= 0.15 && p < 0.65) {
      const sub = (p - 0.15) / 0.50; // 0 to 1
      calculatedFrame = 1 + sub * (this.totalFrames - 1);
    } else if (p >= 0.65 && p < 0.82) {
      calculatedFrame = 300;
    } else {
      const sub = (p - 0.82) / 0.18; // 0 to 1
      calculatedFrame = 300 - sub * (this.totalFrames - 1);
    }

    this.targetFrame = Math.round(calculatedFrame);

    // Synchronize 5 Narrative Stage Overlays
    this.updateNarrativeStages(p);

    // Synchronize Fixed Header fade-in
    const header = document.getElementById('main-header');
    if (header) {
      if (window.scrollY > 80) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }

  updateNarrativeStages(p) {
    const stages = [
      { id: 'stage-1', min: 0.00, max: 0.15, name: '01 // HERO PRODUCT REVEAL' },
      { id: 'stage-2', min: 0.15, max: 0.40, name: '02 // ENGINEERING REVEAL' },
      { id: 'stage-3', min: 0.40, max: 0.65, name: '03 // PRECISION & PERFORMANCE' },
      { id: 'stage-4', min: 0.65, max: 0.85, name: '04 // GAMING EXPERIENCE' },
      { id: 'stage-5', min: 0.85, max: 1.00, name: '05 // REASSEMBLY & SHOPPING' }
    ];

    let currentStage = stages[0];

    stages.forEach(stg => {
      const el = document.getElementById(stg.id);
      if (!el) return;
      if (p >= stg.min && p <= stg.max) {
        el.classList.add('active');
        currentStage = stg;
      } else {
        el.classList.remove('active');
      }
    });

    // Hotspot Pins Visibility - Stage-aware positioning to avoid any text collision
    const pinSticks = document.getElementById('pin-hall-sticks');
    const pinPcb = document.getElementById('pin-pcb');
    const pinHaptics = document.getElementById('pin-haptics');
    const pinTriggers = document.getElementById('pin-triggers');

    // Reset all pins
    [pinSticks, pinPcb, pinHaptics, pinTriggers].forEach(pin => {
      if (pin) pin.classList.remove('visible');
    });

    if (p >= 0.18 && p < 0.38) {
      // Stage 2: Editorial card is on the left -> show right/center pins
      if (pinPcb) pinPcb.classList.add('visible');
      if (pinHaptics) pinHaptics.classList.add('visible');
      if (pinTriggers) pinTriggers.classList.add('visible');
    } else if (p >= 0.42 && p < 0.62) {
      // Stage 3: Editorial card is on the right -> show left/center pins
      if (pinSticks) pinSticks.classList.add('visible');
      if (pinPcb) pinPcb.classList.add('visible');
    }

    // Update HUD Progress
    const hudFill = document.getElementById('hud-progress-fill');
    const hudPercent = document.getElementById('hud-percent-val');
    const hudStageName = document.getElementById('hud-stage-name');

    const percentInt = Math.round(p * 100);
    if (hudFill) hudFill.style.width = `${percentInt}%`;
    if (hudPercent) hudPercent.innerText = `${percentInt}%`;
    if (hudStageName) hudStageName.innerText = currentStage.name;
  }

  updateHudTelemetry(frame) {
    const hudFrameNum = document.getElementById('hud-frame-num');
    if (hudFrameNum) {
      hudFrameNum.innerText = `FRM ${String(frame).padStart(3, '0')}/300`;
    }
  }

  scrollToStage(stageNumber) {
    const scrollyContainer = document.getElementById('scrolly-container');
    if (!scrollyContainer) return;
    const totalDist = scrollyContainer.offsetHeight - window.innerHeight;
    const stageTargets = [0, 0.05, 0.28, 0.52, 0.75, 0.95];
    const targetScrollY = scrollyContainer.offsetTop + (totalDist * stageTargets[stageNumber]);
    window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
    this.playAudioBlip('click');
  }

  /* -----------------------------------------------------------------
     INTERACTIVE 360 SCRUBBER LAB
     ----------------------------------------------------------------- */
  seekScrubber(val) {
    const slider = document.getElementById('frame-scrubber');
    const scrubValText = document.getElementById('scrub-val-text');
    if (slider) slider.value = val;
    if (scrubValText) {
      let label = 'EXPLODED MATRIX';
      if (val === 1) label = 'ASSEMBLED HERO';
      else if (val <= 75) label = 'SCREWS & EXTERNAL SHELL';
      else if (val <= 180) label = 'CORE PCB & MOTORS';
      scrubValText.innerText = `FRAME ${String(val).padStart(3, '0')} // ${label}`;
    }
    this.drawScrubberFrame(val);
    this.playAudioBlip('tick');
  }

  /* -----------------------------------------------------------------
     WEB AUDIO API SOUND SYNTHESIS
     ----------------------------------------------------------------- */
  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleSound() {
    this.initAudioContext();
    this.soundEnabled = !this.soundEnabled;
    const btn = document.getElementById('audio-toggle-btn');
    const label = btn ? btn.querySelector('.audio-btn-label') : null;

    if (this.soundEnabled) {
      if (btn) btn.classList.add('active');
      if (label) label.innerText = 'AUDIO: ON';
      this.playPowerOnChord();
    } else {
      if (btn) btn.classList.remove('active');
      if (label) label.innerText = 'AUDIO: OFF';
    }
  }

  playAudioBlip(type = 'click') {
    if (!this.soundEnabled || !this.audioCtx) return;
    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
      } else if (type === 'tick') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, t);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
        osc.start(t);
        osc.stop(t + 0.02);
      } else if (type === 'chime') {
        // Multi-tone luxury checkout chime
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const o = this.audioCtx.createOscillator();
          const g = this.audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, t + idx * 0.08);
          g.gain.setValueAtTime(0.15, t + idx * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.4);
          o.connect(g);
          g.connect(this.audioCtx.destination);
          o.start(t + idx * 0.08);
          o.stop(t + idx * 0.08 + 0.45);
        });
      }
    } catch (e) {
      console.warn('Audio synthesis note:', e);
    }
  }

  playPowerOnChord() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    [220, 440, 880].forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + idx * 0.06 + 0.3);
      gain.gain.setValueAtTime(0.1, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.4);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.45);
    });
  }

  /* -----------------------------------------------------------------
     FINISH & ACCENT CUSTOMIZER
     ----------------------------------------------------------------- */
  switchEdition(edition, el) {
    document.querySelectorAll('.edition-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');

    const cyanGlow = document.querySelector('.glow-cyan');
    const violetGlow = document.querySelector('.glow-violet');

    if (edition === 'onyx') {
      if (cyanGlow) cyanGlow.style.background = 'radial-gradient(circle, #00F0FF 0%, transparent 70%)';
      if (violetGlow) violetGlow.style.background = 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)';
    } else if (edition === 'violet') {
      if (cyanGlow) cyanGlow.style.background = 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)';
      if (violetGlow) violetGlow.style.background = 'radial-gradient(circle, #EC4899 0%, transparent 70%)';
    } else if (edition === 'frost') {
      if (cyanGlow) cyanGlow.style.background = 'radial-gradient(circle, #10B981 0%, transparent 70%)';
      if (violetGlow) violetGlow.style.background = 'radial-gradient(circle, #06B6D4 0%, transparent 70%)';
    }

    this.playAudioBlip('click');
    this.showToast(`SIGNATURE FINISH UPDATED: ${edition.toUpperCase()}`);
  }

  /* -----------------------------------------------------------------
     SHOPPING CART & CHECKOUT
     ----------------------------------------------------------------- */
  handleAddToCart(event, customItem = null) {
    if (event) event.preventDefault();
    this.playAudioBlip('chime');

    const itemToAdd = customItem || {
      id: 'aether-pro-onyx',
      name: 'Aether Pro // Wireless Controller',
      edition: 'Onyx Stealth',
      price: 199.00,
      qty: 1,
      img: './hero_images/ezgif-frame-001.jpg'
    };

    const existing = this.cart.find(item => item.id === itemToAdd.id);
    if (existing) {
      existing.qty++;
    } else {
      this.cart.push(itemToAdd);
    }

    this.renderCart();
    this.bumpCartBadge();
    this.showToast(`ADDED: ${itemToAdd.name}`);
    this.openCart();
  }

  renderCart() {
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total-price');
    const badgeEl = document.getElementById('cart-count-badge');

    if (!container) return;

    let total = 0;
    let totalCount = 0;

    container.innerHTML = this.cart.map(item => {
      total += item.price * item.qty;
      totalCount += item.qty;
      return `
        <div class="cart-item">
          <img src="${item.img}" alt="${item.name}" class="cart-item-thumb">
          <div class="cart-item-details">
            <div>
              <div class="cart-item-name">${item.name}</div>
              <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
            </div>
            <div class="cart-item-qty">
              <button class="qty-btn" onclick="window.AetherApp.updateQty('${item.id}', -1)">-</button>
              <span class="qty-val">${item.qty}</span>
              <button class="qty-btn" onclick="window.AetherApp.updateQty('${item.id}', 1)">+</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (subtotalEl) subtotalEl.innerText = `$${total.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `$${total.toFixed(2)} USD`;
    if (badgeEl) badgeEl.innerText = totalCount;
  }

  updateQty(id, delta) {
    const item = this.cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      this.cart = this.cart.filter(i => i.id !== id);
    }
    this.renderCart();
    this.playAudioBlip('tick');
  }

  addUpsell() {
    this.handleAddToCart(null, {
      id: 'quick-dock',
      name: 'Aether Magnetic Quick-Dock',
      price: 39.00,
      qty: 1,
      img: './hero_images/ezgif-frame-001.jpg'
    });
  }

  bumpCartBadge() {
    const badge = document.getElementById('cart-count-badge');
    if (badge) {
      badge.classList.remove('bump');
      void badge.offsetWidth;
      badge.classList.add('bump');
    }
  }

  openCart() {
    this.renderCart();
    const drawer = document.getElementById('cart-drawer');
    if (drawer) drawer.classList.add('open');
    this.playAudioBlip('click');
  }

  closeCart() {
    const drawer = document.getElementById('cart-drawer');
    if (drawer) drawer.classList.remove('open');
    this.playAudioBlip('click');
  }

  handleCheckout() {
    this.playAudioBlip('chime');
    alert('Connecting to 256-bit Secure Checkout Gateway...\nOrder Ready for Instant Dispatch.');
  }

  /* -----------------------------------------------------------------
     MODALS (SPECS & SEARCH)
     ----------------------------------------------------------------- */
  openSpecsModal() {
    const modal = document.getElementById('specs-modal');
    if (modal) modal.classList.add('open');
    this.playAudioBlip('click');
  }

  closeSpecsModal() {
    const modal = document.getElementById('specs-modal');
    if (modal) modal.classList.remove('open');
    this.playAudioBlip('click');
  }

  openSearch() {
    const modal = document.getElementById('search-modal');
    if (modal) {
      modal.classList.add('open');
      const input = document.getElementById('search-input');
      if (input) setTimeout(() => input.focus(), 100);
    }
    this.playAudioBlip('click');
  }

  closeSearch() {
    const modal = document.getElementById('search-modal');
    if (modal) modal.classList.remove('open');
    this.playAudioBlip('click');
  }

  quickSearch(term) {
    const input = document.getElementById('search-input');
    if (input) input.value = term;
    this.playAudioBlip('click');
  }

  showToast(message) {
    const toast = document.getElementById('toast-notify');
    const toastDesc = document.getElementById('toast-desc');
    if (!toast) return;

    if (toastDesc) toastDesc.innerText = message;
    toast.classList.add('active');

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('active');
    }, 3200);
  }

  /* -----------------------------------------------------------------
     GLOBAL EVENT LISTENERS
     ----------------------------------------------------------------- */
  setupEventListeners() {
    // Scroll listener for sticky canvas & HUD
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });

    // Audio button
    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) audioBtn.addEventListener('click', () => this.toggleSound());

    // Cart open button
    const cartBtn = document.getElementById('cart-open-btn');
    if (cartBtn) cartBtn.addEventListener('click', () => this.openCart());

    // Search open button
    const searchBtn = document.getElementById('search-open-btn');
    if (searchBtn) searchBtn.addEventListener('click', () => this.openSearch());

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-nav-drawer');
    if (mobileBtn && mobileDrawer) {
      mobileBtn.addEventListener('click', () => {
        mobileDrawer.classList.toggle('open');
        this.playAudioBlip('click');
      });
    }

    // Close drawer when clicking link
    document.querySelectorAll('.mobile-nav-item').forEach(link => {
      link.addEventListener('click', () => {
        if (mobileDrawer) mobileDrawer.classList.remove('open');
      });
    });

    // Scrubber range input
    const scrubber = document.getElementById('frame-scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        this.seekScrubber(parseInt(e.target.value, 10));
      });
    }

    // Keyboard ESC to close any modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSpecsModal();
        this.closeCart();
        this.closeSearch();
      }
    });

    // Subtle audio hover sounds for interactive elements
    document.querySelectorAll('button, .nav-link, .edition-card').forEach(el => {
      el.addEventListener('mouseenter', () => {
        if (this.soundEnabled) this.playAudioBlip('tick');
      });
    });

    // Initial render call
    this.renderCart();
  }
}

// Instantiate and expose globally for inline HTML handlers
window.addEventListener('DOMContentLoaded', () => {
  window.AetherApp = new AetherEngine();
});
