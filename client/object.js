/**
 * @author seh
 */
var types = { };
var properties = { };

function hasType(o, t) {	
	if (!o.type)
		return false;
	var ot = getTypeArray(o.type);
	
	for (var i = 0; i < ot.length; i++) {
		if (ot[i] == t)
			return true;
	}
	return false;
}

function addType(t) {
	types[t.uri] = t;
	
	if (t.properties) {
		for (var p in types[t.uri].properties) {
			properties[p] = types[t.uri].properties[p];
		}
	}
}

var lastTypeMenu;
function updateTypes() {
	if (lastTypeMenu)
		lastTypeMenu.remove();
	
	var t = newTypeMenu();
	$('#TypesMenu').append(t);
	
	lastTypeMenu = t;
}

// [ normalized match, absolute match ] 
function getRelevance(x) {
	if (!x.type)
		return 0;
	x.type = getTypeArray(x.type);	
	
	var total = 0, interest = 0;
	for (var i in interestStrength) {
		total += interestStrength[i];
	}
	if (total == 0)
		return 0;
	
	for (var i = 0; i < x.type.length; i++) {
		var t = x.type[i];
		if (interestStrength[t] > 0) {
			interest += interestStrength[t];
		}
		
	}
	
	var v = interest / total;
	
	if (soonFactor > 0) {
		if (x.when) {
			//TODO Fix this math
			var ageFactor = Math.exp( -1 * (Date.now() - x.when) / 1000.0 / 60.0 / 60.0  );
			v *= (ageFactor * (1.0 - soonFactor) );
		}
		else {
			v *= 0.5;
		}
	}
	if (nearestFactor > 0) {
		//...
	}
	
	return v;
}

function newObjectView(x, onRemoved) {
	var r = getRelevance(x);
	
	var fs = (1.0 + r/2.0)*100.0 + '%';
	
	var d = $('<div class="objectView" style="font-size:' + fs + '">');
	var xn = x.name;
	var authorID = ''; //Self.get('clientID');
	if (x.author) {
		var a = x.author;
		var ci = a.indexOf('<');
		if (ci!=-1) {
			a = a.substring(0, ci-1);
			authorID = x.author.substring(ci+1, x.author.length-1);
		}
		else {
			authorID = x.author;
		}
		
		xn = a + ': ' + xn;
	}

	var hb = $('<div>').addClass('ObjectViewHideButton');
	hb.append('<button>X</button>');
	d.append(hb);
	
	var authorClient = clients[authorID];
	if (authorClient) {
		var av = getAvatar(authorClient.emailHash).attr('align', 'left');
		
		d.append(av);
		av.wrap('<div class="AvatarIcon"/>');
	}

	if (x.name) {
		d.append('<h1>' + xn + '</h1>');
	}
	
	if (x.type) {
		if (x.type.length) {
			d.append('<h3>' + JSON.stringify(x.type, null, 2) + '</h3>');
		}
		else
			d.append('<h3>' + x.type + '</h3>');
	}
	
	if (x.values) {
		var ud = $('<ul>');
		d.append(ud);
		for (var vi = 0; vi < x.values.length; vi++) {
			var vv = x.values[vi];
			ud.append('<li>' + vv.uri + ': ' + vv.value + '</li>');
		}
	}
	
	
	
	if (x.geolocation) {
		var dist = '?';
		if (Self.get('geolocation'))
			dist = geoDist(x.geolocation, Self.get('geolocation'));
		
		d.append('<h3>' + JSON.stringify(x.geolocation) + ' ' + dist + ' km away</h3>');
	}
	d.append('<h3>Relevance:' + parseInt(r*100.0)   + '%</h3>');
	
	if (x.text) {
		d.append('<p>' + x.text + '</p>');
		
		if (hasType(x, 'general.Media')) {
			var imgURL = x.text;
			if (imgURL.indexOf('http://')==0)
				d.append('<img src="'+imgURL+'"/>');
			//TODO handle videos, etc
		}
	}
	
	
	
	return d;
}

function getAvatar(emailHash) {
	return $("<img>").attr("src","http://www.gravatar.com/avatar/" + emailHash + "&s=200");
}

function clearInterests() {
	interestStrength = { };
	interests = [ ];
	
	updateSelf();
	updateSelfUI();
}

