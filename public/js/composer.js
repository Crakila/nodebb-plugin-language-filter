'use strict';

(function () {
	var debounceTimer = null;
	var WARNING_ID = 'language-filter-warning';
	var minLength = null;
	var DEBOUNCE_MS = 750;

	function showWarning(message) {
		var $existing = $('#' + WARNING_ID);
		if ($existing.length) {
			$existing.html(message);
			return;
		}

		var $warning = $('<div>', {
			id: WARNING_ID,
			'class': 'alert alert-danger mb-0 text-white',
			style: 'margin: 4px 12px; padding: 8px 12px; font-size: 15px;',
		}).html('<i class="fa fa-exclamation-triangle"></i> ' + message);

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
}());
