(function(root) {
	const PAIRING_PROFILE_VERSION = 1;

	const EXPLICIT_ID_KEYS = [
		'id',
		'slug',
		'menuId',
		'menu_id',
		'uid',
		'uuid',
		'itemId',
		'item_id',
	];

	function normalizeKeyPart(value) {
		if (!value) return '';
		let str = String(value);
		if (str.normalize) {
			str = str.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
		}
		str = str.toLowerCase();
		str = str.replace(/&/g, ' and ');
		str = str.replace(/['"‘’“”`]/g, '');
		str = str.replace(/[^a-z0-9]+/g, ' ');
		str = str.trim().replace(/\s+/g, '-');
		return str || 'item';
	}

	function makeStableKey({ kind, name, category, explicitId }) {
		const safeKind = kind || 'unknown';
		const base = explicitId || `${category || 'uncategorized'} ${name || ''}`;
		const slug = normalizeKeyPart(base);
		return `bt:${safeKind}:${slug}`;
	}

	function getExplicitId(item) {
		if (!item || typeof item !== 'object') return '';
		for (const key of EXPLICIT_ID_KEYS) {
			if (item[key] === undefined || item[key] === null) continue;
			const value = String(item[key]).trim();
			if (value) return value;
		}
		return '';
	}

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function toTextBlob(...parts) {
		return parts
			.filter(Boolean)
			.map(part => String(part).toLowerCase())
			.join(' ');
	}

	function hasAny(text, keywords) {
		return keywords.some(keyword => text.includes(keyword));
	}

	function scoreFromKeywords(text, rules) {
		let score = 0;
		rules.forEach(rule => {
			if (hasAny(text, rule.keywords)) {
				score += rule.points;
			}
		});
		return score;
	}

	function addTags(target, tags, limit = 6) {
		const seen = new Set(target);
		for (const tag of tags) {
			if (!tag || seen.has(tag)) continue;
			seen.add(tag);
			target.push(tag);
			if (target.length >= limit) break;
		}
		return target;
	}

	function normalizeTag(tag) {
		return String(tag).toLowerCase().trim().replace(/\s+/g, ' ');
	}

	function buildMenuPairingProfile(item) {
		const name = item?.name || '';
		const category = item?.category || 'uncategorized';
		const description = item?.description || '';
		const tagsArray = Array.isArray(item?.tagsArray) ? item.tagsArray : [];
		const text = toTextBlob(name, category, description, tagsArray.join(' '));

		const primaryRules = [
			{ keywords: ['beef', 'pork', 'chicken', 'turkey', 'lamb', 'bacon', 'sausage'], value: 'protein' },
			{ keywords: ['salmon', 'shrimp', 'crab', 'tuna', 'fish'], value: 'seafood' },
			{ keywords: ['tofu', 'tempeh', 'bean', 'lentil', 'mushroom patty'], value: 'veg-protein' },
			{ keywords: ['cheese', 'mozzarella', 'cheddar', 'feta', 'goat cheese'], value: 'cheese' },
			{ keywords: ['pasta', 'rice', 'bread', 'focaccia', 'bun', 'tortilla'], value: 'grain' },
		];

		let primary = 'other';
		for (const rule of primaryRules) {
			if (hasAny(text, rule.keywords)) {
				primary = rule.value;
				break;
			}
		}

		const prepRules = [
			{ keywords: ['fried', 'crispy', 'tempura'], value: 'fried' },
			{ keywords: ['grilled', 'charred', 'bbq'], value: 'grilled' },
			{ keywords: ['roasted', 'rotisserie'], value: 'roasted' },
			{ keywords: ['raw', 'crudo', 'tartare'], value: 'raw' },
			{ keywords: ['braised', 'stewed', 'slow cooked'], value: 'braised' },
			{ keywords: ['smoked', 'smoky'], value: 'smoked' },
			{ keywords: ['baked', 'oven'], value: 'baked' },
		];

		let prep = 'other';
		for (const rule of prepRules) {
			if (hasAny(text, rule.keywords)) {
				prep = rule.value;
				break;
			}
		}

		const richness = clamp(
			2
				+ scoreFromKeywords(text, [
					{ keywords: ['cream', 'butter', 'cheese', 'aioli'], points: 2 },
					{ keywords: ['fried', 'bacon', 'sausage', 'pork', 'beef'], points: 2 },
					{ keywords: ['avocado', 'egg', 'olive oil'], points: 1 },
				]),
			1,
			5
		);

		const spice = clamp(
			scoreFromKeywords(text, [
				{ keywords: ['spicy', 'jalapeno', 'habanero', 'chili', 'pepper'], points: 2 },
				{ keywords: ['sriracha', 'hot sauce', 'cayenne'], points: 1 },
			]),
			0,
			3
		);

		const sweet = clamp(
			scoreFromKeywords(text, [
				{ keywords: ['honey', 'maple', 'glaze', 'caramel', 'sweet'], points: 2 },
				{ keywords: ['fig', 'raisin', 'brown sugar'], points: 1 },
			]),
			0,
			3
		);

		const acid = clamp(
			scoreFromKeywords(text, [
				{ keywords: ['lemon', 'lime', 'citrus', 'vinegar', 'pickle'], points: 2 },
				{ keywords: ['tomato', 'balsamic', 'yogurt'], points: 1 },
			]),
			0,
			3
		);

		const smoke = clamp(
			scoreFromKeywords(text, [
				{ keywords: ['smoked', 'smoky', 'bbq'], points: 2 },
				{ keywords: ['charred', 'fire', 'grill'], points: 1 },
			]),
			0,
			3
		);

		const normalizedTags = tagsArray.map(normalizeTag).filter(Boolean);
		const flavorTags = [];
		addTags(flavorTags, normalizedTags, 6);
		addTags(
			flavorTags,
			[
				hasAny(text, ['mushroom']) ? 'mushroom' : '',
				hasAny(text, ['pickle', 'pickled']) ? 'pickle' : '',
				hasAny(text, ['balsamic']) ? 'balsamic' : '',
				hasAny(text, ['citrus', 'lemon', 'lime']) ? 'citrus' : '',
				hasAny(text, ['smoked', 'smoky', 'bbq']) ? 'smoke' : '',
				hasAny(text, ['caramelized', 'caramelized onion', 'onion']) ? 'caramelized-onion' : '',
			].filter(Boolean),
			6
		);

		return {
			category,
			primary,
			prep,
			axes: {
				richness,
				spice,
				sweet,
				acid,
				smoke,
			},
			tags: flavorTags.slice(0, 6),
		};
	}

	function parseNumber(value) {
		if (value === undefined || value === null) return null;
		const match = String(value).match(/[\d.]+/);
		if (!match) return null;
		const num = parseFloat(match[0]);
		return Number.isFinite(num) ? num : null;
	}

	function buildBeerPairingProfile(beer) {
		const style = beer?.style || beer?.category || '';
		const description = beer?.description || '';
		const text = toTextBlob(style, description);
		const abv = parseNumber(beer?.abv);
		const ibu = parseNumber(beer?.ibu);

		let body = 'med';
		if (hasAny(text, ['stout', 'porter', 'barleywine', 'imperial'])) {
			body = 'full';
		} else if (hasAny(text, ['pilsner', 'lager', 'blonde', 'kolsch', 'gose', 'wit'])) {
			body = 'light';
		} else if (hasAny(text, ['ipa', 'pale ale', 'amber', 'brown'])) {
			body = 'med';
		}
		if (abv !== null) {
			if (abv >= 7.5) body = 'full';
			else if (abv <= 4.5) body = 'light';
		}

		let sweetness = 'med';
		if (hasAny(text, ['dry', 'crisp'])) sweetness = 'dry';
		if (hasAny(text, ['pastry', 'caramel', 'honey', 'vanilla', 'sweet'])) sweetness = 'sweet';

		const roast = clamp(
			scoreFromKeywords(text, [
				{ keywords: ['stout', 'porter', 'roast', 'coffee', 'chocolate'], points: 2 },
				{ keywords: ['black', 'dark'], points: 1 },
			]),
			0,
			3
		);

		const hoppy = clamp(
			scoreFromKeywords(text, [
				{ keywords: ['ipa', 'pale ale', 'hoppy'], points: 2 },
				{ keywords: ['citra', 'mosaic', 'simcoe', 'pine', 'resin'], points: 1 },
			]),
			0,
			3
		);

		const acid = clamp(
			scoreFromKeywords(text, [
				{ keywords: ['sour', 'tart', 'gose', 'berliner'], points: 2 },
				{ keywords: ['fruited', 'lactic'], points: 1 },
			]),
			0,
			3
		);

		const tags = [];
		addTags(
			tags,
			[
				hasAny(text, ['citrus', 'orange', 'lemon', 'grapefruit']) ? 'citrus' : '',
				hasAny(text, ['pine', 'resin']) ? 'pine' : '',
				hasAny(text, ['tropical', 'mango', 'pineapple']) ? 'tropical' : '',
				hasAny(text, ['coffee']) ? 'coffee' : '',
				hasAny(text, ['chocolate']) ? 'chocolate' : '',
				hasAny(text, ['caramel', 'toffee']) ? 'caramel' : '',
				hasAny(text, ['bread', 'bready']) ? 'bread' : '',
				hasAny(text, ['toast', 'toasted']) ? 'toast' : '',
				hasAny(text, ['smoke', 'smoked']) ? 'smoke' : '',
				hasAny(text, ['sour', 'tart']) ? 'tart' : '',
			].filter(Boolean),
			6
		);

		addTags(
			tags,
			[
				hasAny(text, ['stout', 'porter']) ? 'roasty' : '',
				hasAny(text, ['lager', 'pilsner']) ? 'crisp' : '',
				hasAny(text, ['ipa']) ? 'hoppy' : '',
			].filter(Boolean),
			6
		);

		return {
			style,
			abv,
			ibu: ibu === null ? null : Math.round(ibu),
			body,
			sweetness,
			axes: {
				roast,
				hoppy,
				acid,
			},
			tags: tags.slice(0, 6),
		};
	}

	function attachKeysAndProfiles({ kind, items }) {
		const seen = new Map();
		const collisions = [];
		const debug = root && root.__BT_DEBUG_KEYS === true;

		const next = (items || []).map(item => {
			const explicitId = getExplicitId(item);
			const baseKey = makeStableKey({
				kind,
				name: item?.name || '',
				category: item?.category || 'uncategorized',
				explicitId,
			});
			const count = (seen.get(baseKey) || 0) + 1;
			seen.set(baseKey, count);
			let btKey = baseKey;
			if (count > 1) {
				btKey = `${baseKey}--${count}`;
				if (debug) collisions.push(baseKey);
			}

			const pairingProfile = kind === 'beer'
				? buildBeerPairingProfile(item)
				: buildMenuPairingProfile(item);

			return Object.assign({}, item, { btKey, pairingProfile });
		});

		if (debug) {
			const unique = Array.from(new Set(collisions));
			if (unique.length) {
				console.warn('[BT keys] collisions', { kind, keys: unique });
			}
			const sample = next.slice(0, 3).map(item => ({
				btKey: item.btKey,
				pairingProfile: item.pairingProfile,
			}));
			console.log('[BT keys] sample', { kind, sample });
		}

		return next;
	}

	const api = {
		PAIRING_PROFILE_VERSION,
		makeStableKey,
		attachKeysAndProfiles,
		buildMenuPairingProfile,
		buildBeerPairingProfile,
	};

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	} else {
		root.BT_PAIRING_PROFILES = api;
	}
})(typeof window !== 'undefined' ? window : globalThis);
