/* Craftify - Created by Prathamesh Borkar, Sanika Chavan and Jidnyasa Gole
*/

(function () {
  const el = {
    app: document.getElementById('app'),
    year: document.getElementById('year'),
    authCta: document.getElementById('auth-cta'),
    cartCount: document.getElementById('cart-count'),
    toast: document.getElementById('toast')
  };

  const routes = {
    home: '#/',
    market: '#/market',
    artist: '#/artist',
    cart: '#/cart',
    checkout: '#/checkout',
    invoice: '#/invoice',
    profile: '#/profile',
    booking: '#/booking'
  };

  const storageKeys = {
    users: 'craftify.users',
    session: 'craftify.session',
    listings: 'craftify.listings',
    carts: 'craftify.carts',
    orders: 'craftify.orders',
    version: 'craftify.version'
  };

  const roleLabels = { artist: 'Artist', user: 'User' };

  const utils = {
    read(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    write(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
    id(prefix) { return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`; },
    currency(n) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0)); },
    sum(arr, pick = x => x) { return arr.reduce((t, x) => t + Number(pick(x) || 0), 0); },
    toast(msg) {
      el.toast.textContent = msg; el.toast.classList.add('show');
      setTimeout(() => el.toast.classList.remove('show'), 1800);
    },
    setPageTitle(title) { document.title = title ? `Craftify — ${title}` : 'Craftify — Handcrafted Art Marketplace'; }
  };

  const db = {
    get users() { return utils.read(storageKeys.users, []); },
    set users(v) { utils.write(storageKeys.users, v); },
    get session() { return utils.read(storageKeys.session, null); },
    set session(v) { utils.write(storageKeys.session, v); },
    get listings() { return utils.read(storageKeys.listings, []); },
    set listings(v) { utils.write(storageKeys.listings, v); },
    get carts() { return utils.read(storageKeys.carts, {}); },
    set carts(v) { utils.write(storageKeys.carts, v); },
    get orders() { return utils.read(storageKeys.orders, []); },
    set orders(v) { utils.write(storageKeys.orders, v); },
    get version() { return utils.read(storageKeys.version, '1'); },
    set version(v) { utils.write(storageKeys.version, v); }
  };

  function seedIfEmpty() {
    if (db.listings.length === 0) {
      const demoArtistId = utils.id('usr');
      const demoArtist = { id: demoArtistId, email: 'artist@craftify.demo', password: 'craftify', role: 'artist', profile: { name: 'Demo Artisan', bio: 'Handmade ceramics & woodworks', avatar: '' } };
      db.users = [...db.users, demoArtist];
      const samples = [
        { title: 'Madhubani Paintings', price: 3500, img: 'https://www.rudhigat.com/pub/media/wysiwyg/download-19.jpg', desc: 'Traditional Mithila folk art with intricate motifs.', region: 'Bihar' },
        { title: 'Jaipur Blue Pottery', price: 1800, img: 'https://www.rudhigat.com/pub/media/wysiwyg/3_1.png', desc: 'Iconic blue pottery from Jaipur artisans.', region: 'Jaipur' },
        { title: 'Wood Carving', price: 4200, img: 'https://www.rudhigat.com/pub/media/wysiwyg/3.jpg', desc: 'Hand-carved wooden decor with rich detailing.', region: 'Uttar Pradesh' },
        { title: 'Terracotta Pottery', price: 1600, img: 'https://www.rudhigat.com/pub/media/wysiwyg/img2-top-gicor1.jpg', desc: 'Earthy terracotta pottery fired with care.', region: 'West Bengal' }
      ];
      const withPlaceholders = samples.map(s => ({
        id: utils.id('itm'), title: s.title, price: s.price, desc: s.desc,
        artistId: demoArtistId,
        img: s.img
      }));
      db.listings = withPlaceholders;
    }
  }

  function migrateToV2() {
    
    if (db.version === '2') return;
    const hadOldSamples = db.listings.some(x => (
      ['Walnut Serving Board','Stoneware Mug','Leather Journal','Terracotta Planter'].includes(x.title)
    ));
    if (hadOldSamples || db.listings.length === 0) {
      const demoArtist = db.users.find(u => u.email === 'artist@craftify.demo') || { id: utils.id('usr') };
      const samples = [
        { title: 'Madhubani Paintings', price: 3500, img: 'https://www.rudhigat.com/pub/media/wysiwyg/download-19.jpg', desc: 'Traditional Mithila folk art with intricate motifs.' },
        { title: 'Jaipur Blue Pottery', price: 1800, img: 'https://www.rudhigat.com/pub/media/wysiwyg/3_1.png', desc: 'Iconic blue pottery from Jaipur artisans.' },
        { title: 'Wood Carving', price: 4200, img: 'https://www.rudhigat.com/pub/media/wysiwyg/3.jpg', desc: 'Hand-carved wooden decor with rich detailing.' },
        { title: 'Terracotta Pottery', price: 1600, img: 'https://www.rudhigat.com/pub/media/wysiwyg/img2-top-gicor1.jpg', desc: 'Earthy terracotta pottery fired with care.' }
      ];
      db.listings = samples.map(s => ({ id: utils.id('itm'), title: s.title, price: s.price, desc: s.desc, img: s.img, region: s.region, artistId: demoArtist.id, createdAt: Date.now() }));
    }
    db.version = '2';
  }

  function normalizeListingRegions() {
    const mapTitleToRegion = [
      { key: 'madhubani', region: 'Bihar' },
      { key: 'blue pottery', region: 'Jaipur' },
      { key: 'wood', region: 'Uttar Pradesh', also: 'carving' },
      { key: 'terracotta', region: 'West Bengal' }
    ];
    const updated = db.listings.map(item => {
      if (item.region && String(item.region).trim()) return item;
      const t = `${item.title || ''} ${item.desc || ''}`.toLowerCase();
      const found = mapTitleToRegion.find(m => t.includes(m.key) && (!m.also || t.includes(m.also)));
      return { ...item, region: found ? found.region : 'Unknown' };
    });
    db.listings = updated;
  }

  function navUpdateActive() {
    const buttons = document.querySelectorAll('.nav-link');
    buttons.forEach(b => b.removeAttribute('aria-current'));
    const hash = location.hash || routes.home;
    const map = {
      [routes.home]: 'Home',
      [routes.market]: 'Products',
      [routes.artist]: 'Artist',
      [routes.cart]: 'Cart',
      [routes.checkout]: 'Cart',
      [routes.profile]: 'Profile',
      [routes.booking]: 'Booking'
    };
    const label = map[hash] || '';
    buttons.forEach(b => { if (b.textContent.startsWith(label)) b.setAttribute('aria-current', 'page'); });
  }

  function renderAuthCta() {
    const s = db.session;
    if (!s) {
      el.authCta.innerHTML = `
        <button class="btn secondary" data-link="#/login">Log in</button>
        <button class="btn" data-link="#/signup">Sign up</button>
      `;
      return;
    }
    const user = db.users.find(u => u.id === s.userId);
    const name = user?.profile?.name || user?.email || 'User';
    const avatar = user?.profile?.avatar;
    el.authCta.innerHTML = `
      ${avatar ? `<img class="avatar xs" src="${avatar}" alt="avatar" />` : ''}
      <span class="muted" title="${roleLabels[user.role]}">${name}</span>
      <button class="btn ghost" id="logout-btn">Logout</button>
    `;
    const btn = document.getElementById('logout-btn');
    btn?.addEventListener('click', () => { db.session = null; utils.toast('Logged out'); update(); });
  }

  function setCartCount() {
    const s = db.session; if (!s) { el.cartCount.textContent = '0'; return; }
    const carts = db.carts; const list = carts[s.userId] || [];
    const count = utils.sum(list, x => x.qty);
    el.cartCount.textContent = String(count);
  }

  function linkDelegation() {
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const link = t.getAttribute('data-link');
      if (link) { e.preventDefault(); location.hash = link; }
    });
  }

  function ensureFocus() { el.app?.focus(); }

  function route() {
    const hash = location.hash || routes.home;
    if (hash === '#/') return views.home();
    if (hash === routes.market) return views.market();
    if (hash === '#/login') return views.login();
    if (hash === '#/signup') return views.signup();
    if (hash === routes.artist) return views.artist();
    if (hash === routes.cart) return views.cart();
    if (hash === routes.checkout) return views.checkout();
    if (hash.startsWith(routes.invoice)) return views.invoice();
    if (hash === routes.profile) return views.profile();
    if (hash === routes.booking) return views.booking();
    return views.market();
  }

  const views = {
    home() {
      utils.setPageTitle('Home');
      el.app.innerHTML = `
        <section class="hero">
          <div>
            <h1 class="title">Craftify — Where Handmade Finds a Home</h1>
            <p class="subtitle muted">Discover unique pieces from independent artists or start selling your own craft.</p>
            <div style="display:flex; gap:10px; margin-top:10px">
              <button class="btn" data-link="#/market">Browse Products</button>
              <button class="btn secondary" data-link="#/signup">Join Craftify</button>
            </div>
          </div>
          <div class="slideshow card" id="home-slideshow"></div>
        </section>

        <section>
          <h2 class="section-title">Why Craftify?</h2>
          <div class="grid cols-3">
            <div class="card"><div class="card-body"><strong>Authentic</strong><div class="muted">Original works from real artists.</div></div></div>
            <div class="card"><div class="card-body"><strong>Secure</strong><div class="muted">Simple checkout with clear invoices.</div></div></div>
            <div class="card"><div class="card-body"><strong>Fair</strong><div class="muted">Artists control pricing and profiles.</div></div></div>
          </div>
        </section>

        <section>
          <h2 class="section-title">Seller & Customer Reviews</h2>
          <div class="grid cols-2">
            <div class="card"><div class="card-body">
              <div class="muted" style="margin-bottom:8px">Seller Review</div>
              <div style="position:relative; padding-top:56.25%">
                <iframe style="position:absolute; inset:0; width:100%; height:100%" src="https://www.youtube.com/embed/HATyAC4Bkxg?si=rl3cx5_zbff4_6lV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
              </div>
            </div></div>
            <div class="card"><div class="card-body">
              <div class="muted" style="margin-bottom:8px">Customer Review</div>
              <div style="position:relative; padding-top:56.25%">
                <iframe style="position:absolute; inset:0; width:100%; height:100%" src="https://www.youtube.com/embed/-Eeg0HAYYIQ?si=0VA_WTQVq8H0I0EX" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
              </div>
            </div></div>
          </div>
        </section>

        <section>
          <h2 class="section-title">About Us</h2>
          <div class="card"><div class="card-body">
            <p>Craftify is built by passionate art lovers to connect artisans with patrons.</p>
            <div class="grid cols-3" style="margin-top:10px">
              <div>
                <strong>Prathamesh Borkar</strong>
                <div class="muted">Contact: 7977396830</div>
              </div>
              <div>
                <strong>Sanika Chavan</strong>
                <div class="muted">Contact: 9359933173</div>
              </div>
              <div>
                <strong>Jidnyasa Gole</strong>
                <div class="muted">Contact: 9664684685</div>
              </div>
            </div>
          </div></div>
        </section>
      `;
      
      const imgs = [
        'https://c.ndtvimg.com/2025-01/c907n72g_art-and-craft-villages-in-india_625x300_07_January_25.jpg?im=FeatureCrop,algorithm=dnn,width=545,height=307',
        'https://media.craftmaestros.com/media/magefan_blog/The_culture_of_Indian_craft.png',
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT5cEaLaowIWMVUioPNIOovoMxJGVFRIybQNA&s',
        'https://www.andbeyond.com/wp-content/uploads/sites/5/delhi-crafts-museum3.jpg'
      ];
      const slide = document.getElementById('home-slideshow');
      if (slide) {
        slide.innerHTML = imgs.map((src, i) => `<img src="${src}" alt="slide ${i+1}" class="${i===0?'active':''}" />`).join('');
        let idx = 0; const nodes = Array.from(slide.querySelectorAll('img'));
        setInterval(() => {
          nodes[idx].classList.remove('active');
          idx = (idx + 1) % nodes.length;
          nodes[idx].classList.add('active');
        }, 3000);
      }
      ensureFocus();
    },

    market() {
      utils.setPageTitle('Market');
      const listings = db.listings;
      el.app.innerHTML = `
        <section class="hero">
          <div>
            <h1 class="title">Discover and Collect Handcrafted Art</h1>
            <p class="subtitle muted">A curated marketplace where artists share their creations with the world.</p>
            <div style="display:flex; gap:10px; margin-top:10px">
              <button class="btn" data-link="#/market">Explore Market</button>
              <button class="btn secondary" data-link="#/artist">Sell as Artist</button>
            </div>
          </div>
          <div class="art card"></div>
        </section>

        <div class="toolbar">
          <input class="search" id="search" placeholder="Search artworks, materials, styles, regions..." />
          <select id="city">
            <option value="">All regions</option>
            <option value="Bihar">Bihar</option>
            <option value="Jaipur">Jaipur</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="West Bengal">West Bengal</option>
          </select>
          <select id="sort">
            <option value="recent">Sort: Recent</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        <section class="product-grid" id="product-grid"></section>
      `;

      const grid = document.getElementById('product-grid');
      const qEl = document.getElementById('search');
      const sortEl = document.getElementById('sort');
      const cityEl = document.getElementById('city');

      function renderGrid() {
        const q = qEl.value.toLowerCase().trim();
        let items = [...db.listings];
        if (q) items = items.filter(x => `${x.title} ${x.desc} ${x.region || ''}`.toLowerCase().includes(q));
        const city = cityEl.value;
        if (city) items = items.filter(x => (x.region || '').toLowerCase() === city.toLowerCase());
        const sort = sortEl.value;
        if (sort === 'price-asc') items.sort((a,b)=>a.price-b.price);
        if (sort === 'price-desc') items.sort((a,b)=>b.price-a.price);
        if (sort === 'recent') items.sort((a,b)=> (a.createdAt || 0) < (b.createdAt || 0) ? 1 : -1);
        grid.innerHTML = items.map(item => `
          <article class="card product-card" aria-label="${item.title}">
            <img src="${item.img}" alt="${item.title}" />
            <div class="card-body">
              <div class="title">${item.title}</div>
              <div class="muted" style="min-height:40px">${item.desc ?? ''}</div>
              <div class="toolbar">
                <div class="price">${utils.currency(item.price)}</div>
                <button class="btn add-to-cart" data-id="${item.id}">Add to cart</button>
              </div>
              ${item.region ? `<div class="muted" style="margin-top:6px">Region: ${item.region}</div>` : ''}
            </div>
          </article>
        `).join('');
        grid.querySelectorAll('.add-to-cart').forEach(btn => btn.addEventListener('click', onAddToCart));
      }

      function onAddToCart(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const s = db.session;
        if (!s) { location.hash = '#/login'; return; }
        const carts = db.carts;
        const list = carts[s.userId] || [];
        const found = list.find(x => x.itemId === id);
        if (found) found.qty += 1; else list.push({ itemId: id, qty: 1 });
        carts[s.userId] = list; db.carts = carts;
        setCartCount(); utils.toast('Added to cart');
      }

      qEl.addEventListener('input', renderGrid);
      sortEl.addEventListener('change', renderGrid);
      cityEl.addEventListener('change', renderGrid);
      renderGrid();
      ensureFocus();
    },

    login() {
      utils.setPageTitle('Log in');
      el.app.innerHTML = `
        <section class="card">
          <div class="card-body">
            <h2 class="section-title">Welcome back</h2>
            <form id="login-form">
              <label>Email</label>
              <input type="email" name="email" required placeholder="you@craftify.com" />
              <label>Password</label>
              <input type="password" name="password" required placeholder="••••••••" />
              <div style="display:flex; gap:10px; margin-top:12px">
                <button class="btn" type="submit">Log in</button>
                <button class="btn secondary" type="button" data-link="#/signup">Create account</button>
              </div>
            </form>
          </div>
        </section>
      `;
      const form = document.getElementById('login-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const email = String(fd.get('email')).toLowerCase();
        const password = String(fd.get('password'));
        const user = db.users.find(u => u.email.toLowerCase() === email && u.password === password);
        if (!user) { utils.toast('Invalid credentials'); return; }
        db.session = { userId: user.id, role: user.role };
        utils.toast('Logged in'); update(); location.hash = routes.market;
      });
      ensureFocus();
    },

    signup() {
      utils.setPageTitle('Sign up');
      el.app.innerHTML = `
        <section class="card">
          <div class="card-body">
            <h2 class="section-title">Create your account</h2>
              <form id="signup-form">
              <div class="row">
                <div>
                  <label>Role</label>
                  <select name="role" required>
                    <option value="user">User (buy art)</option>
                    <option value="artist">Artist (sell art)</option>
                  </select>
                </div>
                <div>
                  <label>Email</label>
                  <input type="email" name="email" required placeholder="you@craftify.com" />
                </div>
              </div>
              <label>Password</label>
              <input type="password" name="password" required minlength="4" placeholder="••••" />
              <div class="row">
                <div>
                  <label>Display name</label>
                  <input type="text" name="name" placeholder="Your public name" />
                </div>
                <div>
                  <label>Bio</label>
                  <input type="text" name="bio" placeholder="Tell us about you" />
                </div>
              </div>
              <label>Profile photo</label>
              <input type="file" name="avatar" accept="image/*" />
              <div style="display:flex; gap:10px; margin-top:12px">
                <button class="btn" type="submit">Create account</button>
                <button class="btn secondary" type="button" data-link="#/login">I have an account</button>
              </div>
            </form>
          </div>
        </section>
      `;
      const form = document.getElementById('signup-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const role = String(fd.get('role'));
        const email = String(fd.get('email')).toLowerCase();
        const password = String(fd.get('password'));
        const name = String(fd.get('name')) || 'New Member';
        const bio = String(fd.get('bio')) || '';
        const avatarFile = form.querySelector('input[name="avatar"]').files?.[0];
        let avatar = '';
        if (avatarFile) avatar = await fileToDataUrl(avatarFile);
        if (db.users.some(u => u.email.toLowerCase() === email)) { utils.toast('Email already registered'); return; }
        const user = { id: utils.id('usr'), email, password, role, profile: { name, bio, avatar } };
        db.users = [...db.users, user];
        db.session = { userId: user.id, role: user.role };
        utils.toast('Account created'); update(); location.hash = role === 'artist' ? routes.artist : routes.market;
      });
      ensureFocus();
    },

    artist() {
      const s = db.session; if (!s) { location.hash = '#/login'; return; }
      if (s.role !== 'artist') { utils.toast('Artist area only'); location.hash = routes.market; return; }
      utils.setPageTitle('Artist Dashboard');
      const user = db.users.find(u => u.id === s.userId);
      const myItems = db.listings.filter(x => x.artistId === s.userId);
      el.app.innerHTML = `
        <section class="grid cols-2">
          <div class="card">
            <div class="card-body">
              <h2 class="section-title">Your Profile</h2>
              <form id="profile-form">
                <label>Display name</label>
                <input name="name" value="${user.profile?.name || ''}" placeholder="Your public name" />
                <label>Bio</label>
                <textarea name="bio" rows="3" placeholder="About your craft">${user.profile?.bio || ''}</textarea>
                <div style="margin-top:10px; display:flex; gap:8px">
                  <button class="btn" type="submit">Save profile</button>
                </div>
              </form>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <h2 class="section-title">Add Listing</h2>
              <form id="listing-form">
                <div class="row">
                  <div>
                    <label>Title</label>
                    <input name="title" required placeholder="e.g., Oak Coffee Table" />
                  </div>
                <div>
                  <label>Price (INR)</label>
                  <input name="price" type="number" required min="1" step="1" />
                </div>
                </div>
                <label>Region / City</label>
                <input name="region" placeholder="e.g., Jaipur" />
                <label>Description</label>
                <textarea name="desc" rows="3" placeholder="Describe materials, process, and size"></textarea>
                <label>Photo</label>
                <input name="img" type="file" accept="image/*" />
                <div style="margin-top:10px; display:flex; gap:8px">
                  <button class="btn" type="submit">Publish</button>
                  <button class="btn secondary" type="reset">Reset</button>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section>
          <h2 class="section-title">Your Listings</h2>
          <div class="product-grid" id="my-grid"></div>
        </section>
      `;

      const profileForm = document.getElementById('profile-form');
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(profileForm);
        user.profile = { ...user.profile, name: String(fd.get('name')), bio: String(fd.get('bio')) };
        db.users = db.users.map(u => u.id === user.id ? user : u);
        utils.toast('Profile saved'); renderMine();
      });

      const listingForm = document.getElementById('listing-form');
      listingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(listingForm);
        const title = String(fd.get('title')).trim();
        const price = Number(fd.get('price'));
        const desc = String(fd.get('desc'));
        const region = String(fd.get('region') || '');
        const file = listingForm.querySelector('input[name="img"]').files?.[0];
        let img = '';
        if (file) img = await fileToDataUrl(file);
        const item = { id: utils.id('itm'), title, price, desc, region, img, artistId: s.userId, createdAt: Date.now() };
        db.listings = [item, ...db.listings];
        utils.toast('Listing published'); listingForm.reset(); renderMine();
      });

      function renderMine() {
        const grid = document.getElementById('my-grid');
        const mine = db.listings.filter(x => x.artistId === s.userId);
        grid.innerHTML = mine.map(item => `
          <article class="card product-card">
            <img src="${item.img}" alt="${item.title}" />
            <div class="card-body">
              <div class="title">${item.title}</div>
              <div class="muted">${utils.currency(item.price)}</div>
              <div class="toolbar">
                <button class="btn secondary edit" data-id="${item.id}">Edit</button>
                <button class="btn ghost delete" data-id="${item.id}">Delete</button>
              </div>
            </div>
          </article>
        `).join('');
        grid.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', onDelete));
        grid.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', onEdit));
      }

      function onDelete(e) {
        const id = e.currentTarget.getAttribute('data-id');
        db.listings = db.listings.filter(x => x.id !== id);
        utils.toast('Listing removed'); renderMine();
      }

      function onEdit(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const item = db.listings.find(x => x.id === id);
        const title = prompt('Update title', item.title); if (title == null) return;
        const priceStr = prompt('Update price', String(item.price)); if (priceStr == null) return;
        const desc = prompt('Update description', item.desc || '') ?? '';
        const price = Number(priceStr);
        db.listings = db.listings.map(x => x.id === id ? { ...x, title, price, desc } : x);
        utils.toast('Listing updated'); renderMine();
      }

      renderMine(); ensureFocus();
    },

    profile() {
      const s = db.session; if (!s) { location.hash = '#/login'; return; }
      utils.setPageTitle('Profile');
      const user = db.users.find(u => u.id === s.userId);
      el.app.innerHTML = `
        <section class="card">
          <div class="card-body" id="profile-view">
            <h2 class="section-title">Your Profile</h2>
            <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; margin-top:6px">
              ${user.profile?.avatar ? `<img class=\"avatar lg\" src=\"${user.profile.avatar}\" alt=\"avatar\" />` : '<div class=\"avatar lg\"></div>'}
              <div style="font-weight:700; font-size:20px">${user.profile?.name || '—'}</div>
              <div class="muted">${user.email}</div>
              <p style="margin:6px 0 0">${user.profile?.bio || ''}</p>
              <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap; justify-content:center">
                <button class="btn" id="edit-profile">Edit profile</button>
                ${s.role === 'artist' ? '<button class="btn secondary" type="button" data-link="#/artist">Artist dashboard</button>' : ''}
              </div>
            </div>
          </div>
        </section>
      `;

      function openEditForm() {
        const current = db.users.find(u => u.id === s.userId);
        el.app.innerHTML = `
          <section class="card">
            <div class="card-body">
              <h2 class="section-title">Edit Profile</h2>
              <form id="edit-form">
                <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; margin-bottom:12px">
                  ${current.profile?.avatar ? `<img class=\"avatar lg\" src=\"${current.profile.avatar}\" alt=\"avatar\" />` : '<div class=\"avatar lg\"></div>'}
                  <input type="file" name="avatar" accept="image/*" />
                </div>
                <label>Display name</label>
                <input name="name" value="${current.profile?.name || ''}" />
                <label>Email</label>
                <input type="email" name="email" value="${current.email}" />
                <label>Bio</label>
                <textarea name="bio" rows="3">${current.profile?.bio || ''}</textarea>
                <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap">
                  <button class="btn" type="submit">Save changes</button>
                  <button class="btn secondary" type="button" id="cancel-edit">Cancel</button>
                </div>
              </form>
            </div>
          </section>
        `;
        document.getElementById('cancel-edit').addEventListener('click', () => views.profile());
        const form = document.getElementById('edit-form');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const nextName = String(fd.get('name')).trim();
          const nextEmail = String(fd.get('email')).toLowerCase().trim();
          const nextBio = String(fd.get('bio'));
          const file = form.querySelector('input[name="avatar"]').files?.[0];
          let nextAvatar = current.profile?.avatar || '';
          if (file) nextAvatar = await fileToDataUrl(file);
          if (nextEmail !== current.email && db.users.some(u => u.email.toLowerCase() === nextEmail)) {
            utils.toast('Email already registered'); return;
          }
          const updated = { ...current, email: nextEmail, profile: { ...current.profile, name: nextName, bio: nextBio, avatar: nextAvatar } };
          db.users = db.users.map(u => u.id === current.id ? updated : u);
          utils.toast('Profile updated'); views.profile();
        });
      }

      document.getElementById('edit-profile').addEventListener('click', openEditForm);
      ensureFocus();
    },

    booking() {
      const s = db.session; if (!s) { location.hash = '#/login'; return; }
      utils.setPageTitle('Bookings');
      const myOrders = db.orders.filter(o => o.userId === s.userId);
      el.app.innerHTML = `
        <section class="card">
          <div class="card-body">
            <div class="toolbar">
              <h2 class="section-title" style="margin:0">Your Bookings</h2>
              <button class="btn secondary" data-link="#/market">Continue shopping</button>
            </div>
            <div class="list" id="orders-list"></div>
          </div>
        </section>
      `;

      const wrap = document.getElementById('orders-list');
      if (!myOrders.length) {
        wrap.innerHTML = '<div class="muted">No bookings yet. Place an order to see it here.</div>';
      } else {
        wrap.innerHTML = myOrders.map(o => `
          <button class="list-item" data-link="${routes.invoice}?id=${o.id}" style="text-align:left; background:none; border:none; padding:0;">
            <img src="${o.items[0]?.item?.img || ''}" alt="order" />
            <div>
              <div style="font-weight:700">Invoice ${o.id.toUpperCase()}</div>
              <div class="muted">${new Date(o.createdAt).toLocaleString()} — ${o.items.length} item(s) — ${o.status || 'Arriving soon'}</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center">
              <div class="price">${utils.currency(o.total)}</div>
              <span class="muted">Arriving soon</span>
            </div>
          </button>
        `).join('');
      }
      ensureFocus();
    },

    cart() {
      const s = db.session; if (!s) { location.hash = '#/login'; return; }
      utils.setPageTitle('Cart');
      const carts = db.carts; const items = carts[s.userId] || [];
      const detailed = items.map(row => ({ ...row, item: db.listings.find(x => x.id === row.itemId) })).filter(x => x.item);
      const total = utils.sum(detailed, x => x.item.price * x.qty);
      el.app.innerHTML = `
        <section class="card">
          <div class="card-body">
            <h2 class="section-title">Your Cart</h2>
            <div class="list" id="cart-list"></div>
            <div class="toolbar" style="margin-top:12px">
              <div class="muted">Subtotal</div>
              <div class="price">${utils.currency(total)}</div>
            </div>
            <div style="display:flex; gap:10px; margin-top:12px">
              <button class="btn" data-link="#/checkout" ${detailed.length ? '' : 'disabled'}>Proceed to checkout</button>
              <button class="btn secondary" id="clear-cart" ${detailed.length ? '' : 'disabled'}>Clear cart</button>
            </div>
          </div>
        </section>
      `;

      function renderList() {
        const wrap = document.getElementById('cart-list');
        const rows = (db.carts[s.userId] || []).map(row => ({ ...row, item: db.listings.find(x => x.id === row.itemId) })).filter(x => x.item);
        wrap.innerHTML = rows.map(r => `
          <div class="list-item">
            <img src="${r.item.img}" alt="${r.item.title}" />
            <div>
              <div style="font-weight:700">${r.item.title}</div>
              <div class="muted">${utils.currency(r.item.price)}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px">
              <button class="btn ghost qty-dec" data-id="${r.itemId}">−</button>
              <span>${r.qty}</span>
              <button class="btn ghost qty-inc" data-id="${r.itemId}">+</button>
              <button class="btn secondary remove" data-id="${r.itemId}">Remove</button>
            </div>
          </div>
        `).join('');
        wrap.querySelectorAll('.qty-inc').forEach(b=>b.addEventListener('click', qtyInc));
        wrap.querySelectorAll('.qty-dec').forEach(b=>b.addEventListener('click', qtyDec));
        wrap.querySelectorAll('.remove').forEach(b=>b.addEventListener('click', remove));
      }

      function qtyInc(e) { const id = e.currentTarget.getAttribute('data-id'); changeQty(id, +1); }
      function qtyDec(e) { const id = e.currentTarget.getAttribute('data-id'); changeQty(id, -1); }
      function remove(e) { const id = e.currentTarget.getAttribute('data-id'); changeQty(id, -Infinity); }
      function changeQty(id, delta) {
        const carts = db.carts; const list = carts[s.userId] || [];
        const row = list.find(x => x.itemId === id); if (!row) return;
        if (delta === -Infinity) { carts[s.userId] = list.filter(x => x.itemId !== id); }
        else { row.qty = Math.max(0, row.qty + delta); carts[s.userId] = list.filter(x => x.qty > 0); }
        db.carts = carts; setCartCount(); views.cart();
      }

      document.getElementById('clear-cart')?.addEventListener('click', () => {
        const carts = db.carts; carts[s.userId] = []; db.carts = carts; setCartCount(); views.cart();
      });

      renderList(); ensureFocus();
    },

    checkout() {
      const s = db.session; if (!s) { location.hash = '#/login'; return; }
      const detailed = (db.carts[s.userId] || []).map(row => ({ ...row, item: db.listings.find(x => x.id === row.itemId) })).filter(x => x.item);
      if (!detailed.length) { utils.toast('Your cart is empty'); location.hash = routes.cart; return; }
      const total = utils.sum(detailed, x => x.item.price * x.qty);
      utils.setPageTitle('Checkout');
      el.app.innerHTML = `
        <section class="grid cols-2">
          <div class="card">
            <div class="card-body">
              <h2 class="section-title">Delivery address</h2>
              <form id="address-form">
                <div class="row">
                  <div>
                    <label>Full name</label>
                    <input name="fullName" required placeholder="Recipient name" />
                  </div>
                  <div>
                    <label>Phone (+91)</label>
                    <input name="phone" required placeholder="+91 98765 43210" />
                  </div>
                </div>
                <label>Street address</label>
                <input name="street" required placeholder="123 Artisan Ave" />
                <div class="row">
                  <div>
                    <label>City</label>
                    <input name="city" required />
                  </div>
                  <div>
                    <label>State/Province</label>
                    <input name="state" required />
                  </div>
                </div>
                <div class="row">
                  <div>
                    <label>Postal code</label>
                    <input name="zip" required />
                  </div>
                  <div>
                    <label>Country</label>
                    <input name="country" required />
                  </div>
                </div>
                <h2 class="section-title" style="margin-top:14px">Payment</h2>
                <div class="row">
                  <div>
                    <label>Method</label>
                    <select name="paymentMethod" id="payment-method" required>
                      <option value="cod">Cash on Delivery</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                  <div id="upi-wrap" style="display:none">
                    <label>UPI ID</label>
                    <input name="upiId" id="upi-id" placeholder="name@bank" />
                  </div>
                </div>
                <div id="upi-timer" class="muted" style="display:none; margin-top:8px"></div>
                <div style="margin-top:10px">
                  <button class="btn" type="submit" id="place-order">Place order</button>
                </div>
              </form>
            </div>
          </div>

          <div class="card">
            <div class="card-body">
              <h2 class="section-title">Order summary</h2>
              <div class="list">
                ${detailed.map(r => `
                  <div class="list-item">
                    <img src="${r.item.img}" alt="${r.item.title}" />
                    <div>
                      <div style="font-weight:700">${r.item.title}</div>
                      <div class="muted">Qty ${r.qty}</div>
                    </div>
                    <div class="price">${utils.currency(r.item.price * r.qty)}</div>
                  </div>
                `).join('')}
              </div>
              <div class="toolbar" style="margin-top:12px">
                <div class="muted">Total</div>
                <div class="price">${utils.currency(total)}</div>
              </div>
            </div>
          </div>
        </section>
      `;

      const addressForm = document.getElementById('address-form');
      const methodEl = document.getElementById('payment-method');
      const upiWrap = document.getElementById('upi-wrap');
      const upiIdEl = document.getElementById('upi-id');
      const upiTimer = document.getElementById('upi-timer');

      methodEl.addEventListener('change', () => {
        const isUpi = methodEl.value === 'upi';
        upiWrap.style.display = isUpi ? 'block' : 'none';
        upiTimer.style.display = 'none';
      });

      addressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(addressForm);
        const address = Object.fromEntries(fd.entries());
        const method = String(fd.get('paymentMethod'));
        if (method === 'upi') {
          const upiId = String(fd.get('upiId') || '').trim();
          if (!upiId) { utils.toast('Enter UPI ID'); return; }
          let remaining = 10;
          upiTimer.style.display = 'block';
          upiTimer.textContent = `Open your UPI app to pay… ${remaining}s`;
          const interval = setInterval(() => {
            remaining -= 1;
            upiTimer.textContent = `Open your UPI app to pay… ${remaining}s`;
            if (remaining <= 0) {
              clearInterval(interval);
              placeOrder(address);
            }
          }, 1000);
          return;
        }
        placeOrder(address);
      });

      function placeOrder(address) {
        const order = {
          id: utils.id('ord'),
          userId: s.userId,
          items: detailed,
          total,
          address,
          createdAt: Date.now(),
          status: 'Arriving soon'
        };
        db.orders = [order, ...db.orders];
        const carts = db.carts; carts[s.userId] = []; db.carts = carts; setCartCount();
        utils.toast('Order placed');
        location.hash = `${routes.invoice}?id=${order.id}`;
      }

      ensureFocus();
    },

    invoice() {
      const params = new URLSearchParams((location.hash.split('?')[1]) || '');
      const id = params.get('id');
      const order = db.orders.find(o => o.id === id) || db.orders[0];
      if (!order) { utils.toast('No invoice available'); location.hash = routes.market; return; }
      const date = new Date(order.createdAt);
      utils.setPageTitle('Invoice');
      el.app.innerHTML = `
        <section class="card" id="invoice">
          <div class="card-body">
            <div class="invoice-header">
              <div class="brand">
                <span class="brand-mark">C</span>
                <span class="brand-name">Craftify</span>
              </div>
              <div class="invoice-meta">
                <div><strong>Invoice #</strong> ${order.id.toUpperCase()}</div>
                <div><strong>Date</strong> ${date.toLocaleDateString()}</div>
              </div>
            </div>
            <div class="invoice-addresses">
              <div>
                <div class="muted">Billed to</div>
                <div style="font-weight:700">${order.address.fullName}</div>
                <div>${order.address.street}</div>
                <div>${order.address.city}, ${order.address.state} ${order.address.zip}</div>
                <div>${order.address.country}</div>
                <div class="muted" style="margin-top:6px">Phone: ${order.address.phone}</div>
              </div>
            </div>
            <div class="invoice-lines">
              <div class="invoice-line head">
                <div>Item</div>
                <div>Qty</div>
                <div>Price</div>
              </div>
              ${order.items.map(r => `
                <div class="invoice-line">
                  <div style="display:flex; align-items:center; gap:8px">
                    <img src="${r.item.img}" alt="${r.item.title}" style="width:40px; height:40px; border-radius:8px; object-fit:cover; border:1px solid rgba(255,255,255,0.08)" />
                    <span>${r.item.title}</span>
                  </div>
                  <div>${r.qty}</div>
                  <div class="price">${utils.currency(r.item.price * r.qty)}</div>
                </div>
              `).join('')}
            </div>
            <div class="invoice-totals">
              <div>Subtotal</div>
              <div class="price">${utils.currency(order.total)}</div>
            </div>
            <div class="invoice-actions">
              <button class="btn secondary" data-link="#/market">Back to market</button>
              <button class="btn" id="print">Print invoice</button>
              <button class="btn ghost" id="download-invoice">Download PDF</button>
            </div>
          </div>
        </section>
      `;
      document.getElementById('print').addEventListener('click', () => window.print());
      document.getElementById('download-invoice').addEventListener('click', () => { window.print(); });
      ensureFocus();
    }
  };

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function update() {
    renderAuthCta(); setCartCount(); navUpdateActive(); route();
  }

  function init() {
    el.year.textContent = String(new Date().getFullYear());
    seedIfEmpty();
    migrateToV2();
    normalizeListingRegions();
    linkDelegation();
    window.addEventListener('hashchange', () => { navUpdateActive(); route(); });
    update();
  }

  init();
})();



