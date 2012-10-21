
var superStartOptions = {};

(function(opt) {
	const Cc = Components.classes;
	const Ci = Components.interfaces;
	const nsIFilePicker = Ci.nsIFilePicker;
	var logger = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService);
	var cfg = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIConfig);
	var tm = Cc['@enjoyfreeware.org/superstart;1'].getService(Ci.ssIThemes);
	var sbprefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

	window.addEventListener('DOMContentLoaded', function() {
		window.removeEventListener('DOMContentLoaded', arguments.callee, false);
		initialize();

		var dlg = $$('superstart-options');
		dlg.onAccept = onAccept;
		dlg.setAttribute('ondialogaccept', 'return document.getElementById("superstart-options").onAccept();');
	}, false);

	window.addEventListener('unload', function() {
		window.removeEventListener('unload', arguments.callee, false);
		cleanup();
	}, false);


	var boolMap = {
		'superstart-load-in-blanktab' : 'load-in-blanktab',
		'superstart-sites-open-in-newtab' : 'open-in-newtab',
		'superstart-sites-use-compactmode' : 'site-compact',
		'superstart-show-bookmarks' : 'toolbar-bookmark',
		'superstart-show-recentlyclosed' : 'toolbar-recentlyclosed',
		'superstart-show-themes' : 'toolbar-themes',
		'superstart-use-customize' : 'use-customize'
	};

	var buttonMap = {
		'superstart-customize-select-image': selectImage,
		'superstart-customize-clear-image': clearImage
	};

	var customizeMaps = {
	};

	var isHomepaged = sbprefs.getCharPref('browser.startup.homepage') == cfg.getConfig('index-url');
	var mainWindow = null;


	function initialize() {
		let d = document;
	// get main window
		let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);  
		mainWindow = wm.getMostRecentWindow("navigator:browser");  

	// restore the selected tab
		let idx = window.opener['superstart-option-tab-index'];
		if (idx != undefined) {
			$$('superstart-option-tabbox').selectedIndex = idx;
		}
	// homepage
		var cb = $$('superstart-set-as-homepage');
		if (isHomepaged) {
			cb.setAttribute('checked', true);
		}
		cb.addEventListener('command', onSetHomepageChanged, false);

	// bool 
		for (let id in boolMap) {
			let key = boolMap[id];
			let c = $$(id);
			if (c) {
				if (cfg.getConfig(key)) {
					c.setAttribute('checked', true);
				}
				c.addEventListener('command', onCheckboxChanged, false);
			}
		}

	// buttons
		for (let id in buttonMap) {
			let key = buttonMap[id];
			let c = $$(id);
			c && c.addEventListener('command', key, false);
		}

	// Col
		let col = cfg.getConfig('col');
		let colPop = $$('superstart-sites-col-popup');
		colPop.addEventListener('command', onSitesColSelected, false);
		let from = 4, to = 8;
		for (let i = 0; i + from <= to; ++ i) {
			let item = document.createElement('menuitem');
			let idx = i + from;
			item.setAttribute('label', idx);
			colPop.appendChild(item);
			if (idx == col) {
				$$('superstart-sites-col').selectedIndex = i;
			}
		}

	// customize
		initCustomize();

	// themes
		initThemes();

	// links
		let links = document.getElementsByClassName('text-link');
		for (let i = 0, l = links.length; i < l; ++ i) {
			let l = links[i];
			l.setAttribute('tooltiptext', l.getAttribute('href'));
		}

	// version
		let v = $$('superstart-version');
		v && v.setAttribute('label', v.getAttribute('label') + ' (v' + cfg.getConfig('version') + ')');
	}

	function cleanup() {
		cleanupThemes();

		let cb = $$('superstart-set-as-homepage');
		if (cb) {
			cb.removeEventListener('command', onSetHomepageChanged, false);
		}

		for (let id in boolMap) {
			let key = boolMap[id];
			let c = $$(id);
			if (c) {
				c.removeEventListener('command', onCheckboxChanged, false);
			}
		}

		for (let id in buttonMap) {
			let key = buttonMap[id];
			let c = $$(id);
			if (c) {
				cb.addEventListener('command', key, false);
			}
		}

		let colPop = $$('superstart-sites-col-popup');
		if (colPop) {
			colPop.removeEventListener('command', onSitesColSelected, false);
		}
	}

	function onCheckboxChanged(evt) {
		var cb = evt.target;
		let id = cb.id;
		if (id && boolMap[id]) {
			cfg.setConfig(boolMap[id], cb.hasAttribute('checked'));
		}
	}

	function onSetHomepageChanged(evt) {
		var cb = evt.target;
		if (cb.hasAttribute('checked') != isHomepaged) {
			if (isHomepaged) {
				sbprefs.setCharPref('browser.startup.homepage', 'about:home');
			} else {
				sbprefs.setCharPref('browser.startup.homepage', cfg.getConfig('index-url'));
			}
			isHomepaged = !isHomepaged;
		}
	}

	function onSitesColSelected() {
		let label = $$('superstart-sites-col').getAttribute('label');
		cfg.setConfig('col', label);
	}

	function onAccept() {
		// 1. customize
		try {
			saveCustomize();
		} catch (e) {
			logger.logStringMessage(e);
		}

		// 2. save tab index
		window.opener['superstart-option-tab-index'] = $$('superstart-option-tabbox').selectedIndex;

		return true;
	}

	opt.selectTheme = function() {
		var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Select a File", nsIFilePicker.modeOpen);
		fp.appendFilter("Theme files", "*.zip;");
		var res = fp.show();
		if (res == nsIFilePicker.returnOK) {
			var themeFile = fp.file;
			tm.installTheme(themeFile);
		}
	}

	// customize
	var positionMap = [undefined, 'center top', 'right top', 'left center', 'center center', 'right center', 'left bottom', 'center bottom', 'right bottom'];
	var repeatMap = [undefined, 'no-repeat', 'repeat-x', 'repeat-y'];
	var sizeMap = [undefined, 'cover', 'contain'];
	var usCss = '';

	function getCstmElem(id) {
		return $$('superstart-customize-' + id);
	}

	function initCustomize() {
		let cb = $$('superstart-use-customize');
		cb.addEventListener('CheckboxStateChange', function() {
			let ctrls = document.getElementsByClassName('customize-ctrl');
			for (let i = 0, l = ctrls.length; i < l; ++ i) {
				ctrls[i].setAttribute('disabled', !cb.checked);
			}
		}, false);

		if (!cfg.getConfig('use-customize')) {
			cb.checked = false;
		}

		let cstm = JSON.parse(tm.getUsData());
		usCss = cstm['css'] || '';
		let body = cstm['body'] || {};

		if (body['background-image'] && body['background-image'] != 'none') {
			getCstmElem('bg-image').setAttribute('src', body['background-image']);
		}

		initBackgroundPosition(body['background-position']);
		initBackgroundRepeat(body['background-repeat']);
		initBackgroundColor(body['background-color']);

		let transparent = cstm['+transparent'] || false;
		if (transparent) {
			getCstmElem('transparent').checked = true;
		}

		let adv = getCstmElem('advance');
		adv.addEventListener('command', function() {
			var params = { input: usCss, output: null };
			window.openDialo$$('chrome://superstart/content/css.xul', 
				'',
				'chrome,dialog,modal=yes,dependent=yes,centerscreen=yes,resizable=yes',
				params).focus();
			if (params.output !== null) {
				usCss = params.output;
			}
		}, false);
	}

	function saveCustomize() {
		let cstm = {
			'body': {}
		};
		let bgi = getCstmElem('bg-image').getAttribute('src');
		if (bgi != '') {
			cstm['body']['background-image'] = bgi;
			cstm['body']['text-shadow'] = 'none';
		}
		let position = getBackgroundPosition();
		if (position != undefined) {
			cstm['body']['background-position'] = position;
		}
		let repeat = repeatMap[getCstmElem('bg-repeat').selectedIndex];
		if (repeat != undefined) {
			cstm['body']['background-repeat'] = repeat;
		}
		let color = getCstmElem('bg-color').value;
		if (color != '') {
			cstm['body']['background-color'] = color;
			if (bgi == '') {
				cstm['body']['background-image'] = 'none';
			}
		}
		if (getCstmElem('transparent').checked == true) {
			cstm['+transparent'] = true;
		}

		if (usCss != '') {
			cstm['css'] = usCss;
		}

		tm.setUsData(JSON.stringify(cstm));
	}

	function initBackgroundPosition(currPos) {
		let bgp = $$('bg-position');
		if (bgp) {
			for (let y = 0; y < 3; ++ y) {
				let hb = document.createElement('hbox');
				for (x = 0; x < 3; ++ x) {
					let p = document.createElement('vbox');
					p.addEventListener('click', onPositionClick, false);
					p.className = 'bg-position customize-ctrl';
					let cp = p['ss-value'] = positionMap[y * 3 + x];
					if (cp == currPos) {
						$.addClass(p, 'selected');
					}
					hb.appendChild(p);
				}
				bgp.appendChild(hb);
			}
		}
	}
	function onPositionClick(evt) {
		let d = evt.target.getAttribute('disabled');
		if ($.hasClass(evt.target, 'selected') || evt.target.getAttribute('disabled') == "true") {
			return;
		}

		let ss = $$('bg-position').getElementsByClassName('selected');
		for (let i = 0, l = ss.length; i < l; ++ i) {
			$.removeClass(ss[i], 'selected');
		}
		$.addClass(evt.target, 'selected');
	}
	function getBackgroundPosition() {
		let ss = $$('bg-position').getElementsByClassName('selected');
		if (ss.length > 0) {
			return ss[0]['ss-value'];
		}
		return undefined;
	}
	function initBackgroundRepeat(repeat) {
		if (repeat) {
			let idx = 0;
			for (let i = 0, l = repeatMap.length; i < l; ++ i) {
				if (repeat == repeatMap[i]) {
					idx = i;
					break;
				}
			}
			getCstmElem('bg-repeat').selectedIndex = idx;
		}
	}
	function initBackgroundColor(color) {
		if (color) {
			let input = getCstmElem('bg-color');
			input.value = color;
		}
		let picker = getCstmElem('bg-color-picker');
		picker.color = color;
		picker.onchange = function() {
			getCstmElem('bg-color').value = this.color;
		}
		let clear = getCstmElem('bg-color-clear');
		clear.addEventListener('command', function() {
			getCstmElem('bg-color').value = getCstmElem('bg-color-picker').color = '';
		}, false);
	}

	function selectImage() {
		let fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		fp.init(window, "Select an image", nsIFilePicker.modeOpen);
		fp.appendFilters(nsIFilePicker.filterImages);
		let res = fp.show();
		if (res == nsIFilePicker.returnOK) {
			getCstmElem('bg-image').setAttribute('src', getUrlFromFile(fp.file));
		}
	}
	function clearImage() {
		getCstmElem('bg-image').removeAttribute('src');
	}


	// themes
	function initThemes() {
		// buildThemeList();
	}

	function cleanupThemes() {
	}

	function buildThemeList() {
		let list = $$('superstart-theme-list');
		let currTheme = cfg.getConfig('theme');
		let themes = JSON.parse(tm.getThemes());

		let items = list.getElementsByTagName('listitem');
		while (items.length > 0) {
			items[0].parentNode.removeChild(items[0]);
		}

		for (var i = 0, l = themes.length; i < l; ++ i) {
			let theme = themes[i];

			var row = document.createElement('listitem');
			list.appendChild(row);

			row.themeName = theme.name;
			row.className = 'listitem-iconic';

			if (currTheme == theme.name) {
				row.current = true;
				row.setAttribute('checked', 'checked');
				list.selectedIndex = i;
			}
			row.setAttribute('label', theme.name);
		}
	}

	function onThemeLoaded(evt, name) {
		buildThemeList();
	}
	function onThemeRemoved(evt, name) {
		buildThemeList();
	}
	function onThemeChanged(evt, name) {
		buildThemeList();
	}

	function getUrlFromFile(iF) {
		var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);  
		return ios.newFileURI(iF).spec; 
	}
})(superStartOptions);

