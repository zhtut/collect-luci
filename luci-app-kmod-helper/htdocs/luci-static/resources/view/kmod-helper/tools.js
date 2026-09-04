'use strict';
'require view';
'require rpc';
'require ui';

var callLsmod = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'list_loaded_modules',
	expect: { '': {} }
});

var callDmesg = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'get_dmesg',
	params: ['lines'],
	expect: { '': {} }
});

var callModinfo = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'get_modinfo',
	params: ['module'],
	expect: { '': {} }
});

return view.extend({
	load: function() {
		return Promise.all([
			callLsmod().catch(function() { return { modules: [] }; }),
			callDmesg(200).catch(function() { return { log: '' }; })
		]);
	},

	render: function(results) {
		var self = this;
		var lsmod = results[0] || { modules: [] };
		var dmesg = results[1] || { log: '' };

		var modRows = (lsmod.modules || []).map(function(m) {
			return E('tr', {}, [
				E('td', { 'class': 'td left' }, m.name),
				E('td', { 'class': 'td left' }, m.size),
				E('td', { 'class': 'td left' }, m.used)
			]);
		});
		var lsmodTable = modRows.length ? E('table', { 'class': 'table cbi-section-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th left' }, _('Module')),
				E('th', { 'class': 'th left' }, _('Size')),
				E('th', { 'class': 'th left' }, _('Used by'))
			])
		].concat(modRows)) : E('div', { 'class': 'cbi-section-descr' }, _('No loaded modules or lsmod unavailable.'));

		var dmesgPre = E('pre', { 'style': 'max-height:24em;overflow:auto;background:#f5f5f5;padding:0.5em' }, dmesg.log || _('No kernel log.'));

		var modinfoInput = E('input', { 'class': 'cbi-input-text', 'type': 'text', 'placeholder': 'wireguard', 'style': 'width:16em' });
		var modinfoOut = E('pre', { 'style': 'max-height:16em;overflow:auto;background:#f5f5f5;padding:0.5em;margin-top:0.5em' }, '');
		function doModinfo() {
			var name = modinfoInput.value.trim();
			if (!name) return;
			modinfoOut.textContent = _('Loading...');
			callModinfo(name).then(function(res) {
				modinfoOut.textContent = (res && res.success) ? res.info : ((res && res.error) || _('No info'));
			}).catch(function(e) {
				modinfoOut.textContent = _('Error: %s').format(e.message || e);
			});
		}
		modinfoInput.addEventListener('keydown', function(ev) { if (ev.key === 'Enter') doModinfo(); });

		var refreshDmesg = E('button', { 'class': 'btn cbi-button', 'click': function() {
			callDmesg(200).then(function(res) { dmesgPre.textContent = res.log || ''; });
		} }, _('Refresh'));

		return E('div', {}, [
			E('h2', {}, _('Kernel Tools')),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('Loaded Kernel Modules (lsmod)')),
				lsmodTable
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('Module Information (modinfo)')),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Module Name')),
					E('div', { 'class': 'cbi-value-field' }, [
						modinfoInput, ' ',
						E('button', { 'class': 'btn cbi-button', 'click': doModinfo }, _('Query'))
					])
				]),
				modinfoOut
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('Kernel Log (dmesg)')),
				E('div', { 'style': 'margin-bottom:0.5em' }, [ refreshDmesg ]),
				dmesgPre
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