function newObjectEdit(x) {
	var d = $('<div>');

	
	var sc = $('<div id="SelfContent"></div>');
	{
		sc.append('<div id="CurrentInterests"/>');
		sc.append('<div id="InterestActions"><div id="NewObjectFromInterestsWrapper"  style="display: none"></div>');
		
	}


	var b = $('<div/>');
	
	/*var sa = $('<input type="range" min="0" max="100" value="0"/>');
	sa.change(function() {
		nearestFactor = sa.val() / 100.0;
		updateDataView();
	});
	b.append('Anywhere'); b.append(sa); b.append('Nearest');

	var b2 = $('<div/>');
	
	var sb = $('<input type="range" min="0" max="100" value="0"/>');
	sb.change(function() {
		soonFactor = sb.val() / 100.0;
		updateDataView();
	});
	b2.append('Anytime'); b2.append(sb); b2.append('Recent');*/
	b.append('<input type="text" class="DataViewFilter" placeholder="filter"/>');
	b.append('<select><option>By Age</option><option>By Relevance</option><option>By Author</option></select>');
	b.append('<select><option>Anywhere</option><option>Near 1km</option><option>Near 5km</option></select>');
	b.append('<select><option>Anytime</option><option>Recent 1m</option><option>Recent 5m</option><option>Recent 30m</option><option>Recent 1h</option><option>Recent 24h</option></select>');
	b.append('<select><option>Public</option><option>Mine</option></select>');

	$('.DataSubViewMenu').append(b);
	//$('.DataSubViewMenu').append(b2);
	
	var expandedDesc = false;
	var expandedMap = false;
	
	var miS = $('<input type="text" class="MessageSubject"/>');
	var mi = $('<div class="SelfBarSection"/>');
	miS.appendTo(mi);
	
	
	var mdd = $('<div class="SelfBarSection">');
	var md = $('<textarea class="MessageDescription" rows="5" /><br/>');
	md.appendTo(mdd);
	
    miS.keyup(function(event) {
 
    	if (!expandedDesc) {
            if (event.keyCode==13) {
        		sendMessage(saveForm());
            }
      	}
    });
	
	var map;

	var ed = $('<div>');
	var emid = uuid();
	
	var emM = $('<div id="' + emid + '" style="width: 100%; height: 200px;"/>');
	var em = $('<div class="SelfBarSection">Location</div>');
	emM.appendTo(em);
	
	var ex = $('<div>');
	
	var b = $('<button title="Add Description">..</buton>');
	b.click(function() {
		if (!expandedDesc) {
			expandedDesc = true;
			ex.show();
			ed.show();
		}
		else {
			expandedDesc = false;
			ed.hide();
		}
	});
	var c = $('<button title="Add Location">@</buton>');
	c.click(function() {
		if (!expandedMap) {
			expandedMap = true;
			
			ex.show();
			em.show();
			emM.html('');
			map = initLocationChooserMap(emid);
		}
		else {
			expandedMap = false;
			em.hide();
		}
	});
	
	
	function saveForm() {
		if (!x) x = { };
		
		x.uuid = uuid();
		x.name = miS.val();
		
      	miS.val('');		
		
		if (expandedDesc) {
			x.text = md.val(); 
		}
		
		md.val('');
		
		if (map) {
			var tb = map.targetLocation.geometry.bounds;
			//TODO make this a funciton to get the center of a bounds, or find an existing one
			var avX = (tb.left + tb.right)/2.0;
			var avY = (tb.top + tb.bottom)/2.0;
			var p = new OpenLayers.LonLat(avX,avY);
			p = p.transform(toProjection, fromProjection);
			x.geolocation = [p.lat, p.lon];
		}
		
		
		x.values = [];
		$('.PropertyArea').children().each(function() { 
			var z = $(this);
			var pr = z.data('property'); 
			if (pr) {
				var va = z.data('value');
				if (va) {
					x.values.push({
						uri: pr,
						type: z.data('type'),
						value: va()
					});
				}
			}
		});
		
		ex.hide();
		em.hide();
		ed.hide();
		b.show();
		c.show();
		expandedDesc = false;
		
		return x;
	}
	
	mdd.appendTo(ed);
	
	var shareButton = $('<button><b>Share</b></button>');
	shareButton.click(function() {
		sendMessage(saveForm());
	});
	shareButton.appendTo(ex);
	shareButton.wrap('<div style="float:right">');
	
	
	ed.hide();
	em.hide();
	ex.hide();
	
	//ADD EVERYTHING
	d.append('<div id="TypesMenu"/>');
	
	var dtm = $('<div class="TypesMenuButtons"/>');
	b.appendTo(dtm);
	c.appendTo(dtm);

	dtm.appendTo(d);

	
	mi.appendTo(d);

	ed.appendTo(d);
	em.appendTo(d);
	
	if (x) {
		if (x.name)
			mi.val(x.name);
		
		var desc = '';
		
		if (x.text) {
			desc = desc + x.text + "\n\n";
		}
		
		
		if (x.values) {
			for (p in x.values) {
				var pr = x.values[p];
				for (v in pr) {
					var t = v + ': ' + pr[v]; 
					desc = desc + t + "\n";
				}
			}
		}
		
		if (d.length > 0) {
			md.val(desc);
			b.click();			
		}
			
	}
	
	sc.appendTo(d);
	ex.appendTo(d);

	
	return d;
}


