document.addEventListener('DOMContentLoaded', () => {
	const menus = document.querySelectorAll('.brewery-menu');
	if (!menus.length) return;
	const csvURL = window.belltowerMenu.csvURL;
	function splitCSVLine(line) {
		return line
			.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
			.map(f => f.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
	}

	const url = `${csvURL}&cb=${Date.now()}`;
	fetch(url, { cache: 'no-cache' })
		.then(r => r.text())
		.then(text => {
			const [headerLine, ...lines] = text.trim().split(/\r?\n/);
			const rawHeaders = splitCSVLine(headerLine);
			const keys = rawHeaders.map(h =>
				h.trim().replace(/\s+/g, '').replace(/^./, c => c.toLowerCase())
			);
			const items = lines.map(line => {
				const cols = splitCSVLine(line);
				return cols.reduce((obj, val, i) => {
					const clean = val.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
					obj[keys[i]] = clean;
					return obj;
				}, {});
			});
			const allTags = new Set();
			items.forEach(it => {
				if (!it.tags) return;
				it.tags.split(',').map(t => t.trim()).forEach(t => {
					if (t) allTags.add(t);
				});
			});
			renderFilterSection(menus[0], Array.from(allTags).sort(), menus);
			menus.forEach(menu => {
				if (menu.dataset.category) renderCategorySection(menu, items);
			});
			document.querySelectorAll('.brewery-legend').forEach(div =>
				renderLegend(div, items)
			);
			generateMenuJSONLD(items);
		})
		.catch(err => {
			console.error(err);
			menus.forEach(c => {
				c.textContent = 'Sorry — menu unavailable.';
			});
		});
});

function renderFilterSection(menuEl, tags, allMenus) {
	const section = document.createElement('section');
	section.id = 'menu-filters';

	const heading = document.createElement('h2');
	heading.textContent = 'Filter Our Menu';
	section.append(heading);

	const container = document.createElement('div');
	container.className = 'menu-filters';
	container.setAttribute('role', 'group');
	container.setAttribute('aria-label', 'Filter menu items');

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

	section.append(container);

	menuEl.parentNode.insertBefore(section, menuEl);

	container.addEventListener('click', e => {
		if (e.target.tagName !== 'BUTTON') return;
		const filter = e.target.dataset.filter;

		container.querySelectorAll('button').forEach(b => {
			b.setAttribute('aria-pressed', b === e.target);
		});

		document.querySelectorAll('.menu-item').forEach(item => {
			const tagsString = item.dataset.tags || '';
			const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);

			if (!filter || tags.includes(filter)) {
				item.classList.remove('filtered-out');
			} else {
				item.classList.add('filtered-out');
			}
		});

		allMenus.forEach(menu => {
			const anyVisible = menu.querySelector('.menu-item:not(.filtered-out)');
			menu.classList.toggle('empty', !anyVisible);
		});

	});
}

function renderCategorySection(container, items) {
	const category = container.dataset.category;
	const parent = container.parentNode;
	const section = document.createElement('section');
	section.id = category.toLowerCase().replace(/\s+/g, '-');

	//const heading = document.createElement('h3');
	//heading.textContent = category;

	parent.insertBefore(section, container);
	//section.append(heading, container);

	renderCategory(container, items);
}

function renderCategory(container, items) {
	const cat = container.dataset.category;
	const list = cat ? items.filter(it => it.category === cat) : items;

	container.innerHTML = '';
	if (!list.length) {
		container.textContent = 'No items…';
		return;
	}

	const rawComment = list.find(it => it.categoryComment)?.categoryComment || '';
	const commentHTML = rawComment ? `<p class="category-comment">${rawComment}</p>` : '';

	container.insertAdjacentHTML(
		'beforeend',
		`
		<h2 class="section-title">${cat}</h2>
		${commentHTML}
	`
	);

	list.forEach(it => {
		const descHTML = it.description ? `<p class="description">${it.description}</p>` : '';
		const tagsHTML = it.tags ? `<span class="tags">${it.tags}</span>` : '';
		const addHTML = it.add ? `<p class="add"><strong>Add:</strong> ${it.add}</p>` : '';

		container.insertAdjacentHTML(
			'beforeend',
			`
			<article class="menu-item" data-tags="${it.tags || ''}">
				<div class="title-price">
					<div class="title-wrap">
						<h3>${it.name}</h3>
						${tagsHTML}
					</div>
					<span class="price">${it.price}</span>
				</div>
				${descHTML}
				${addHTML}
			</article>
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


/**
 * Build a JSON-LD <script> for the menu and append it to <head>
 */
function generateMenuJSONLD(items) {
	// 1. Group items by category
	const categories = Array.from(
	  new Set(items.map(i => i.category).filter(Boolean))
	);
  
	// 2. Build an array of MenuSection objects
	const sections = categories.map(cat => {
	  const sectionItems = items
		.filter(i => i.category === cat)
		.map(i => {
		  // parse a number out of price, if it exists
		  const priceText = i.price || '';
		  const priceNum  = priceText.match(/[\d.]+/)?.[0] || '';
  
		  return {
			"@type": "MenuItem",
			"name": i.name,
			"description": i.description || undefined,
			"offers": priceNum
			  ? {
				  "@type": "Offer",
				  "price": priceNum,
				  "priceCurrency": "USD"
				}
			  : undefined
		  };
		});
  
	  return {
		"@type": "MenuSection",
		"name": cat,
		"hasMenuItem": sectionItems
	  };
	});
  
	// 3. Build the top‐level Menu object
	const menuJSON = {
	  "@context": "https://schema.org",
	  "@type": "Menu",
	  "name": "Bell Tower Brewing Food Menu",
	  "url": window.location.href,
	  "hasMenuSection": sections
	};
  
	// 4. Inject into the document head
	const s = document.createElement("script");
	s.type = "application/ld+json";
	s.innerHTML = JSON.stringify(menuJSON, null, 2);
	document.head.appendChild(s);
  }
  
