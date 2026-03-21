<div class="acp-page-container">
    <!-- IMPORT admin/partials/settings/header.tpl -->

    <div class="row m-0">
        <div id="spy-container" class="col-12 px-0 mb-4" tabindex="0">
            <div class="card">
                <div class="card-header">Language Filter Settings</div>
                <div class="card-body">

                    <p>Select which languages are allowed to be posted. Posts in any other language will be blocked.</p>
                    <p class="text-muted">Note: Posts that are too short to detect reliably, or where the language cannot be determined, will always be allowed through.</p>

                    <hr />

                    <h5>Allowed Languages</h5>
                    <p>Tick the languages you want to allow. At least one language must be selected.</p>
                    <div class="mb-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary" id="select-all-langs">Select All</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary ms-1" id="select-none-langs">Select None</button>
                    </div>

                    <div class="row" id="language-list">
                        <!-- Populated by JS -->
                    </div>

                    <hr />

                    <div class="mb-3">
                        <h5>Minimum Text Length</h5>
                        <p>Posts shorter than this many characters will skip language detection and always be allowed through. Must be greater than or equal to the <a href="/admin/settings/post">minimum post length</a> (currently <strong id="min-post-length-display">{minPostLength}</strong> characters).</p>
                        <input type="number" class="form-control" id="min-length" min="1" max="500" style="width: 120px;" />
                    </div>

                    <hr />

                    <div class="mb-3">
                        <h5>More Info URL</h5>
                        <p>Link shown in the blocked-post error message.</p>
                        <input type="text" class="form-control" id="more-info-url" style="max-width: 480px;" />
                    </div>

                </div>
            </div>
        </div>
    </div>
</div>

<input type="hidden" id="allowed-langs-data" value="{allowedLangs}" />
<input type="hidden" id="min-length-data" value="{minLength}" />
<input type="hidden" id="more-info-url-data" value="{moreInfoUrl}" />
<input type="hidden" id="min-post-length-data" value="{minPostLength}" />
