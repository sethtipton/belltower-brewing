document.addEventListener('DOMContentLoaded', () => {
	if (!window.belltowerMenu || !window.belltowerMenu.csvURL) {
		console.warn('belltowerMenu globals missing; skipping menu render');
		return;
	}

	const pairingTools = window.BT_PAIRING_PROFILES || null;
	const foodMenus = document.querySelectorAll('.brewery-menu');
	const drinksMenus = document.querySelectorAll('.drinks-menu');
	const hasFoodMenus = !!foodMenus.length;
	const hasDrinksMenus = !!drinksMenus.length;
	const csvFoodURL = window.belltowerMenu.csvURL;
	const csvDrinksURL = window.belltowerMenu.drinksCsvURL;

	function normalizePriceDisplay(price) {
		const raw = (price || '').trim();
		if (!raw) return '';
		const match = raw.match(/^\s*\$?\s*([\d.]+)(.*)$/);
		if (!match) return raw;
		const num = parseFloat(match[1]);
		if (!Number.isFinite(num)) return raw;
		const cleaned = num % 1 === 0 ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
		const rest = match[2].trim();
		return rest ? `${cleaned} ${rest}` : cleaned;
	}

	function splitCSVLine(line) {
		return line
			.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
			.map(f => f.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
	}

	function parseCSV(text) {
		const [headerLine, ...lines] = text.trim().split(/\r?\n/);
		const rawHeaders = splitCSVLine(headerLine);
		const keys = rawHeaders.map(h =>
			h.trim().replace(/\s+/g, '').replace(/^./, c => c.toLowerCase())
		);
		return lines.map((line, rowIndex) => {
			const cols = splitCSVLine(line);
			if (cols.length !== keys.length) {
				console.warn('CSV row has unexpected column count', { rowIndex, cols, keys });
			}
			return cols.reduce((obj, val, i) => {
				const clean = val.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
				const key = keys[i] || `col${i}`;
				obj[key] = clean;
				return obj;
			}, {});
		});
	}

	function normalizeItems(items) {
		return items.map(item => {
			const tagArray = (item.tags || '')
				.split(',')
				.map(t => t.trim())
				.filter(Boolean);
			const priceDisplay = normalizePriceDisplay(item.price);
			return Object.assign({}, item, {
				tags: item.tags || '',
				tagsArray: tagArray,
				priceDisplay,
			});
		});
	}

	function renderAll(kind, items) {
		const menus = kind === 'food' ? foodMenus : drinksMenus;
		const hasMenus = kind === 'food' ? hasFoodMenus : hasDrinksMenus;
		const allTags = new Set();
		items.forEach(it => {
			if (!it.tagsArray || !it.tagsArray.length) return;
			it.tagsArray.forEach(t => {
				if (t) allTags.add(t);
			});
		});
		if (hasMenus) {
			if (menus[0]) renderFilterSection(menus[0], Array.from(allTags).sort(), menus);
			menus.forEach(menu => {
				if (menu.dataset.category) renderCategorySection(menu, items);
			});
			document.querySelectorAll('.brewery-legend').forEach(div =>
				renderLegend(div, items)
			);
		}
		generateMenuJSONLD(items);
	}

	function fetchAndPublish(url, kind, hasMenus, menus) {
		if (!url) {
			publishCanonicalMenuData([], { sourceUrl: url || '', error: 'Missing URL', kind });
			return;
		}
		const fullUrl = `${url}&cb=${Date.now()}`;
		fetch(fullUrl, { cache: 'no-cache' })
			.then(r => {
				if (!r.ok) {
					throw new Error(`Menu fetch failed (${r.status})`);
				}
				return r.text();
			})
			.then(text => {
				let items = normalizeItems(parseCSV(text));
				if (pairingTools && typeof pairingTools.attachKeysAndProfiles === 'function') {
					items = pairingTools.attachKeysAndProfiles({ kind, items });
					if (
						items.length
						&& items.some(item => item.btKey && !item.btKey.startsWith(`bt:${kind}:`))
					) {
						if (window.__BT_DEBUG_KEYS === true) {
							console.warn('[BT keys] kind mismatch detected, reattaching', { kind });
						}
						const stripped = items.map(item => {
							const copy = Object.assign({}, item);
							delete copy.btKey;
							delete copy.pairingProfile;
							return copy;
						});
						items = pairingTools.attachKeysAndProfiles({ kind, items: stripped });
					}
				}
				publishCanonicalMenuData(items, { sourceUrl: url, kind });
				renderAll(kind, items);
			})
			.catch(err => {
				console.error(err);
				publishCanonicalMenuData([], { sourceUrl: url, error: err.message, kind });
				if (hasMenus) {
					menus.forEach(c => {
						renderErrorState(c, 'Sorry — menu unavailable.');
					});
				}
			});
	}

	// Fetch food sheet -> __BT_MENU_DATA (legacy) and __BT_DATA.food
	fetchAndPublish(csvFoodURL, 'food', hasFoodMenus, foodMenus);

	// Fetch drinks sheet -> __BT_DATA.drinks (no __BT_MENU_DATA override)
	if (csvDrinksURL) {
		fetchAndPublish(csvDrinksURL, 'drinks', hasDrinksMenus, drinksMenus);
	}
});

function renderFilterSection(menuEl, tags, allMenus) {
	const section = document.createElement('section');
	section.id = 'menu-filters';
	const heading = document.createElement('span');
	heading.className = 'filters-span';
	heading.textContent = 'Filter Our Menu';

	const container = document.createElement('div');
	container.className = 'menu-filters';
	container.setAttribute('role', 'group');
	container.setAttribute('aria-label', 'Filter menu items');

	const nav = document.createElement('nav');
	nav.className = 'menu-filters-nav';
	nav.setAttribute('aria-label', 'Menu filters');
	nav.append(container);

	const emptyMessage = document.createElement('p');
	emptyMessage.className = 'menu-empty-message';
	emptyMessage.textContent = 'Nope—nothing fits those filters, try selecting fewer tags.';
	emptyMessage.setAttribute('aria-hidden', 'true');
	emptyMessage.classList.remove('is-visible');
	emptyMessage.setAttribute('aria-live', 'polite');

	const allBtn = document.createElement('button');
	allBtn.type = 'button';
	allBtn.textContent = 'All';
	allBtn.dataset.filter = '';
	allBtn.setAttribute('aria-pressed', 'true');
	container.append(allBtn);

	

	tags.forEach(tag => {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.textContent = tag;
		btn.dataset.filter = tag;
		btn.setAttribute('aria-pressed', 'false');
		container.append(btn);
	});

	const wrap = document.createElement('div');
	wrap.className = 'menu-filters-wrap';
	wrap.append(heading, nav);

	section.append(wrap, emptyMessage);

	menuEl.parentNode.insertBefore(section, menuEl);

	const selected = new Set();
	container.addEventListener('click', e => {
		if (e.target.tagName !== 'BUTTON') return;
		const filter = e.target.dataset.filter;

		if (!filter) {
			selected.clear();
			allBtn.setAttribute('aria-pressed', 'true');
			container.querySelectorAll('button[data-filter]').forEach(b => {
				if (b !== allBtn) b.setAttribute('aria-pressed', 'false');
			});
		} else {
			allBtn.setAttribute('aria-pressed', 'false');
			if (selected.has(filter)) {
				selected.delete(filter);
				e.target.setAttribute('aria-pressed', 'false');
			} else {
				selected.add(filter);
				e.target.setAttribute('aria-pressed', 'true');
			}
			if (!selected.size) {
				allBtn.setAttribute('aria-pressed', 'true');
			}
		}

		// Scope filtering to this menu group only (food vs drinks can coexist on the page).
		const scopedItems = Array.from(allMenus).flatMap(m =>
			Array.from(m.querySelectorAll('.menu-item'))
		);

		scopedItems.forEach(item => {
			const tags = (item.dataset.tags || '')
				.split(',')
				.map(t => t.trim())
				.filter(Boolean);

			const matchesAll = selected.size
				? Array.from(selected).every(sel => tags.includes(sel))
				: true;

			if (matchesAll) {
				item.classList.remove('filtered-out');
			} else {
				item.classList.add('filtered-out');
			}
		});

		allMenus.forEach(menu => {
			const anyVisible = menu.querySelector('.menu-item:not(.filtered-out)');
			menu.classList.toggle('empty', !anyVisible);
			const heading = (menu.parentElement && menu.parentElement.querySelector('.section-title')) || null;
			if (heading) heading.style.display = anyVisible ? '' : 'none';
		});

		const anyVisibleAcrossMenus = Array.from(allMenus).some(menu =>
			menu.querySelector('.menu-item:not(.filtered-out)')
		);
		const showEmpty = !anyVisibleAcrossMenus;
		emptyMessage.setAttribute('aria-hidden', showEmpty ? 'false' : 'true');
		emptyMessage.classList.toggle('is-visible', showEmpty);
		// Hide legends when nothing matches
		document.querySelectorAll('.brewery-legend').forEach(legendEl => {
			legendEl.style.display = showEmpty ? 'none' : '';
		});

	});
}

function renderCategorySection(container, items) {
	const category = container.dataset.category;
	const parent = container.parentNode;

	const section = document.createElement('section');
	section.classList.add('category-section');
	section.id = category.toLowerCase().replace(/\s+/g, '-');

	const heading = document.createElement('h3');
	heading.className = 'section-title heading-3';
	heading.id = `${section.id}-title`;
	section.setAttribute('aria-labelledby', heading.id);
	// Wrap heading text in a span
	const headingInner = document.createElement('span');
	headingInner.className = 'section-title__inner';
	headingInner.textContent = category;
	heading.appendChild(headingInner);

	parent.insertBefore(section, container);
	section.append(heading, container);

	container._btHeading = heading;
	container._btHeadingInner = headingInner; // optional, but handy

	renderCategory(container, items);
}


function renderCategory(container, items) {
	const cat = container.dataset.category;
	const list = cat ? items.filter(it => it.category === cat) : items;

	container.innerHTML = '';
	if (!list.length) {
		if (container._btHeading) container._btHeading.style.display = 'none';
		renderErrorState(container, 'No items…');
		return;
	}

	if (container._btHeading) container._btHeading.style.display = '';

	const rawComment = list.find(it => it.categoryComment)?.categoryComment || '';
	const commentHTML = rawComment ? `<p class="category-comment">${rawComment}</p>` : '';

	container.insertAdjacentHTML(
		'beforeend',
		`
		${commentHTML}
	`
	);

	const listEl = document.createElement('ul');
	listEl.className = 'menu-items';
	container.appendChild(listEl);

	list.forEach(it => {
		const descHTML = it.description ? `<p class="description">${it.description}</p>` : '';
		const tagsHTML = it.tags ? `<span class="tags">${it.tags}</span>` : '';
		const addHTML = it.add ? `<p class="add"><strong>Add:</strong> ${it.add}</p>` : '';
		const displayPrice = it.priceDisplay || it.price || '';
		listEl.insertAdjacentHTML(
			'beforeend',
			`
			<li class="menu-item" data-tags="${it.tags || ''}">
				<article>
					<div class="title-price">
						<div class="title-wrap">
							<h3>${it.name}</h3>
							${tagsHTML}
						</div>
						<span class="price">${displayPrice}</span>
					</div>
					${descHTML}
					${addHTML}
				</article>
			</li>
		`
		);
	});
}

function renderLegend(container, items) {
	const disclaimer = items.find(it => it.disclaimer)?.disclaimer || '';
	const key = items.find(it => it.key)?.key || '';

	let html = '';
	if (disclaimer) html += `<p class="menu-disclaimer">${disclaimer}</p>`;

	if (key) {
		const keyItems = key
			.split(',')
			.map(item => item.trim())
			.filter(Boolean)
			.map(item => `<span class="key-item">${item}</span>`);
		if (keyItems.length) html += `<div class="menu-key">${keyItems.join(' ')}</div>`;
	}

	container.innerHTML = html;
}

function publishCanonicalMenuData(items, meta = {}) {
	const kind = meta.kind
		|| (meta.sourceUrl && meta.sourceUrl.indexOf('untappd') !== -1 ? 'beer' : 'food');
	const categories = Array.from(
		new Set(items.map(i => i.category).filter(Boolean))
	);

	const payload = {
		schemaVersion: 1,
		pairingProfileVersion: (window.BT_PAIRING_PROFILES && window.BT_PAIRING_PROFILES.PAIRING_PROFILE_VERSION) || undefined,
		kind,
		generatedAt: new Date().toISOString(),
		source: meta.sourceUrl || '',
		error: meta.error || undefined,
		counts: {
			items: items.length,
			categories: categories.length,
		},
		categories,
		items: items.map(item =>
			Object.entries(item || {}).reduce((obj, [key, value]) => {
				if (value) obj[key] = value;
				return obj;
			}, {})
		),
	};

	if (payload.error === undefined) delete payload.error;
	if (payload.pairingProfileVersion === undefined) delete payload.pairingProfileVersion;

	window.__BT_DATA = window.__BT_DATA || {};
	window.__BT_DATA[kind] = payload;

	if (kind === 'food') {
		window.__BT_FOOD_DATA = payload;
		window.__BT_MENU_DATA = payload;
	}
	if (kind === 'beer') window.__BT_BEER_DATA = payload;
	if (kind === 'drinks') window.__BT_DRINKS_DATA = payload;

	const label = meta.label || (kind ? `${kind.charAt(0).toUpperCase()}${kind.slice(1)} menu` : 'Menu data');

	const scriptId = `bt-${kind || 'menu'}-data`;
	let script = document.getElementById(scriptId);
	if (!script) {
		script = document.createElement('script');
		script.type = 'application/json';
		script.id = scriptId;
		document.head.appendChild(script);
	}
	const payloadJson = JSON.stringify(payload);
	if (script.textContent !== payloadJson) {
		script.textContent = payloadJson;
	}

	const legacyId = 'bt-menu-data';
	let legacy = document.getElementById(legacyId);
	if (!legacy) {
		legacy = document.createElement('script');
		legacy.type = 'application/json';
		legacy.id = legacyId;
		document.head.appendChild(legacy);
	}
	if (legacy.textContent !== payloadJson) {
		legacy.textContent = payloadJson;
	}

	if (kind === 'food' && typeof document !== 'undefined') {
		try {
			document.dispatchEvent(new CustomEvent('btFoodDataReady', { detail: { payload } }));
		} catch (err) {
			if (window.__BT_DEBUG_KEYS === true) {
				console.warn('[BT keys] unable to dispatch btFoodDataReady', err);
			}
		}
	}
}

function generateMenuJSONLD(items) {
	const categories = Array.from(
	  new Set(items.map(i => i.category).filter(Boolean))
	);
	const sections = categories.map(cat => {
	  const sectionItems = items
		.filter(i => i.category === cat)
		.map(i => {
		  const priceText = i.priceDisplay || i.price || '';
		  const priceNum  = priceText.match(/[\d.]+/)?.[0] || '';
		  const menuItem = {
			"@type": "MenuItem",
			"name": i.name,
			"description": i.description || undefined
		  };
		  if (priceNum) {
			menuItem.offers = {
			  "@type": "Offer",
			  "price": priceNum,
			  "priceCurrency": "USD"
			};
		  }
		  return menuItem;
		})
		.filter(Boolean);
	  return {
		"@type": "MenuSection",
		"name": cat,
		"hasMenuItem": sectionItems
	  };
	}).filter(sec => sec.hasMenuItem && sec.hasMenuItem.length);
  
	if (!sections.length) return;
  
	const menuJSON = {
	  "@context": "https://schema.org",
	  "@type": "Menu",
	  "name": "Bell Tower Brewing Food Menu",
	  "url": window.location.href,
	  "hasMenuSection": sections
	};
  
	const existing = document.getElementById('bt-menu-jsonld');
	const s = existing || document.createElement("script");
	s.type = "application/ld+json";
	s.id = 'bt-menu-jsonld';
	const nextJson = JSON.stringify(menuJSON, null, 2);
	if (s.textContent !== nextJson) {
	  s.textContent = nextJson;
	}
	if (!existing) document.head.appendChild(s);
  }
  
function renderErrorState(container, message) {
	container.innerHTML = `<p class="menu-error" role="status" aria-live="polite">${message}</p>`;
}
