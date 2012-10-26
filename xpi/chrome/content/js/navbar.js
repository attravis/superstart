/**
 * created on 10/2/2012, on hospital, with my father
 */
(function() {
const Cc = Components.classes;
const Ci = Components.interfaces;
var SuperStart = $.getMainWindow().SuperStart;
var getString = SuperStart.getString;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var ob = ssObj.getService(Ci.ssIObserverable);
var cfg = ssObj.getService(Ci.ssIConfig);
ssObj = undefined;

var sEvts = {
	'navbar-recently-closed': onNavbarItemOnoff,
	'navbar-themes': onNavbarItemOnoff
};
var e2id_map = {
	'navbar-recently-closed': 'nbb-recently-closed',
	'navbar-themes': 'nb-themes'
};

window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	init();
}, false);
window.addEventListener('unload', function() {
	window.removeEventListener('unload', arguments.callee, false);
	cleanup();
	ob = cfg = null;
}, false);

function init() {
	initPopupButton('nbb-recently-closed', 'superstart-recently-closed-list', getString('ssRecentlyClosed'));
	for (var k in sEvts) {
		var f = sEvts[k];
		ob.subscribe(k, f);
		f(k);
	}

	$.removeClass($$('navbar'), 'hidden');
}

function cleanup() {
	for (var k in sEvts) {
		ob.unsubscribe(k, sEvts[k]);
	}
}

function initPopupButton(bid, mid, title) {
	var b = $$(bid);
	b.setAttribute('title', title);
	b.addEventListener('mousedown', function(evt) {
		if (evt.button != 0) {
			return;
		}
		evt.preventDefault();
		evt.stopPropagation();

		var mw = $.getMainWindow();
		var doc = mw.document;
		var m = doc.getElementById(mid);
		if (m) {
			if (m.state == 'closed') {
				var obj = doc.getElementById('browser').boxObject;
				var pos = $.getPosition(b), margin = $.getElementMargin(b), border = $.getElementBorder(b), padding = $.getElementPadding(b), dimension = $.getElementDimension(b);
				var x = pos[0] + obj.screenX, y = pos[1] + obj.screenY;
				y += dimension[1] + margin[0] + margin[2] + border[0] + border[2] + padding[0] + padding[2];
				y += 2;
				m.openPopupAtScreen(x, y, false);
				$.addClass(b, 'opened');
				m.addEventListener('popuphiding', onPopupHiding, true);
			} else {
				m.hidePopup();
			}
		}
	}, false);

	function onPopupHiding(evt) {
		var m = evt.target;
		if (m.id != mid) {
			return;
		}
		m.removeEventListener('popuphiding', onPopupHiding, true);
		$.removeClass(b, 'opened');
	}
}

function onNavbarItemOnoff(evt, onoff) {
	onoff = cfg.getConfig(evt);
	var id = e2id_map[evt];
	if (id !== undefined) {
		var b = $$(id);
		b.style.display = onoff ? 'block' : 'none';
	}
}

})();
