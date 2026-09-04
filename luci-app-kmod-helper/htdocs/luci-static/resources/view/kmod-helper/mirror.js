'use strict';
'require view';
'require rpc';
'require ui';
'require form';

var callGetConfig = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'get_config',
	expect: { '': {} }
});

var callSetMirror = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'set_mirror',
	params: ['mirror', 'custom_mirror', 'use_custom'],
	expect: { '': {} }
});

var callTestMirror = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'test_mirror',
	params: ['mirror'],
	expect: { '': {} }
});

var PRESET_MIRRORS = [
	{ name: 'PKU Mirror (Beijing Univ.) - immortalwrt', url: 'https://mirrors.pku.edu.cn/immortalwrt/' }
];

return view.extend({
	load: function() {
		return callGetConfig().catch(function() { return {}; });
	},

	render: function(cfg) {
		cfg = cfg || {};
		var useCustom = (cfg.use_custom === '1');
		var presetUrl = cfg.mirror || PRESET_MIRRORS[0].url;
		var customUrl = cfg.custom_mirror || '';

		var presetSel = E('select', { 'class': 'cbi-input-select', 'id': 'preset-mirror', 'style': 'width:26em' },
			PRESET_MIRRORS.map(function(m) {
				return E('option', { 'value': m.url, 'selected': (m.url === presetUrl) ? '' : null }, m.name + ' (' + m.url + ')');
			})
		);

		var customInput = E('input', {
			'class': 'cbi-input-text',
			'id': 'custom-mirror',
			'type': 'text',
			'style': 'width:26em',
			'placeholder': 'https://example.com/immortalwrt/',
			'value': customUrl
		});

		var radioPreset = E('input', { 'type': 'radio', 'name': 'mirror-type', 'id': 'type-preset', 'checked': !useCustom ? '' : null });
		var radioCustom = E('input', { 'type': 'radio', 'name': 'mirror-type', 'id': 'type-custom', 'checked': useCustom ? '' : null });

		function updateState() {
			customInput.disabled = !radioCustom.checked;
			presetSel.disabled = !radioPreset.checked;
		}
		radioPreset.addEventListener('change', updateState);
		radioCustom.addEventListener('change', updateState);
		updateState();

		var statusEl = E('span', { 'style': 'margin-left:1em' }, '');

		var self = this;
		function doSave() {
			var isCustom = radioCustom.checked;
			var url = isCustom ? customInput.value.trim() : presetSel.value;
			if (!url) {
				ui.addNotification(null, E('p', _('Please enter a mirror URL.')), 'error');
				return;
			}
			if (url.charAt(url.length - 1) !== '/') url += '/';
			ui.showModal(_('Saving'), [E('p', { 'class': 'spinning' }, _('Saving mirror settings...'))]);
			callSetMirror(presetSel.value, customInput.value.trim(), isCustom ? '1' : '0').then(function(res) {
				ui.hideModal();
				if (res && res.success) {
					ui.addNotification(null, E('p', _('Mirror saved and applied immediately: %s').format(res.effective_mirror || url)), 'info');
				} else {
					ui.addNotification(null, E('p', _('Failed to save mirror.')), 'error');
				}
			}).catch(function(e) {
				ui.hideModal();
				ui.addNotification(null, E('p', _('Error: %s').format(e.message || e)), 'error');
			});
		}

		function doTest() {
			var isCustom = radioCustom.checked;
			var url = isCustom ? customInput.value.trim() : presetSel.value;
			if (!url) return;
			if (url.charAt(url.length - 1) !== '/') url += '/';
			statusEl.textContent = _('Testing...');
			callTestMirror(url).then(function(res) {
				if (res && res.success) {
					statusEl.textContent = '✓ ' + _('Mirror is reachable');
					statusEl.style.color = 'green';
				} else {
					statusEl.textContent = '✗ ' + _('Mirror is unreachable');
					statusEl.style.color = 'red';
				}
			}).catch(function() {
				statusEl.textContent = '✗ ' + _('Test failed');
				statusEl.style.color = 'red';
			});
		}

		return E('div', {}, [
			E('h2', {}, _('Mirror Settings')),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-descr' },
					_('Select a preset mirror or enter a custom one. The mirror is used to locate and download kmod kernel module packages. Saved settings take effect immediately (no reboot needed).')),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, [
						radioPreset, ' ', _('Preset Mirror')
					]),
					E('div', { 'class': 'cbi-value-field' }, presetSel)
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, [
						radioCustom, ' ', _('Custom Mirror')
					]),
					E('div', { 'class': 'cbi-value-field' }, customInput)
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, ''),
					E('div', { 'class': 'cbi-value-field' }, [
						E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': doSave }, _('Save & Apply')),
						' ',
						E('button', { 'class': 'btn cbi-button', 'click': doTest }, _('Test Connectivity')),
						statusEl
					])
				])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
