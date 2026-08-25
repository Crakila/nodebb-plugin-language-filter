'use strict';

(function () {
	var debounceTimer = null;
	var WARNING_ID = 'language-filter-warning';
	var minLength = null;
	var DEBOUNCE_MS = 750;
	var BLOCKED_TOAST_TIMEOUT_MS = 30000;

	function extendBlockedToast($toast) {
		var timeoutId = parseInt($toast.attr('timeoutId'), 10);
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		$toast.removeAttr('timeoutId');

		var $progress = $toast.find('.alert-progress');
		$progress.css('transition-property', 'none').removeClass('animate');
		setTimeout(function () {
			$progress.css('transition-property', '');
			$progress.css('transition', 'width ' + (BLOCKED_TOAST_TIMEOUT_MS + 450) + 'ms linear');
			$progress.addClass('animate');
		}, 60);

		$toast.attr('timeoutId', setTimeout(function () {
			$toast.removeAttr('timeoutId');
			$toast.alert('close');
		}, BLOCKED_TOAST_TIMEOUT_MS));
	}

	function enhanceBlockedToast(data) {
		if (!data || !data.alert) {
			return;
		}
		var message = String(data.params && data.params.message || '');
		var match = message.match(/^(Only .+ posts are allowed on .+\.) Why\? (https?:\/\/\S+)$/);
		if (!match) {
			return;
		}

		var $message = data.alert.find('p');
		$message.empty().append(document.createTextNode(match[1] + ' '), $('<a>', {
			href: match[2],
			text: 'Why?',
			'class': 'link-light text-decoration-underline',
			target: '_blank',
			rel: 'noopener noreferrer',
		}));
		extendBlockedToast(data.alert);
	}

	function showWarning(message, moreInfoUrl) {
		var $existing = $('#' + WARNING_ID);
		var $content = $('<span>').text(message);
		if (moreInfoUrl) {
			$content.append(' ').append($('<a>', {
				href: moreInfoUrl,
				text: 'Why?',
				target: '_blank',
				rel: 'noopener noreferrer',
			}));
		}
		if ($existing.length) {
			$existing.empty().append($('<i>', { 'class': 'fa fa-exclamation-triangle' }), ' ', $content);
			return;
		}

		var $warning = $('<div>', {
			id: WARNING_ID,
			'class': 'alert alert-danger mb-0 text-white',
			style: 'margin: 4px 12px; padding: 8px 12px; font-size: 15px;',
		}).append($('<i>', { 'class': 'fa fa-exclamation-triangle' }), ' ', $content);

		var $writePreview = $('[component="composer"] .write-preview-container');
		if ($writePreview.length) {
			$writePreview.after($warning);
		} else {
			$('[component="composer"]').append($warning);
		}
	}

	function hideWarning() {
		$('#' + WARNING_ID).remove();
	}

	function checkLanguage(text) {
		$.get(config.relative_path + '/api/language-filter/check', { text: text })
			.done(function (res) {
				if (res && typeof res.minLength === 'number') {
					minLength = res.minLength;
				}

				if (res && res.allowed === false) {
					showWarning(res.message, res.moreInfoUrl);
				} else {
					hideWarning();
				}
			});
	}

	function attachToComposer() {
		var $textarea = $('[component="composer"] textarea.write');
		if (!$textarea.length) {
			return;
		}

		$textarea.off('input.langfilter').on('input.langfilter', function () {
			var text = $(this).val().replace(/<[^>]*>/g, '').trim();
			clearTimeout(debounceTimer);
			if (minLength !== null && text.length < minLength) {
				hideWarning();
				return;
			}
			debounceTimer = setTimeout(function () {
				checkLanguage(text);
			}, DEBOUNCE_MS);
		});
	}

	$(window).on('action:composer.loaded', attachToComposer);
	$(window).on('action:composer.discard action:composer.post.submit', hideWarning);
	$(window).on('action:alert.new', function (ev, data) {
		enhanceBlockedToast(data);
	});
}());
