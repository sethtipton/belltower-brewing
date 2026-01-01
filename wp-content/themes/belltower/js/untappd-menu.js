(function() {
	const EMBED_URL   = 'https://embed-menu-preloader.untappdapi.com/embed-menu-preloader.min.js';
	const STORAGE_KEY = 'btBeerData';
	const DEFAULT_LOCATION_ID = '38757';
	const DEFAULT_MENU_ID     = '150549';

	function formatBeerData(items, meta = {}) {
		if (!Array.isArray(items)) return null;

		const normalized = items.map((item) => ({
			name: item.name || '',
			category: item.category || item.style || '',
			style: item.style || item.category || '',
			abv: item.abv || '',
			ibu: item.ibu || '',
			description: item.description || '',
		}));

		const categories = Array.from(new Set(normalized.map((i) => i.category).filter(Boolean)));

		return {
			schemaVersion: 1,
			kind: meta.kind || 'beer',
			generatedAt: new Date().toISOString(),
			source: meta.sourceUrl || 'untappd-embed',
			counts: { items: normalized.length, categories: categories.length },
			categories,
			items: normalized,
		};
	}

	function slugify(name) {
		return (name || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	}

	function renderMenu(items) {
		const container = document.getElementById('bt-beer-menu');
		if (!container || !Array.isArray(items)) return;

		container.innerHTML = '';
		const grid = document.createElement('div');
		grid.classList.add('bt-beer-grid');

		items.forEach((item, index) => {
			const card = document.createElement('div');
			card.className = 'bt-beer-card';
			card.dataset.beerName = (item.name || '').toLowerCase();
			card.dataset.beerId = slugify(item.name || '');
			card.dataset.beerDescription = item.description || '';
			
			const leftCol = document.createElement('div');
			leftCol.className = 'bt-beer-left';
			
			const svgWrap = document.createElement('div');
			svgWrap.className = 'bt-beer-svg-wrap';
			
			svgWrap.innerHTML = `
			<?xml version="1.0" encoding="UTF-8" standalone="no"?>
			<svg
				id="Layer_1"
				class="bt-beer-svg
				data-name="Layer 1"
				viewBox="0 0 150 289"
				version="1.1"
				sodipodi:docname="pint_edited2.svg"
				inkscape:version="1.4.2 (ebf0e940, 2025-05-08)"
				width="150"
				height="289">
				<title
				id="title1">Belltower_Pint_SVG</title>
				<path
				class="cls-3"
				d="m 148.36522,51.427481 v 0 A 311.17331,358.46564 0 0 0 143.41276,15.397656 15.567666,17.93365 0 0 0 128.17104,1.2132609 H 22.286599 A 15.567666,17.93365 0 0 0 7.0594746,15.397656 311.17331,358.46564 0 0 0 2.1070116,51.427481 v 0 c -2.972451,32.000355 -2.75353068,72.373489 9.5887084,107.601899 14.808743,42.25616 12.162235,82.00722 7.506535,107.54025 a 15.567666,17.93365 0 0 0 15.217389,21.58203 h 81.613496 a 15.567666,17.93365 0 0 0 15.23684,-21.58203 c -4.66543,-25.53863 -7.29734,-65.28409 7.50653,-107.54025 12.34711,-35.22841 12.56117,-75.601544 9.58871,-107.601899 z M 19.241174,18.362317 A 3.074614,3.5418958 0 0 1 22.281736,15.56018 H 128.17104 a 3.074614,3.5418958 0 0 1 3.04056,2.802137 c 1.48867,8.109371 3.31787,19.614924 4.61193,33.065164 H 14.634117 C 15.92818,37.994059 17.752516,26.482897 19.246038,18.373518 Z M 127.24185,153.64929 c -15.92767,45.45059 -13.22279,88.09345 -8.14383,115.86819 a 2.977316,3.4298105 0 0 1 -0.61785,2.94784 3.0356948,3.4970617 0 0 1 -2.43245,1.32821 H 34.419644 a 3.0356948,3.4970617 0 0 1 -2.432448,-1.32821 2.9724511,3.4242063 0 0 1 -0.617837,-2.94784 C 36.443442,241.74274 39.153193,199.09988 23.220658,153.64929 14.891957,129.88719 11.578963,99.708226 13.490867,65.763191 H 136.94245 c 1.93136,33.950643 -1.38649,64.129609 -9.71519,87.886099 z"
				id="path3"/>
				<path
				class="cls-2"
				d="M 14.842943,51.127569 C 16.404623,41.589417 15.974926,36.1944 18.26691,24.458523 18.811681,16.7609 17.542537,14.854131 33.052199,15.526182 l 89.665441,-0.339974 c 3.99992,0.0079 7.45272,2.594623 8.29261,6.212547 2.29235,10.041445 3.92851,20.201559 4.89958,30.425118 z"
				id="path2"/>
				<path
				class="cls-1"
				d="m 46.023936,273.83874 c -9.568241,-0.32391 -17.178684,4.68439 -14.885319,-8.0508 4.497818,-26.54822 8.376416,-55.74707 -5.711064,-99.12045 C 16.941119,140.56907 9.4680997,103.13335 12.067637,65.740412 L 137.48096,65.060458 c 2.61739,37.392942 -1.03689,66.345952 -9.52333,92.427722 -14.08749,43.37894 -14.34058,74.27211 -9.84277,100.82032 3.76897,18.85473 0.29024,15.5463 -10.75361,16.89013 z"
				id="path1"/>
				<g
				class="cls-4"
				id="g4"
				style="display:inline"
				transform="matrix(0.48648955,0,0,0.56042656,-49.31007,1.2132609)">
				<path
					class="cls-5"
					d="M 396.12,25.31 A 32,32 0 0 0 364.82,0 h -64 a 32,32 0 0 1 31.3,25.31 c 12,56.59 27,166 -9.49,256.29 -30.44,75.4 -25,146.33 -15.43,191.89 A 32,32 0 0 1 275.87,512 h 64 a 32,32 0 0 0 31.32,-38.51 C 361.6,427.92 356.19,357 386.62,281.6 423.08,191.28 408.1,81.9 396.12,25.31 Z"
					id="path4" />
				</g>
			</svg>
			
			`;
			
			leftCol.appendChild(svgWrap);
			
			const rightCol = document.createElement('div');
			rightCol.className = 'bt-beer-right';

			const rightColInfo = document.createElement('div');
			rightColInfo.className = 'bt-beer-right-info';
			
			const name = document.createElement('div');
			name.className = 'bt-beer-name';
			name.textContent = item.name || 'Unnamed beer';
			
			const meta = document.createElement('div');
			meta.className = 'bt-beer-meta';
			meta.textContent = `${item.category || item.style || ''}`.trim();
			
			const abvIbu = document.createElement('div');
			abvIbu.className = 'bt-beer-abv';
			abvIbu.textContent = `${item.abv || 'ABV N/A'} • ${item.ibu ? `IBU ${item.ibu}` : 'IBU N/A'}`;
			
			const desc = document.createElement('p');
			desc.className = 'bt-beer-desc';
			desc.textContent = item.description || '';
			
			rightCol.appendChild(name); 
			rightCol.appendChild(rightColInfo);
			rightCol.appendChild(desc);
			rightColInfo.appendChild(meta);
			rightColInfo.appendChild(abvIbu);

			card.appendChild(leftCol);
			card.appendChild(rightCol);
			
			grid.appendChild(card);
		});
		
		container.appendChild(grid);
	}

	function publishData(items, options = {}) {
		const { persist = true, meta = {} } = options;
		const mergedMeta = Object.assign({ kind: 'beer' }, meta);
		if (!Array.isArray(items)) return;

		const formatted = formatBeerData(items, mergedMeta);
		if (!formatted) return;

		const pairingTools = typeof window !== 'undefined' ? window.BT_PAIRING_PROFILES : null;
		const enrichedItems = pairingTools && typeof pairingTools.attachKeysAndProfiles === 'function'
			? pairingTools.attachKeysAndProfiles({ kind: mergedMeta.kind || 'beer', items: formatted.items })
			: formatted.items;
		const enrichedPayload = Object.assign({}, formatted, {
			items: enrichedItems,
			pairingProfileVersion: pairingTools ? pairingTools.PAIRING_PROFILE_VERSION : undefined,
		});
		if (enrichedPayload.pairingProfileVersion === undefined) {
			delete enrichedPayload.pairingProfileVersion;
		}

		window.__BT_BEER_DATA = enrichedPayload;

	let script = document.getElementById('bt-beer-data');
	if (!script) {
		script = document.createElement('script');
		script.id = 'bt-beer-data';
		document.head.appendChild(script);
	}
	script.type = 'application/json';
	script.setAttribute('data-testid', 'bt-beer-data');
	script.textContent = JSON.stringify(enrichedPayload);

		if (persist) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(enrichedPayload));
			} catch (err) {
				console.warn('Unable to cache beer data', err);
			}
		}

		if (typeof publishCanonicalMenuData === 'function') {
			try {
				const sourceUrl = mergedMeta.sourceUrl || 'untappd-embed';
				publishCanonicalMenuData(enrichedPayload.items, { sourceUrl, kind: mergedMeta.kind });
			} catch (err) {
				console.warn('Unable to publish canonical menu data', err);
			}
		}

		renderMenu(enrichedPayload.items);

		document.dispatchEvent(new CustomEvent('btBeerDataReady', { detail: { items: enrichedPayload.items } }));
	}

	function hydrateFromCache() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (parsed && (Array.isArray(parsed.items) || Array.isArray(parsed))) {
				const items = Array.isArray(parsed.items) ? parsed.items : parsed;
				publishData(items, { persist: false, meta: { sourceUrl: 'untappd-cache', kind: 'beer' } });
				return parsed;
			}
		} catch (err) {
			console.warn('Unable to read cached beer data', err);
		}
		return null;
	}

	function loadEmbedScript() {
		if (loadEmbedScript.promise) return loadEmbedScript.promise;

		loadEmbedScript.promise = new Promise((resolve, reject) => {
			const existing = document.querySelector(`script[src="${EMBED_URL}"]`);
			if (existing && existing.dataset.btLoaded === '1') {
				resolve();
				return;
			}

			const script = existing || document.createElement('script');
			script.src = EMBED_URL;
			script.async = true;
			script.onload = () => {
				script.dataset.btLoaded = '1';
				resolve();
			};
			script.onerror = reject;
			if (!existing) document.head.appendChild(script);
		});

		return loadEmbedScript.promise;
	}

	function scrapeMenu(container) {
		const items = [];

		container.querySelectorAll('.menu-content .menu-item').forEach(el => {
			const name = el.querySelector('.item-info span span, .item-info .item-name');
			const category = el.querySelector('.item-category');
			const abv = el.querySelector('.item-abv');
			const ibu = el.querySelector('.item-ibu');
			const desc = el.querySelector('.item-description p');

			items.push({
				name: name ? name.textContent.trim() : '',
				category: category ? category.textContent.trim() : '',
				abv: abv ? abv.textContent.trim() : '',
				ibu: ibu ? ibu.textContent.trim() : '',
				description: desc ? desc.textContent.trim() : '',
			});
		});

		return items;
	}

	function observeAndSnapshot(container, meta) {
		const observer = new MutationObserver(() => {
			if (container.querySelector('.menu-content .menu-item')) {
				observer.disconnect();
				const items = scrapeMenu(container);
				publishData(items, { meta });
			}
		});

		observer.observe(container, { childList: true, subtree: true });
	}

	function initMenu(container) {
		const locationId = container.getAttribute('data-location-id');
		const menuId = container.getAttribute('data-menu-id');

		if (!container.id) {
			container.id = 'bt-untappd-' + Math.random().toString(36).slice(2);
		}

		const meta = {
			sourceUrl: `untappd:${locationId || 'unknown'}:${menuId || 'unknown'}`,
			kind: 'beer',
		};

		observeAndSnapshot(container, meta);

		try {
			PreloadEmbedMenu(container.id, Number(locationId) || locationId, Number(menuId) || menuId);
		} catch (err) {
			console.error('Unable to render Untappd menu', err);
		}
	}

	function init() {
		// Make cached data available immediately, even on pages without the embed.
		hydrateFromCache();

		let containers = document.querySelectorAll('.bt-untappd-menu');
		if (!containers.length) {
			const hidden = document.createElement('div');
			hidden.id = 'bt-untappd-hidden';
			hidden.className = 'bt-untappd-menu';
			hidden.style.display = 'none';
			hidden.setAttribute('data-location-id', DEFAULT_LOCATION_ID);
			hidden.setAttribute('data-menu-id', DEFAULT_MENU_ID);
			document.body.appendChild(hidden);
			containers = [ hidden ];
		}

		loadEmbedScript()
			.then(() => {
				containers.forEach(initMenu);
			})
			.catch(err => {
				console.error('Unable to load Untappd embed script', err);
			});
	}

	if (document.readyState === 'loadings') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
