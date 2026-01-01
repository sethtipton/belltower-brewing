(() => {
	const cfg = window.kegListConfig;
	if (!cfg || !cfg.baseCsv) return;

	const containers = document.querySelectorAll('.keg-list');
	if (!containers.length) return;

	const sheetNames = cfg.sheets || {};
	const cache = {};

	function headerKey(h) {
		return (h || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
	}

	function splitCSVLine(line) {
		return line
			.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
			.map(f => f.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
	}

	function parseCSV(text) {
		const [headerLine, ...lines] = text.trim().split(/\r?\n/);
		const headers = splitCSVLine(headerLine).map(headerKey);
		return lines
			.map((line, rowIndex) => {
				const cols = splitCSVLine(line);
				if (cols.length !== headers.length) {
					console.warn('Keg list row has unexpected column count', {
						rowIndex,
						cols,
						headers,
					});
				}
				return cols.reduce((obj, val, i) => {
					const key = headers[i] || `col${i}`;
					obj[key] = val.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
					return obj;
				}, {});
			})
			.filter(Boolean);
	}

	function formatPrice(str) {
		if (!str) return '';
		const num = parseFloat(String(str).replace(/[^0-9.]/g, ''));
		if (!Number.isFinite(num)) return '';
		return num % 1 === 0 ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
	}

	function formatAbv(str) {
		if (!str) return '';
		const num = parseFloat(String(str).replace(/[^0-9.]/g, ''));
		if (!Number.isFinite(num)) return '';
		return `${num % 1 === 0 ? num.toFixed(1).replace(/\.0$/, '') : num}%`;
	}

	function normalizeItems(rows) {
		const map = {
			beername: 'name',
			style: 'style',
			sku: 'sku',
			'16bblkeg': 'price16',
			'12bblkeg': 'price12',
			abv: 'abv',
			ibu: 'ibu',
			tags: 'tags',
			lastupdated: 'updated',
		};

		return rows
			.map(row => {
				const obj = {};
				Object.entries(map).forEach(([rawKey, dest]) => {
					obj[dest] = row[rawKey] || '';
				});

				const tagsArray = (obj.tags || '')
					.split(',')
					.map(t => t.trim())
					.filter(Boolean);

				return {
					name: obj.name,
					style: obj.style,
					sku: obj.sku,
					price16: formatPrice(obj.price16),
					price12: formatPrice(obj.price12),
					abv: formatAbv(obj.abv),
					ibu: obj.ibu ? String(parseFloat(obj.ibu)).replace(/\.0+$/, '') : '',
					tags: obj.tags || '',
					tagsArray,
					updated: obj.updated,
				};
			})
			.filter(item => item.name);
	}

	function buildUrl(type) {
		const sheetName = sheetNames[type] || type;
		const sep = cfg.baseCsv.includes('?') ? '&' : '?';
		return `${cfg.baseCsv}${sep}sheet=${encodeURIComponent(sheetName)}&cb=${Date.now()}`;
	}

	async function fetchSheet(type) {
		if (cache[type]) return cache[type];
		const url = buildUrl(type);
		const rows = await fetch(url, { cache: 'no-cache' }).then(res => {
			if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
			return res.text();
		});
		const items = normalizeItems(parseCSV(rows));
		cache[type] = items;
		return items;
	}

	function renderTable(container, type, items) {
		const section = document.createElement('section');
		const headingId = `keg-${type}-title-${Math.random().toString(36).slice(2, 8)}`;
		section.className = 'keg-section';
		section.setAttribute('aria-labelledby', headingId);

		const headingWrap = document.createElement('div');
		headingWrap.className = 'keg-heading';

		const heading = document.createElement('h3');
		heading.id = headingId;
		heading.className = 'keg-section-title';
		heading.textContent = sheetNames[type] || type;
		headingWrap.appendChild(heading);

		const lastUpdated = items.find(it => it.updated)?.updated || '';
		if (lastUpdated) {
			const updated = document.createElement('p');
			updated.className = 'keg-updated';
			updated.textContent = `Last updated: ${lastUpdated}`;
			headingWrap.appendChild(updated);
		}

		section.appendChild(headingWrap);

		if (!items.length) {
			section.insertAdjacentHTML(
				'beforeend',
				`<p class="keg-empty" role="status">No kegs available.</p>`
			);
			container.appendChild(section);
			return;
		}

		const table = document.createElement('table');
		table.className = 'keg-table';

		table.innerHTML = `
			<thead>
				<tr>
					<th scope="col">SKU</th>
					<th scope="col">Beer</th>
					<th scope="col">Style</th>
					<th scope="col">1/6 BBL</th>
					<th scope="col">1/2 BBL</th>
					<th scope="col">ABV</th>
					<th scope="col">IBU</th>
					<th scope="col">Tags</th>
				</tr>
			</thead>
			<tbody></tbody>
		`;

		const tbody = table.querySelector('tbody');
		items.forEach(item => {
			const tags = item.tagsArray && item.tagsArray.length ? item.tagsArray.join(', ') : '';
			tbody.insertAdjacentHTML(
				'beforeend',
				`
				<tr>
					<td>${item.sku || ''}</td>
					<th scope="row">${item.name}</th>
					<td>${item.style || ''}</td>
					<td>${item.price16 || ''}</td>
					<td>${item.price12 || ''}</td>
					<td>${item.abv || ''}</td>
					<td>${item.ibu || ''}</td>
					<td>${tags}</td>
				</tr>
			`
			);
		});

		section.appendChild(table);
		container.appendChild(section);
	}

	function renderError(container, message) {
		container.innerHTML = `<p class="keg-error" role="status" aria-live="polite">${message}</p>`;
	}

	function typesForContainer(el) {
		const type = (el.dataset.type || 'retail').toLowerCase();
		if ('both' === type) return ['retail', 'wholesale'];
		if (type === 'retail' || type === 'wholesale') return [type];
		return ['retail'];
	}

	async function renderContainer(el) {
		const types = typesForContainer(el);
		el.innerHTML = '';
		try {
			for (const type of types) {
				const items = await fetchSheet(type);
				renderTable(el, type, items);
			}
		} catch (err) {
			console.error('Keg list error', err);
			renderError(el, 'Keg list unavailable.');
		}
	}

	containers.forEach(renderContainer);
})();
