document.addEventListener('DOMContentLoaded', function () {

	/* ---------- 1. Load More Templates (shows the 4 EduMaster cards) ---------- */
	var loadMoreBtn = document.getElementById('loadMoreBtn');
	if (loadMoreBtn) {
		loadMoreBtn.addEventListener('click', function () {
			document.querySelectorAll('.edu-card').forEach(function (card) {
				card.classList.remove('hidden');
			});
			loadMoreBtn.style.display = 'none';
		});
	}

	/* ---------- 2. Preview & Download on every template card ---------- */
	function triggerDownload(url) {
		var link = document.createElement('a');
		link.href = url;
		link.download = '';
		link.target = '_blank';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function wireTemplateCard(card) {
		var previewUrl = card.getAttribute('data-preview');
		var downloadUrl = card.getAttribute('data-download');
		var previewBtn = card.querySelector('.btn-outline');
		var downloadBtn = card.querySelector('.card-actions .btn-primary');

		if (previewBtn && previewUrl) {
			previewBtn.addEventListener('click', function () {
				window.open(previewUrl, '_blank');
			});
		}
		if (downloadBtn && downloadUrl) {
			downloadBtn.addEventListener('click', function () {
				triggerDownload(downloadUrl);
			});
		}
	}

	document.querySelectorAll('.template-card').forEach(wireTemplateCard);

	/* ---------- 2b. Featured cards open their live site on click ---------- */
	document.querySelectorAll('.featured-card[data-preview]').forEach(function (card) {
		card.addEventListener('click', function () {
			window.open(card.getAttribute('data-preview'), '_blank');
		});
	});

	/* ---------- 3. Favorite heart buttons on each card ---------- */
	function getCardTitle(btn) {
		var card = btn.closest('article');
		var h3 = card ? card.querySelector('h3') : null;
		return h3 ? h3.textContent.trim() : '';
	}

	function updateFavCount() {
		var count = document.querySelectorAll('.fav-btn.active').length;
		var navFavBtn = document.getElementById('navFavBtn');
		if (navFavBtn) {
			navFavBtn.textContent = count > 0 ? '♥ ' + count : '♡';
		}
	}

	function wireFavButton(btn) {
		var title = getCardTitle(btn);
		if (localStorage.getItem('fav-' + title)) {
			btn.classList.add('active');
			btn.textContent = '♥';
		}
		btn.addEventListener('click', function () {
			btn.classList.toggle('active');
			if (btn.classList.contains('active')) {
				btn.textContent = '♥';
				localStorage.setItem('fav-' + title, '1');
			} else {
				btn.textContent = '♡';
				localStorage.removeItem('fav-' + title);
			}
			updateFavCount();
		});
	}

	document.querySelectorAll('.fav-btn').forEach(wireFavButton);
	updateFavCount();

	/* ---------- 4. Navbar favorites icon (shows saved list) ---------- */
	var navFavBtn = document.getElementById('navFavBtn');
	if (navFavBtn) {
		navFavBtn.addEventListener('click', function () {
			var titles = [];
			document.querySelectorAll('.fav-btn.active').forEach(function (b) {
				titles.push(getCardTitle(b));
			});
			if (titles.length === 0) {
				alert('You have not favorited any templates yet.');
			} else {
				alert('Favorite Templates:\n\n' + titles.join('\n'));
			}
		});
	}

	/* ---------- 5. Search (navbar search box + hero search bar) — live, type-to-search ---------- */
	// Does the typed term belong to a category (e.g. "shop", "portfolio") whose real
	// template uses different, branded wording in its title (e.g. "Veloxis")? Without this,
	// a literal text search only ever matches whichever card's text happens to contain the
	// exact word typed — which in practice is usually just a newly-submitted template, since
	// its auto-generated description is built FROM those generic category words, while the
	// original branded templates are not. That made every other template vanish from a
	// generic search instead of showing up alongside the new one.
	function cardMatchesCategory(term, card) {
		if (!term || typeof categoryRules === 'undefined') return false;
		var h3 = card.querySelector('h3');
		var normTitle = normalize(h3 ? h3.textContent : '');
		for (var i = 0; i < categoryRules.length; i++) {
			for (var k = 0; k < categoryRules[i].keys.length; k++) {
				if (term.indexOf(categoryRules[i].keys[k]) !== -1 && normTitle.indexOf(categoryRules[i].titleHas) !== -1) {
					return true;
				}
			}
		}
		return false;
	}

	function runSearch(term, shouldScroll) {
		term = term.trim().toLowerCase();
		var matches = 0;
		// Search both the main grid AND the Featured Templates row, so a name that only
		// exists up there (e.g. "Plinth Studio") is still found instead of showing "no results".
		document.querySelectorAll('.template-grid .template-card, .featured .featured-card').forEach(function (card) {
			var h3 = card.querySelector('h3');
			var p = card.querySelector('p');
			var title = h3 ? h3.textContent.toLowerCase() : '';
			var desc = p ? p.textContent.toLowerCase() : '';
			if (term === '' || title.indexOf(term) !== -1 || desc.indexOf(term) !== -1 || cardMatchesCategory(term, card)) {
				card.classList.remove('search-hidden');
				// A match on a not-yet-revealed paginated card (EduMaster, shown after
				// "Load More") should still surface it, instead of staying hidden.
				if (term !== '') card.classList.remove('hidden');
				matches++;
			} else {
				card.classList.add('search-hidden');
			}
		});
		if (shouldScroll) {
			var exploreSection = document.querySelector('.explore');
			if (exploreSection) exploreSection.scrollIntoView({ behavior: 'smooth' });
		}
		return matches;
	}

	function wireSearchInput(form) {
		if (!form) return;
		var input = form.querySelector('input');
		if (!input) return;
		input.addEventListener('input', function () {
			runSearch(input.value, false);
		});
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			var matches = runSearch(input.value, true);
			if (input.value.trim() !== '' && matches === 0) {
				showToast('No templates matched your search.');
			}
		});
	}

	wireSearchInput(document.querySelector('.search-box'));
	wireSearchInput(document.querySelector('.search-bar'));

	/* ---------- 8. Add Template modal — a submitted template is appended directly into the
	   real template grid (not a separate cart/wishlist), so it shows up for everyone browsing,
	   exactly like the preset templates, and persists across reloads via localStorage. ---------- */
	var STORAGE_KEY = 'submittedTemplates';

	function showToast(message) {
		var toast = document.getElementById('appToast');
		if (!toast) return;
		toast.textContent = message;
		toast.classList.add('show');
		clearTimeout(showToast._t);
		showToast._t = setTimeout(function () {
			toast.classList.remove('show');
		}, 3200);
	}

	function escapeHtml(str) {
		var div = document.createElement('div');
		div.textContent = str;
		return div.innerHTML;
	}

	function normalizeUrl(url) {
		url = (url || '').trim();
		if (!url) return '';
		if (/^https?:\/\//i.test(url) || url.charAt(0) === '#') return url;
		return 'https://' + url;
	}

	/* Auto-write a description by matching keywords in the submitted name (used only when the
	   Description field is left blank). */
	var descriptionRules = [
		{ keys: ['shop', 'store', 'ecommerce', 'e-commerce', 'cart'], text: 'A stylish, conversion-focused template for online stores and ecommerce brands. Features product grids, category filters, cart-ready UI, and a fully responsive, modern design.' },
		{ keys: ['blog', 'magazine', 'news'], text: 'A clean, modern template for blogs, articles, and publishing platforms. Features a stylish homepage, featured posts, categories, and a simple, responsive layout.' },
		{ keys: ['portfolio', 'agency', 'studio', 'design'], text: 'A polished portfolio-style template for creative studios and freelancers. Features project showcases, case studies, testimonials, and a refined, responsive layout.' },
		{ keys: ['restaurant', 'cafe', 'food', 'menu'], text: 'A warm, appetizing template for restaurants and cafés. Features a menu showcase, reservations, gallery, and a fully responsive, inviting design.' },
		{ keys: ['real estate', 'realestate', 'property', 'realty'], text: 'A premium template for real estate and property listings. Features property showcases, search filters, agent profiles, and a fully responsive, professional design.' },
		{ keys: ['saas', 'app', 'dashboard', 'software', 'ai'], text: 'A modern SaaS-style template for software products and dashboards. Features a bold hero, feature highlights, pricing, and a sleek, responsive design.' },
		{ keys: ['construction', 'builder', 'contractor', 'roofing'], text: 'A bold, industrial-style template for construction and contracting businesses. Features services, project galleries, testimonials, and a rugged, professional design.' },
		{ keys: ['clinic', 'health', 'medical', 'dental', 'aesthetic'], text: 'A clean, calming template for clinics and healthcare providers. Features services, staff profiles, booking, and an elegant, responsive design.' },
		{ keys: ['school', 'education', 'course', 'academy', 'learning', 'edu'], text: 'A friendly template for schools and online learning platforms. Features course listings, admissions info, and a fully responsive, modern layout.' },
		{ keys: ['wedding', 'event', 'venue'], text: 'A romantic, elegant template for weddings and event venues. Features venue showcases, galleries, and a timeless, responsive design.' },
		{ keys: ['architecture', 'interior', 'construction '], text: 'A modern, editorial-style template for architecture and interior design firms. Features a clean portfolio, services, and a fully responsive, premium layout.' },
		{ keys: ['consult', 'advisory', 'business'], text: 'A professional, premium template for consulting and advisory firms. Features services, case studies, testimonials, and a modern corporate design.' }
	];

	function generateDescription(name) {
		var lower = name.toLowerCase();
		for (var i = 0; i < descriptionRules.length; i++) {
			for (var k = 0; k < descriptionRules[i].keys.length; k++) {
				if (lower.indexOf(descriptionRules[i].keys[k]) !== -1) {
					return descriptionRules[i].text;
				}
			}
		}
		return 'A clean, modern, fully responsive website template — ' + name + '. Ready to customize and launch quickly, with a polished, professional design.';
	}

	/* Real, working preview/download/image sets — pulled LIVE from the actual template cards
	   already on this page (not a separate hand-typed list), so the pool can never go out of
	   sync with what's really on the site, and every real template is available to match
	   against when the person leaves a field blank. */
	function normalize(str) {
		return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
	}

	function buildTemplatePool() {
		var pool = [];
		var nodes = document.querySelectorAll('.template-grid .template-card[data-preview][data-download], .featured-card[data-preview][data-download]');
		nodes.forEach(function (card) {
			var img = card.querySelector('.card-thumb img, figure img');
			var h3 = card.querySelector('h3');
			var p = card.querySelector('.card-body p');
			var badgeEls = card.querySelectorAll('.card-meta .badge');
			if (!img || !h3) return;
			pool.push({
				title: h3.textContent.trim(),
				normTitle: normalize(h3.textContent),
				image: img.getAttribute('src'),
				preview: card.getAttribute('data-preview'),
				download: card.getAttribute('data-download'),
				description: p ? p.textContent.trim() : '',
				badges: Array.prototype.map.call(badgeEls, function (b) { return b.textContent.trim(); })
			});
		});
		return pool;
	}

	var templatePool = buildTemplatePool();
	// Plain image/preview/download objects, kept only as a last-resort fallback.
	var assetPool = templatePool.map(function (t) {
		return { image: t.image, preview: t.preview, download: t.download };
	});

	/* Category keywords point at a *substring of a real title* already in templatePool, so the
	   actual image/preview/download/description are always read live from that real card. */
	var categoryRules = [
		{ keys: ['shop', 'store', 'ecommerce', 'e-commerce', 'cart', 'fashion', 'apparel'], titleHas: 'veloxis' },
		{ keys: ['portfolio', 'agency', 'studio', 'architecture', 'interior'], titleHas: 'plinth' },
		{ keys: ['saas', 'dashboard', 'software', 'inventory', 'stock'], titleHas: 'stockpilot' },
		{ keys: ['ai', 'agent', 'rfp', 'proposal', 'automation'], titleHas: 'rfpilot' },
		{ keys: ['construction', 'builder', 'contractor'], titleHas: 'construction' },
		{ keys: ['roofing', 'roof'], titleHas: 'roofing' },
		{ keys: ['clinic', 'health', 'medical', 'dental', 'aesthetic', 'skin'], titleHas: 'aesthetic' },
		{ keys: ['consult', 'advisory', 'business'], titleHas: 'consultify' },
		{ keys: ['cal', 'calc', 'calculator', 'lab'], titleHas: 'calclab' },
		{ keys: ['rose', 'marquee', 'floral', 'event', 'wedding'], titleHas: 'whiterose' },
		{ keys: ['blog', 'magazine', 'news', 'article'], titleHas: 'blog' },
		{ keys: ['school', 'academy', 'institute', 'course', 'learning', 'edu'], titleHas: 'edumaster' }
	];

	function findByTitleSubstring(fragment) {
		for (var i = 0; i < templatePool.length; i++) {
			if (templatePool[i].normTitle.indexOf(fragment) !== -1) return templatePool[i];
		}
		return null;
	}

	/* Try, in order: exact title match -> one name "contains"/"is contained by" a real title ->
	   category keyword -> shared-word overlap with a real title/description -> null. */
	function findMatchingTemplate(name) {
		var norm = normalize(name);
		if (!norm) return null;

		for (var i = 0; i < templatePool.length; i++) {
			if (templatePool[i].normTitle === norm) return templatePool[i];
		}
		for (i = 0; i < templatePool.length; i++) {
			if (templatePool[i].normTitle.indexOf(norm) !== -1 || norm.indexOf(templatePool[i].normTitle) !== -1) {
				return templatePool[i];
			}
		}
		for (i = 0; i < categoryRules.length; i++) {
			for (var k = 0; k < categoryRules[i].keys.length; k++) {
				if (norm.indexOf(categoryRules[i].keys[k]) !== -1) {
					var hit = findByTitleSubstring(categoryRules[i].titleHas);
					if (hit) return hit;
				}
			}
		}
		var words = norm.split(' ').filter(function (w) { return w.length > 2; });
		var best = null, bestScore = 0;
		for (i = 0; i < templatePool.length; i++) {
			var haystack = templatePool[i].normTitle + ' ' + normalize(templatePool[i].description);
			var score = 0;
			for (var w = 0; w < words.length; w++) {
				if (haystack.indexOf(words[w]) !== -1) score++;
			}
			if (score > bestScore) { bestScore = score; best = templatePool[i]; }
		}
		return best;
	}

	function pickAsset(name, fallbackIndex) {
		var match = findMatchingTemplate(name);
		if (match) return { image: match.image, preview: match.preview, download: match.download };
		if (assetPool.length === 0) return { image: '', preview: '#', download: '#' };
		return assetPool[fallbackIndex % assetPool.length];
	}

	/* ---------- Build one template card — EXACT same markup as the real cards on this page,
	   so a submitted template looks and works identically (Preview, Download, Favorite), plus
	   a small ✕ so the person can remove a template they added. ---------- */
	function buildTemplateCard(data) {
		var article = document.createElement('article');
		article.className = 'template-card just-added';
		article.setAttribute('data-preview', data.preview || '#');
		article.setAttribute('data-download', data.download || '#');
		if (data.id) article.setAttribute('data-tpl-id', data.id);

		var safeName = escapeHtml(data.name);
		var safeDesc = escapeHtml(data.description || generateDescription(data.name));
		var badges = (data.badges && data.badges.length) ? data.badges : ['HTML', 'CSS', 'J.S', 'Free'];
		var badgesHtml = badges.map(function (b) {
			return '<span class="badge">' + escapeHtml(b) + '</span>';
		}).join('');

		article.innerHTML =
			'<figure class="card-thumb">' +
				'<img src="' + (data.image || '') + '" alt="' + safeName + ' preview">' +
				(data.id ? '<button type="button" class="card-remove-x" aria-label="Remove this template">✕</button>' : '') +
				'<button class="fav-btn" aria-label="Add to favorites">♡</button>' +
			'</figure>' +
			'<div class="card-body">' +
				'<h3>' + safeName + '</h3>' +
				'<p>' + safeDesc + '</p>' +
				'<div class="card-meta">' + badgesHtml + '</div>' +
				'<div class="card-actions">' +
					'<button type="button" class="btn btn-outline">Preview</button>' +
					'<button type="button" class="btn btn-primary">Download</button>' +
				'</div>' +
			'</div>';

		wireTemplateCard(article); // same Preview/Download wiring the real cards use
		wireFavButton(article.querySelector('.fav-btn')); // same favorite-heart wiring

		if (data.id) {
			var removeBtn = article.querySelector('.card-remove-x');
			if (removeBtn) {
				removeBtn.addEventListener('click', function () {
					removeSubmittedTemplate(data.id, article);
				});
			}
		}

		return article;
	}

	function getStoredTemplates() {
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
		} catch (e) {
			return [];
		}
	}

	function saveStoredTemplates(list) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	}

	function generateId() {
		return 'tpl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
	}

	/* Add a newly submitted template: save it, then append it straight into the visible grid. */
	function addSubmittedTemplate(data) {
		data.id = data.id || generateId();
		var stored = getStoredTemplates();
		stored.push(data);
		saveStoredTemplates(stored);

		var grid = document.querySelector('.template-grid');
		if (grid) grid.appendChild(buildTemplateCard(data));

		showToast('Template added!');
	}

	/* Remove a template the person previously submitted (✕ button on its card). */
	function removeSubmittedTemplate(id, article) {
		var stored = getStoredTemplates().filter(function (t) { return t.id !== id; });
		saveStoredTemplates(stored);
		if (article && article.parentNode) article.parentNode.removeChild(article);
		showToast('Template removed.');
	}

	/* Re-add previously submitted templates on page load so they keep showing up in the grid. */
	function renderStoredTemplates() {
		var grid = document.querySelector('.template-grid');
		if (!grid) return;
		var stored = getStoredTemplates();
		var changed = false;
		stored.forEach(function (data) {
			if (!data.id) { data.id = generateId(); changed = true; }
			var card = buildTemplateCard(data);
			card.classList.remove('just-added');
			grid.appendChild(card);
		});
		if (changed) saveStoredTemplates(stored);
	}
	renderStoredTemplates();

	/* Modal open/close */
	var submitModalOverlay = document.getElementById('submitModalOverlay');
	var submitTemplateForm = document.getElementById('submitTemplateForm');

	function openSubmitModal() {
		if (submitModalOverlay) {
			submitModalOverlay.classList.add('open');
			var firstField = document.getElementById('tplName');
			if (firstField) firstField.focus();
		}
	}

	function closeSubmitModal() {
		if (submitModalOverlay) {
			submitModalOverlay.classList.remove('open');
		}
	}

	['submitTemplateBtn', 'footerAddTemplateBtn'].forEach(function (id) {
		var btn = document.getElementById(id);
		if (btn) {
			btn.addEventListener('click', function (e) {
				e.preventDefault();
				openSubmitModal();
			});
		}
	});

	var submitModalClose = document.getElementById('submitModalClose');
	var submitModalCancel = document.getElementById('submitModalCancel');
	if (submitModalClose) submitModalClose.addEventListener('click', closeSubmitModal);
	if (submitModalCancel) submitModalCancel.addEventListener('click', closeSubmitModal);
	if (submitModalOverlay) {
		submitModalOverlay.addEventListener('click', function (e) {
			if (e.target === submitModalOverlay) closeSubmitModal();
		});
	}
	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Escape') return;
		if (submitModalOverlay && submitModalOverlay.classList.contains('open')) closeSubmitModal();
	});

	/* Form submit -> use whatever the person filled in; anything left blank (description,
	   badges, link, image) is auto-filled from a matching real template, or a sensible
	   generic default — so the new card is always fully working. The one Template Link the
	   person gives is used for BOTH Preview and Download, same as a normal link would be. */
	if (submitTemplateForm) {
		submitTemplateForm.addEventListener('submit', function (e) {
			e.preventDefault();

			var name = document.getElementById('tplName').value.trim();
			if (!name) {
				showToast('Please enter a template name.');
				return;
			}

			var descriptionInput = document.getElementById('tplDescription').value.trim();
			var badgesInput = document.getElementById('tplBadges').value.trim();
			var linkInput = normalizeUrl(document.getElementById('tplLink').value);
			var fileInput = document.getElementById('tplImage');
			var file = fileInput && fileInput.files && fileInput.files[0];

			var match = findMatchingTemplate(name);
			var fallbackAsset = pickAsset(name, getStoredTemplates().length);

			// A real .zip/.rar link actually downloads something when clicked. A normal
			// "https://my-site.com" live-preview link does NOT — clicking Download on it just
			// opens the page in a new tab, same as Preview, with nothing ever saved to disk.
			// That's why a submitted template's Download button looked broken compared to the
			// real cards (whose Download buttons point straight at a GitHub .zip archive).
			function looksDownloadable(url) {
				return /\.(zip|rar|7z|tar\.gz|tgz)(\?.*)?$/i.test(url);
			}

			var badges = badgesInput
				? badgesInput.split(',').map(function (b) { return b.trim(); }).filter(function (b) { return b; })
				: ((match && match.badges && match.badges.length) ? match.badges : ['HTML', 'CSS', 'J.S', 'Free']);

			var description = descriptionInput || (match ? match.description : generateDescription(name));
			// Preview can be any link the person gives (their live site, GitHub repo, etc).
			// Download only uses that link when it's an actual downloadable file; otherwise it
			// falls back to a real, working .zip — so Download always behaves like the other
			// template cards instead of silently just opening a tab.
			var preview = linkInput || fallbackAsset.preview;
			var download = (linkInput && looksDownloadable(linkInput)) ? linkInput : fallbackAsset.download;

			function finish(imageSrc) {
				addSubmittedTemplate({
					name: name,
					description: description,
					image: imageSrc || fallbackAsset.image,
					preview: preview,
					download: download,
					badges: badges
				});
				submitTemplateForm.reset();
				closeSubmitModal();
			}

			if (file) {
				var reader = new FileReader();
				reader.onload = function () { finish(reader.result); };
				reader.onerror = function () { finish(''); };
				reader.readAsDataURL(file);
			} else {
				finish('');
			}
		});
	}

	/* ---------- 9. Navbar & footer quick links smooth scroll ---------- */
	var navLinkMap = {
		'Home': '.hero',
		'Templates': '.explore',
		'Categories': '.explore'
	};
	document.querySelectorAll('.nav-menu a').forEach(function (link) {
		var text = link.textContent.replace('▾', '').trim();
		if (navLinkMap[text]) {
			link.addEventListener('click', function (e) {
				e.preventDefault();
				var target = document.querySelector(navLinkMap[text]);
				if (target) target.scrollIntoView({ behavior: 'smooth' });
			});
		}
	});

	var footerScrollMap = { hero: '.hero', explore: '.explore' };
	document.querySelectorAll('.footer-links a[data-scroll]').forEach(function (link) {
		var key = link.getAttribute('data-scroll');
		if (footerScrollMap[key]) {
			link.addEventListener('click', function (e) {
				e.preventDefault();
				var target = document.querySelector(footerScrollMap[key]);
				if (target) target.scrollIntoView({ behavior: 'smooth' });
			});
		}
	});

	/* ---------- 10. "View All" (Featured Templates) scrolls to Explore section ---------- */
	var viewAllLink = document.querySelector('.view-all');
	if (viewAllLink) {
		viewAllLink.addEventListener('click', function (e) {
			e.preventDefault();
			var target = document.querySelector('.explore');
			if (target) target.scrollIntoView({ behavior: 'smooth' });
		});
	}

});