function newTypeMenu() {
	var x = $('<ul class="sf-menu"/>');
	
	var xMainW = $('<li><a href="#">[-]</a></li>')
	var xMain = $('<ul/>');
	{
		xMain.append('<li><a href="#">Load...</a></li>');
		xMain.append('<li><a href="#">Save...</a></li>');
		xMain.append('<li><a href="#"><hr/></li>');
		xMain.append('<li><a href="javascript:clearInterests();">Clear</li>');
		xMain.append('<li><a href="javascript:addURL();">Add URL</li>');
	}
	xMainW.append(xMain);
	x.append(xMainW);

	
	var xAddW = $('<li><a href="#">Type</a></li>')
	var xAdd = $('<ul/>');
	xAddW.append(xAdd);
	x.append(xAddW);
	


	var m = { };
	for (var k in types) {
		var t = types[k];
		var path = k.split('.');
		if (path.length > 1) {
			if (!m[path[0]]) m[path[0]] = [];
			m[path[0]].push( path[1] ); 
		}
		else {
			
		}
	}
	for (var mm in m) {
		var menu = m[mm];
		var y = $('<li><a href="#">' + mm + '</a></li>');
		var u = $('<ul/>');
		y.append(u);
		for (var l = 0; l < menu.length; l++) {
			//console.dir(menu[l]);
			var iid = mm + '.' + menu[l];
			u.append('<li><a href="javascript:addInterest(\'' + iid + '\', false, true);">' +  menu[l] + '&nbsp;<span class="' + encodeInterestForElement(iid) + '_s"/></a></li>');
			
		}
		xAdd.append(y);
	}
	
	
	setInterval(function() {
    	$.getJSON('/attention', function(a) {
			for (var i in a) {
				
				var t = a[i];
				var l = i;
				var attention = t[1]; //(t[1] - min) / (max - min);
				var instances = t[0];
				var name = t[2] || l;
				//console.log(name, instances, attention);
				try {
					var v = $('.' + encodeInterestForElement(i) + '_s');
					if (v)
						v.html(instances + ',' + attention);
				}
				catch (err) { //HACK do not allow this to happen 
					
				}
			}
    	});
	}, 2000);
	
	return x.supersubs({ 
        minWidth:    12,   // minimum width of sub-menus in em units 
        maxWidth:    27,   // maximum width of sub-menus in em units 
        extraWidth:  1     // extra width can ensure lines don't sometimes turn over 
                           // due to slight rounding differences and font-family 
    }).superfish({
    	dropShadows: false  // completely disable drop shadows by setting this to false
    });
	
}

function initDataView(e) {
	/*
	<div id="Team" data-role="page" class="PageWrapper">
        <div id="teamInput">
            <input type='text' id="MessageInput"/>
        </div>
        <div id="teamContent">
        </div>
	    <div id="teamRoster">
	    </div>
	</div>
	*/
	var c = $('<div></div>');
	
	var menu = $('<div class="DataViewMenu"/>');
	menu.append($('<button>News</button>').click(function() {
		currentView = 0;
		updateDataView();
	}));
	menu.append($('<button>Map</button>').click(function() {
		currentView = 1;
		updateDataView();
	}));
	menu.append('<button>Table</button>');
    menu.append('<button>Timeline</button>');
    var submenu = $('<div class="DataSubViewMenu">');
    menu.append(submenu);
    
    c.append(menu);
    
	c.append('<div id="teamContent"/>');
	//c.append('<div id="teamRoster"/>');
	
	$('#' + e).html(c);
	
}

var currentView = 0;

function updateDataView() {
	var tc = $('#teamContent');	
	if (!tc)
		return;
	
	
	tc.html('');

	//NEWS
	if (currentView == 0) {
		tc.addClass('ContentScroll');
		
		var x = [];
		var relevance =  { };
		for (k in attention) {
			var o = attention[k];
	
			var r = getRelevance(o);
			if (r > 0) {
				x.push(o);
				relevance[k] = r;
			}
			
		}
		
		//sort x
		x.sort(function(a,b) {
			return relevance[b.uuid] - relevance[a.uuid];
		});
		
		for (var i = 0; i < x.length; i++) {
			var d = $('<div/>');
			newObjectView(x[i]).appendTo(d);
		    tc.append(d);
		}
		
	    var objDiv = document.getElementById("teamContent");
	    if (objDiv!=null)
		    if (objDiv.scrollHeight!=undefined)
		    	objDiv.scrollTop = objDiv.scrollHeight;
	}
	else if (currentView == 1) {
		tc.removeClass('ContentScroll');
		
		var map = initMap('teamContent', function() { });
		
		for (var u in attention) {
			var x = attention[u];
			if (x.geolocation) {
				addToMap(map, x);
			}
		}
	}
}

function newPropertyEdit(typeID, propertyID, value) {
	var p = properties[propertyID];
	var type = p.type;
	
	if (!value)
		value = '';
	
	if (!p) {
		return $('<div>Unknown property: ' + propertyID + '</div>');
	}
		
	var x = $('<div>').addClass('PropertyEdit');
	x.append(propertyID + ':');
	
	var removeButton = $('<button>X</button>');
	removeButton.click(function() {
		x.remove();
	});
	x.append(removeButton);
	
	x.data('property', propertyID);
	x.data('type', typeID);
	
	if (p.type == 'textarea') {
		x.append('<br/>');
		var t = $('<textarea rows="3">' + value + '</textarea>');
		x.append(t);
		x.data('value', function(target) {
			return t.val();			
		});
	}
	else {
		var t = $('<input type="text" value="' + value + '">');
		x.append(t);		
		x.data('value', function(target) {
			return t.val();			
		});
	}
	
	
	return x;
}

