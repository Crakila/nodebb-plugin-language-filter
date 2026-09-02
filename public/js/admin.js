'use strict';

define('admin/plugins/language-filter', ['alerts', 'admin/plugins/language-filter-languages'], function (alerts, LANGUAGES) {

    var Admin = {};

    Admin.init = function () {
        var savedLanguagesRaw = $('#allowed-langs-data').val();
        var savedLanguages = savedLanguagesRaw ? savedLanguagesRaw.split(',') : ['eng'];
        var $list = $('#language-list');

        // Set min length field
        var minLengthRaw = parseInt($('#min-length-data').val(), 10);
        $('#min-length').val(isNaN(minLengthRaw) ? 10 : minLengthRaw);

        // Set more info URL field
        $('#more-info-url').val($('#more-info-url-data').val() || '');

        // Build language checkboxes
        LANGUAGES.forEach(function (lang) {
            var checked = savedLanguages.indexOf(lang.code) !== -1 ? 'checked' : '';
            var col = $([
                '<div class="col-sm-4" style="margin-bottom: 8px;">',
                '<div class="checkbox"><label>',
                '<input type="checkbox" class="lang-checkbox" value="' + lang.code + '" ' + checked + '> ',
                lang.label,
                '</label></div>',
                '</div>',
            ].join(''));
            $list.append(col);
        });

        // Select All / Select None
        $('#select-all-langs').on('click', function () {
            $('.lang-checkbox').prop('checked', true);
        });
        $('#select-none-langs').on('click', function () {
            $('.lang-checkbox').prop('checked', false);
        });

        // Save button
        $('#save').on('click', function () {
            var selected = [];
            $('.lang-checkbox:checked').each(function () {
                selected.push($(this).val());
            });

            if (selected.length === 0) {
                alerts.error('At least one language must be selected.');
                return;
            }

            var minLen = parseInt($('#min-length').val(), 10) || 10;
            var minPostLen = parseInt($('#min-post-length-data').val(), 10) || 0;
            if (minLen < minPostLen) {
                alerts.error('Minimum text length (' + minLen + ') must be greater than the minimum post length (' + minPostLen + '). Update it at Admin &gt; Settings &gt; Post.');
                return;
            }
            var moreInfoUrlVal = $('#more-info-url').val().trim();

            $.ajax({
                url: config.relative_path + '/admin/plugins/language-filter/save',
                type: 'POST',
                data: {
                    allowedLangs: JSON.stringify(selected),
                    minLength: minLen,
                    moreInfoUrl: moreInfoUrlVal,
                    _csrf: config.csrf_token,
                },
                success: function (res) {
                    if (res.success) {
                        alerts.success('Settings saved!');
                    }
                },
                error: function () {
                    alert('Error saving settings. Please try again.');
                },
            });
        });
    };

    return Admin;
});
