const {classes: Cc, interfaces: Ci} = Components;
var SuperStart = $.getMainWindow().SuperStart;
var getString = SuperStart.getString;
var ssObj = Cc['@enjoyfreeware.org/superstart;1'];
var ob = ssObj.getService(Ci.ssIObserverable);
var cfg = ssObj.getService(Ci.ssIConfig);
var sm = ssObj.getService(Ci.ssISiteManager);
var todo = ssObj.getService(Ci.ssITodoList);
var tm = ssObj.getService(Ci.ssIThemes);
ssObj = undefined;

(function() {
 
var sEvts = {
	'sites-use-background-effect': onShowHide,
};
var evt2class = {
	'sites-use-background-effect': 'use-background-effect',
};
var wEvts = {
	'scroll': onScroll
};
var dEvts = {
	'contextmenu': onContextMenu
};
for (var k in wEvts) {
	window.addEventListener(k, wEvts[k], false);
}

window.addEventListener('DOMContentLoaded', function() {
	window.removeEventListener('DOMContentLoaded', arguments.callee, false);
	for (var evt in sEvts) {
		var fn = sEvts[evt];
		ob.subscribe(evt, fn);
		fn(evt);
	}
	for (var k in dEvts) {
		document.addEventListener(k, dEvts[k], false);
	}

	window.addEventListener('unload', function() {
		window.removeEventListener('unload', arguments.callee, false);
		for (var k in sEvts) {
			ob.unsubscribe(k, sEvts[k]);
		}
		for (var k in wEvts) {
			window.removeEventListener(k, wEvts[k], false);
		}
		for (var k in dEvts) {
			document.removeEventListener(k, dEvts[k], false);
		}
	}, false);
}, false);

window.addEventListener('load', function() {
	window.removeEventListener('load', arguments.callee, false);
	window.setTimeout(function() {
		$.insertStyle('style/transition.css');
	}, 0);
}, false);

// event handler
function onShowHide(evt, value) {
	var show = cfg.getConfig(evt);
	if (evt == 'sites-use-background-effect') {
		show = !show;
	}

	if (show) {
		$.removeClass(document.body, evt2class[evt]);
	} else {
		$.addClass(document.body, evt2class[evt]);
	}
}


function onScroll() {
	var mask = $$('mask');
	mask.style.top = window.scrollY + 'px';
	mask.style.left = window.scrollX + 'px';
}


function onContextMenu(evt) {
	var t = evt.target;
	while (t) {
		if (t.id == 'notes') {
			return;
		}
		t = t.parentNode;
	}

	var win = $.getMainWindow();
	var menu = win.document.getElementById('superstart-menu');
	if (menu) {
		menu.openPopupAtScreen(evt.screenX, evt.screenY, true);
		evt.preventDefault();
	}
}


}());
