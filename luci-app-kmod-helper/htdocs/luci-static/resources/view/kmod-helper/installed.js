'use strict';
'require view';
'require rpc';
'require ui';

var callGetInstalled = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'get_installed_kmods',
	expect: { '': {} }
});

var callRemoveKmod = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'remove_kmod',
	params: ['package'],
	expect: { '': {} }
});

return view.extend({
	load: function() {
		return callGetInstalled().catch(function() { return { packages: [] }; });
	},

	doRemove: function(name, btn) {
		var self = this;
		if (!confirm(_('Really remove %s? Removing kernel modules may break functionality.').format(name))) return;
		btn.disabled = true;
		btn.textContent = _('Removing...');
		callRemoveKmod(name).then(function(res) {
			if (res && res.success) {
				ui.addNotification(null, E('p', _('Removed %s.').format(name)), 'info');
				return callGetInstalled().then(function(r) { self.renderList(r); });
			} else {
				btn.disabled = false;
				btn.textContent = _('Remove');
				ui.addNotification(null, E('p', [
					E('strong', {}, _('Remove failed: ')),
					E('pre', { 'style': 'white-space:pre-wrap' }, (res && res.output) || _('Unknown error'))
				]), 'error');
			}
		}).catch(function(e) {
			btn.disabled = false;
			btn.textContent = _('Remove');
			ui.addNotification(null, E('p', _('Error: %s').format(e.message || e)), 'error');
		});
	},

	renderList: function(res) {
		var self = this;
		var old = document.getElementById('installed-kmods');
		if (!old) return;
		while (old.firstChild) old.removeChild(old.firstChild);
		old.appendChild(this.buildTable(res));
	},

	buildTable: function(res) {
		var self = this;
		res = res || {};
		var pkgs = res.packages || [];
		if (!pkgs.length) {
			return E('div', { 'class': 'cbi-section-descr' }, _('No kmod packages installed (or package manager not supported).'));
		}
		var rows = pkgs.map(function(p) {
			var btn = E('button', { 'class': 'btn cbi-button cbi-button-negative' }, _('Remove'));
			btn.addEventListener('click', function() { self.doRemove(p.name, btn); });
			return E('tr', {}, [
				E('td', { 'class': 'td left' }, E('strong', {}, p.name)),
				E('td', { 'class': 'td left' }, p.version || '-'),
				E('td', { 'class': 'td left' }, btn)
			]);
		});
		return E('table', { 'class': 'table cbi-section-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th left' }, _('Package')),
				E('th', { 'class': 'th left' }, _('Version')),
				E('th', { 'class': 'th left' }, _('Action'))
			])
		].concat(rows));
	},

	render: function(res) {
		return E('div', {}, [
			E('h2', {}, _('Installed Kernel Modules')),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-descr' },
					_('All installed kernel module packages (kmod-*). Package manager: %s').format((res && res.manager) || _('unknown')),
					E('br'),
					E('strong', { 'style': 'color:#c00' }, _('Warning: removing kernel modules may cause network/driver failure. Proceed with caution.'))),
				E('div', { 'id': 'installed-kmods' }, [ this.buildTable(res) ])
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
