'use strict';
'require view';
'require rpc';
'require ui';

var callGetDeviceInfo = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'get_device_info',
	expect: { '': {} }
});

var callListKernelDirs = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'list_kernel_dirs',
	params: ['version', 'target', 'subtarget', 'mirror'],
	expect: { '': {} }
});

var callSearchKmods = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'search_kmods',
	params: ['base_url', 'keyword'],
	expect: { '': {} }
});

var callGetInstalled = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'get_installed_kmods',
	expect: { '': {} }
});

var callInstallKmod = rpc.declare({
	object: 'luci.kmod-helper',
	method: 'install_kmod',
	params: ['package', 'url', 'force'],
	expect: { '': {} }
});

return view.extend({
	deviceInfo: null,
	kernelDirs: [],
	selectedDirUrl: null,
	installedSet: {},
	searchResults: [],

	load: function() {
		var self = this;
		self.deviceInfo = null;
		self.kernelDirs = [];
		self.kernelDirsBaseUrl = '';
		self.kernelDirsError = null;
		self.selectedDirUrl = null;
		self.matchType = 'none';
		self.installedSet = {};
		self.searchResults = [];
		return callGetDeviceInfo().then(function(info) {
			self.deviceInfo = info || {};
			return Promise.all([
				callListKernelDirs(
					self.deviceInfo.release,
					self.deviceInfo.target,
					self.deviceInfo.subtarget,
					self.deviceInfo.mirror
				).catch(function() { return { success: false, dirs: [] }; }),
				callGetInstalled().catch(function() { return { packages: [] }; })
			]);
		}).then(function(results) {
			var dirsRes = results[0] || {};
			var instRes = results[1] || {};
			self.kernelDirs = dirsRes.dirs || [];
			self.kernelDirsBaseUrl = dirsRes.base_url || '';
			self.kernelDirsError = dirsRes.success ? null : (dirsRes.error || _('Failed to list kernel directories'));
			(instRes.packages || []).forEach(function(p) {
				self.installedSet[p.name] = true;
			});
			self.autoSelectKernelDir();
			return null;
		});
	},

	kernelMajor: function() {
		var k = (this.deviceInfo && this.deviceInfo.kernel) || '';
		var m = k.match(/^(\d+\.\d+)\./);
		return m ? m[1] : '';
	},

	autoSelectKernelDir: function() {
		var self = this;
		var vm = (this.deviceInfo && this.deviceInfo.vermagic) || '';
		var major = this.kernelMajor();
		var dirs = this.kernelDirs || [];
		this.selectedDirUrl = null;
		this.matchType = 'none';

		if (!dirs.length) return;

		// 1. exact vermagic match
		for (var i = 0; i < dirs.length; i++) {
			if (vm && dirs[i].name === vm) {
				this.selectedDirUrl = dirs[i].url;
				this.matchType = 'exact';
				return;
			}
		}
		// 2. same kernel major version, pick the last (newest)
		var sameMajor = dirs.filter(function(d) { return d.name.indexOf(major + '.') === 0; });
		if (sameMajor.length) {
			this.selectedDirUrl = sameMajor[sameMajor.length - 1].url;
			this.matchType = 'major';
			return;
		}
		// 3. fallback: newest directory overall
		this.selectedDirUrl = dirs[dirs.length - 1].url;
		this.matchType = 'fallback';
	},

	renderKernelDirSelector: function() {
		var self = this;
		var info = this.deviceInfo || {};

		if (this.kernelDirsError) {
			return E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'alert-message warning' }, [
					E('strong', {}, _('Could not list kernel directories: ')),
					this.kernelDirsError,
					E('br'),
					E('small', {}, this.kernelDirsBaseUrl || '')
				])
			]);
		}

		if (!this.kernelDirs.length) {
			return E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'alert-message warning' }, _('No kernel directories found on the mirror for this device/version.'))
			]);
		}

		var sel = E('select', { 'class': 'cbi-input-select', 'style': 'width:34em' },
			this.kernelDirs.map(function(d) {
				var label = d.name;
				if (d.url === self.selectedDirUrl) label += '  ★';
				return E('option', { 'value': d.url, 'selected': (d.url === self.selectedDirUrl) ? '' : null }, label);
			})
		);
		sel.addEventListener('change', function(ev) {
			self.selectedDirUrl = ev.target.value;
			self.matchType = 'manual';
			self.searchResults = [];
			self.refreshResults();
		});

		var matchMsg = '';
		if (this.matchType === 'exact') matchMsg = _('Exact kernel vermagic match found.');
		else if (this.matchType === 'major') matchMsg = _('No exact vermagic match. Using the newest directory matching your kernel version (%s).').format(this.kernelMajor());
		else if (this.matchType === 'fallback') matchMsg = _('No directory matches your kernel version. Using the newest available directory; installation may still fail.');
		else matchMsg = _('Manually selected kernel directory.');

		return E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, _('Kernel Package Source')),
			E('table', { 'class': 'table' }, [
				E('tr', {}, [
					E('td', { 'class': 'td left', 'style': 'width:33%;font-weight:bold' }, _('Kernel Directory')),
					E('td', { 'class': 'td left' }, sel)
				]),
				E('tr', {}, [
					E('td', { 'class': 'td left', 'style': 'font-weight:bold' }, _('Match Status')),
					E('td', { 'class': 'td left' }, matchMsg)
				]),
				E('tr', {}, [
					E('td', { 'class': 'td left', 'style': 'font-weight:bold' }, _('Base URL')),
					E('td', { 'class': 'td left' }, E('small', {}, this.selectedDirUrl || '-'))
				])
			])
		]);
	},

	doSearch: function(keyword) {
		var self = this;
		if (!this.selectedDirUrl) {
			ui.addNotification(null, E('p', _('No kernel directory selected.')), 'error');
			return;
		}
		ui.showModal(_('Searching'), [E('p', { 'class': 'spinning' }, _('Fetching package index from mirror...'))]);
		callSearchKmods(this.selectedDirUrl, keyword || '').then(function(res) {
			ui.hideModal();
			if (res && res.success) {
				self.searchResults = res.packages || [];
				if (!self.searchResults.length) {
					ui.addNotification(null, E('p', _('No matching kmod packages found.')), 'info');
				}
				self.refreshResults();
			} else {
				ui.addNotification(null, E('p', (res && res.error) || _('Search failed.')), 'error');
			}
		}).catch(function(e) {
			ui.hideModal();
			ui.addNotification(null, E('p', _('Search error: %s').format(e.message || e)), 'error');
		});
	},

	doInstall: function(pkg, btn) {
		var self = this;
		var force = document.getElementById('force-nodeps');
		var useForce = force ? (force.checked ? '1' : '0') : '1';
		var url = (this.selectedDirUrl || '') + (pkg.filename || ('' + pkg.name + '_' + pkg.version + '.ipk'));
		btn.disabled = true;
		btn.textContent = _('Installing...');
		btn.classList.add('spinning');
		callInstallKmod(pkg.name, url, useForce).then(function(res) {
			btn.classList.remove('spinning');
			if (res && res.success) {
				self.installedSet[pkg.name] = true;
				btn.textContent = _('Installed');
				btn.disabled = true;
				btn.classList.add('cbi-button-disabled');
				ui.addNotification(null, E('p', _('Installed %s successfully.').format(pkg.name)), 'info');
			} else {
				btn.disabled = false;
				btn.textContent = _('Install');
				ui.addNotification(null, E('p', [
					E('strong', {}, _('Install failed: ')),
					E('pre', { 'style': 'white-space:pre-wrap;max-height:12em;overflow:auto' }, (res && res.output) || _('Unknown error'))
				]), 'error');
			}
		}).catch(function(e) {
			btn.classList.remove('spinning');
			btn.disabled = false;
			btn.textContent = _('Install');
			ui.addNotification(null, E('p', _('Install error: %s').format(e.message || e)), 'error');
		});
	},

	refreshResults: function() {
		var container = document.getElementById('kmod-results');
		if (!container) return;
		while (container.firstChild) container.removeChild(container.firstChild);
		container.appendChild(this.renderResults());
	},

	renderResults: function() {
		var self = this;
		if (!this.searchResults.length) {
			return E('div', { 'class': 'cbi-section-descr' }, _('Enter a keyword (e.g. kmod-wireguard) and click Search. Leave empty to list all available kmod packages (first 200).'));
		}
		var rows = this.searchResults.map(function(pkg) {
			var installed = !!self.installedSet[pkg.name];
			var btn = E('button', {
				'class': 'btn cbi-button ' + (installed ? 'cbi-button-disabled' : 'cbi-button-positive'),
				'disabled': installed ? '' : null
			}, installed ? _('Installed') : _('Install'));
			if (!installed) {
				btn.addEventListener('click', function() { self.doInstall(pkg, btn); });
			}
			return E('tr', {}, [
				E('td', { 'class': 'td left' }, E('strong', {}, pkg.name)),
				E('td', { 'class': 'td left' }, pkg.version || '-'),
				E('td', { 'class': 'td left' }, E('small', {}, pkg.description || '-')),
				E('td', { 'class': 'td left' }, pkg.size || '-'),
				E('td', { 'class': 'td left' }, btn)
			]);
		});
		return E('table', { 'class': 'table cbi-section-table' }, [
			E('tr', { 'class': 'tr table-titles' }, [
				E('th', { 'class': 'th left' }, _('Package')),
				E('th', { 'class': 'th left' }, _('Version')),
				E('th', { 'class': 'th left' }, _('Description')),
				E('th', { 'class': 'th left' }, _('Size (bytes)')),
				E('th', { 'class': 'th left' }, _('Action'))
			])
		].concat(rows));
	},

	render: function() {
		var self = this;
		var searchInput = E('input', {
			'class': 'cbi-input-text',
			'type': 'text',
			'id': 'kmod-keyword',
			'style': 'width:20em',
			'placeholder': 'kmod-wireguard'
		});
		searchInput.addEventListener('keydown', function(ev) {
			if (ev.key === 'Enter') self.doSearch(searchInput.value.trim());
		});

		var forceChk = E('input', { 'type': 'checkbox', 'id': 'force-nodeps', 'checked': '' });

		return E('div', {}, [
			E('h2', {}, _('Install Kernel Modules')),
			this.renderKernelDirSelector(),
			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, _('Search & Install')),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Keyword')),
					E('div', { 'class': 'cbi-value-field' }, [
						searchInput, ' ',
						E('button', { 'class': 'btn cbi-button cbi-button-find', 'click': function() { self.doSearch(searchInput.value.trim()); } }, _('Search'))
					])
				]),
				E('div', { 'class': 'cbi-value' }, [
					E('label', { 'class': 'cbi-value-title' }, _('Force Install')),
					E('div', { 'class': 'cbi-value-field' }, [
						E('label', {}, [forceChk, ' ', _('Ignore dependencies (opkg --nodeps / apk --force-depends). Required when kernel vermagic does not match.')])
					])
				])
			]),
			E('div', { 'class': 'cbi-section', 'id': 'kmod-results' }, [ this.renderResults() ])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
