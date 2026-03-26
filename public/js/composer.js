'use strict';

(function () {
	var debounceTimer = null;
	var WARNING_ID = 'language-filter-warning';
	var MIN_LENGTH = 10;
	var DEBOUNCE_MS = 750;

	function showWarning(message) {
		var $existing = $('#' + WARNING_ID);
		if ($existing.length) {
			$existing.html(message);
			return;
		}

		var $warning = $('<div>', {
			id: WARNING_ID,
			'class': 'alert alert-warning mb-0',
			style: 'margin: 4px 12px; padding: 8px 12px; font-size: 13px;',
		}).html('<i class="fa fa-exclamation-triangle"></i> ' + message);

		var $footer = $('[component="composer/footer"]');
		if ($footer.length) {
			$footer.before($warning);
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
				if (res && res.allowed === false) {
					showWarning(res.message);
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
			if (text.length < MIN_LENGTH) {
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
}());
