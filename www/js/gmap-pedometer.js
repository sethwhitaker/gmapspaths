google.maps.event.addDomListener(window, "load", initializeMap);
var map;
var bikeLayer;
var bDoubleClickHappened = false;
var DEFAULT_LAT = 37.06302;
var DEFAULT_LNG = -95.677013;
var DEFAULT_ZOOM = 2;
var DEFAULT_ELEV_PARAM = "0a";
var IS_LOADING_FROM_QUERYSTRING = true;
var NOT_LOADING_FROM_QUERYSTRING = false;
var IS_CREATING_THERE_AND_BACK = true;
var NOT_CREATING_THERE_AND_BACK = false;
var NO_GRAPH_MESSAGE = '<span style="font-family:arial;font-size:10pt">Elevation only available on routes with two or more points, and in the U.S. You may also see this message when there is a problem with the remote service that provides the elevation data.</span>';
var REFRESH_LINK = '<div style="font-family:arial;font-size:10pt;float:left;width:100px"><a href="javascript:refreshGraph();">Refresh graph</a>: One or more of the elevation lookups returned failure (resulting in a "0" in your graph). Click the link to refresh and try again.</div>';
var elevationArrayIndex = 0;
var currentElevationGraphHeight = "0";
var bAllElevationsWereZero = true;
var shouldPerformElevationLookup = false;
var performElevationLookup = false;
var bAllElevationsFound = false;
var numberOfFoundElevations = 0;
var ElevationsArrLen = 0;
var iPercent = 0;
var bShowRefreshLink = false;
var rId = "";
var suppressSaveModal = false;
var routeSaved = true;
var paramString = location.href;
var routeIdFromQueryString;
var ptHash = new Object();
var editPoints = [];
var routeSegmentsCount = 0;
var polyLineSegmentsArr = new Array();
var currentLine = new Array(0);
var svgCache;
var svgParent;
var uiPolyline;
var LOGINSTATE_UNKNOWN = -1;
var LOGINSTATE_NOT_LOGGEDIN = 0;
var LOGINSTATE_IS_LOGGEDIN = 1;
var isLoggedIn = LOGINSTATE_UNKNOWN;
var unlinkElevation0 = "off";
var unlinkElevation100 = "small";
var unlinkElevation200 = "large";
var linkElevation0 = "<a href=\"javascript:elevationSwitch('0');\">off</a>";
var linkElevation100 = "<a href=\"javascript:elevationSwitch('100');\">small</a>";
var linkElevation200 = "<a href=\"javascript:elevationSwitch('200');\">large</a>";
var saveLinkActive = '<a href="javascript:createPermalink();">Save route</a>';
var saveLinkInactive = "Saved";
var saveLinkSaving = "Saving...";
var ENVIRONMENT_IDENTIFIER = "";
CustomGetTileUrl = function (p, o, m) {
    var g = new GPoint(p.x * 256, (p.y + 1) * 256);
    var d = new GPoint((p.x + 1) * 256, p.y * 256);
    var l = G_NORMAL_MAP.getProjection().fromPixelToLatLng(g, o, m);
    var j = G_NORMAL_MAP.getProjection().fromPixelToLatLng(d, o, m);
    var q = l.x + "," + l.y + "," + j.x + "," + j.y;
    var n = "EPSG:4326";
    var h = this.myBaseURL;
    h += "&REQUEST=GetMap";
    h += "&SERVICE=WMS";
    h += "&reaspect=false&VERSION=1.1.1";
    h += "&LAYERS=" + this.myLayers;
    h += "&STYLES=default";
    h += "&FORMAT=" + this.myFormat;
    h += "&BGCOLOR=0xFFFFFF";
    h += "&TRANSPARENT=TRUE";
    h += "&SRS=" + n;
    h += "&BBOX=" + q;
    h += "&WIDTH=256";
    h += "&HEIGHT=256";
    h += "&GroupName=" + this.myLayers;
    return h
};
var defaultLocMarker;
loadAds();
$(document).ready(function () {
    setEditableFields();
    getHeader();
    showAnnouncementModal();
    addTweetButton();
    if (typeof (FB) != "undefined") {
        FB.init({
            appId: "257979067587488",
            status: true,
            cookie: true
        })
    }
    $("#recordFromDefaultLoc").click(startRecordingFromDefaultLoc);
    $("#recordFromOtherLoc").click(startRecordingFromOtherLoc);
    $("#startRecording").click(startRecordingFromOtherLoc)
});

function startRecordingFromOtherLoc() {
    bRecordPoints = true;
    if (defaultLocMarker != undefined) {
        defaultLocMarker.setMap(null);
        $("#recordFromDefaultLoc").val("Recording...");
        $("#recordFromOtherLoc").val("Recording...")
    } else {
        $("#startRecording").val("Recording...")
    }
}

function startRecordingFromDefaultLoc() {
    if (!bRecordPoints) {
        var a = defaultLocMarker.getPosition();
        defaultLocMarker.setMap(null);
        bRecordPoints = true;
        addLeg(a.lng(), a.lat(), NOT_LOADING_FROM_QUERYSTRING, NOT_CREATING_THERE_AND_BACK);
        redrawLinesAndMarkers(gLatLngArray)
    }
    $("#recordFromDefaultLoc").val("Recording...");
    $("#recordFromOtherLoc").val("Recording...")
}
$(window).resize(resetHeight);

function showAnnouncementModal() {
    var b = new Date();
    var d = new Date("Sun 26 Oct 2014 12:00:00 UTC-0000");
    var a = b < d;
    if ((getCookie("hrcAnnouncementShown") != "true") && a && (b.getTime() % 4 == 0)) {
        $.ajax({
            url: "/announcement.htm"
        }).done(function (g) {
            $("#announcementDiv").show();
            $("#announcementDiv").html(g)
        });
        setCookie("hrcAnnouncementShown", "true", 365)
    }
}

function setEditableFields() {
    $(".nameDescriptionData").click(nameDescriptionEditor);
    $(".nameDescriptionData").hover(function () {
        $(this).addClass("editHighlight")
    }, function () {
        $(this).removeClass("editHighlight")
    });
    $(".nameDescriptionInput").dblclick(finishEditor);
    $(".nameDescriptionInput").blur(finishEditor);
    $(".nameDescriptionInput").keypress(captureEnter)
}

function captureEnter(a) {
    if (a.keyCode == 13) {
        finishEditor(a)
    }
}

function finishEditor(a) {
    var b = $(a.currentTarget);
    var d;
    if (b.val() == "") {
        d = "[Click to enter text]"
    } else {
        d = b.val()
    }
    b.prev().html(d);
    b.hide();
    b.prev().show()
}

function nameDescriptionEditor() {
    $(this).hide();
    if ($(this).html() == "[Click to enter text]") {
        $(this).next().val("")
    } else {
        $(this).next().val($(this).html())
    }
    $(this).next().show()
}

function getHeader() {
    $.get("/gp/ajaxAuthentication/getHeader", function (a) {
        if ($("#leftCol").length != 0) {
            $("#leftCol").remove()
        }
        $("#header").prepend(a);
        resetHeight()
    })
}

function resetHeight() {
    var b = $("body").height();
    var a = $("#topElements").height();
    $("#mapPane").height(b - 90 - a);
    $("body").css("margin-left", "0px")
}

function initializeMap() {
    routeIdFromQueryString = getQuerystringParameter("r", paramString);
    if (routeIdFromQueryString.length > 0) {
        var a = document.getElementById("map");
        a.style.fontFamily = "arial";
        a.style.fontSize = "24pt";
        a.innerHTML = "looking up route " + routeIdFromQueryString + "...";
        rId = routeIdFromQueryString;
        getRoute(routeIdFromQueryString)
    } else {
        drawMap();
        rehydrateMapFromUrl()
    }
    drawAutosaveMessage();
    setLoginState()
}

function setLoginState() {
    $.ajax({
        url: "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxAuthentication/isAuthenticated",
        cache: false
    }).done(function (a) {
        isLoggedIn = parseInt(a)
    })
}

function drawMap() {
    var a = function (m, j, h) {
        var n = function (s, p) {
            var r = s.y;
            var o = s.x;
            var q = 1 << p;
            if (r < 0 || r >= q) {
                return null
            }
            if (o < 0 || o >= q) {
                o = (o % q + q) % q
            }
            return {
                x: o,
                y: r
            }
        };
        var g = {};
        g.getTileUrl = function (s, q) {
            var p = "";
            var r = n(s, q);
            if (!r) {
                return null
            }
            var o = Math.pow(2, q);
            newUrl = m.replace("{z}", q);
            newUrl = newUrl.replace("{x}", r.x);
            newUrl = newUrl.replace("{y}", r.y);
            return newUrl
        };
        g.tileSize = new google.maps.Size(256, 256);
        g.maxZoom = 19;
        g.minZoom = 0;
        g.name = j ? j : ["New Base Map"];
        for (var l in h) {
            if (h.hasOwnProperty(l)) {
                g[l] = h[l]
            }
        }
        return new google.maps.ImageMapType(g)
    };
    map = new google.maps.Map(document.getElementById("map"), {
        center: new google.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG),
        zoom: DEFAULT_ZOOM,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        draggableCursor: "crosshair",
        draggingCursor: "crosshair",
        scaleControl: true,
        disableDoubleClickZoom: true,
        scrollwheel: true,
        tilt: 0,
        zoomControl: true,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP,
            style: google.maps.ZoomControlStyle.LARGE
        },
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.TERRAIN, "OSM", "OpenCycle", "USGS", "USGSoldskool"],
            style: google.maps.MapTypeControlStyle.DROPDOWN
        }
    });
    map.mapTypes.set("OSM", new google.maps.ImageMapType({
        getTileUrl: function (h, g) {
            return "http://tile.openstreetmap.org/" + g + "/" + h.x + "/" + h.y + ".png"
        },
        tileSize: new google.maps.Size(256, 256),
        name: "OSM",
        maxZoom: 18
    }));
    map.mapTypes.set("OpenCycle", new google.maps.ImageMapType({
        getTileUrl: function (h, g) {
            return "http://tile.opencyclemap.org/cycle/" + g + "/" + h.x + "/" + h.y + ".png"
        },
        tileSize: new google.maps.Size(256, 256),
        name: "OpenCycle",
        maxZoom: 18
    }));
    var b = a("http://navigator.er.usgs.gov/tiles/tcr.cgi/{z}/{x}/{y}", "USGS");
    map.mapTypes.set("USGS", b);
    var d = a("http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}", "USGS Oldskool", {
        maxZoom: 15
    });
    map.mapTypes.set("USGSoldskool", d);
    google.maps.event.addListener(map, "move", function () {
        redrawLinesAndMarkers(gLatLngArray)
    });
    google.maps.event.addListener(map, "dblclick", function (g) {
        map.panTo(g.latLng);
        addLeg(g.latLng.lng(), g.latLng.lat(), NOT_LOADING_FROM_QUERYSTRING, NOT_CREATING_THERE_AND_BACK);
        clearAutoSaveMessage();
        redrawLinesAndMarkers(gLatLngArray)
    });
    google.maps.event.addListener(map, "zoomend", function (h, g) {
        prepMarkerArray();
        redrawLinesAndMarkers(gLatLngArray)
    })
}

function redrawLinesAndMarkers(a) {
    drawPolyLine(a);
    drawMarkers(a)
}
var pointTypeArray = new Array(0);
var xArray = new Array(0);
var yArray = new Array(0);
var gLatLngArray = new Array(0);
var elevationArray = new Array(0);
var legArray = new Array(0);
var distancesArray = new Array(0);
var mileMarkersToDraw = new Array(0);
var routePolyline;
var distance = 0;
var bRecordPoints = false;
var REMOVE = 0;
var ADD = 1;
var EDIT = 2;
var ENGLISH = "0";
var METRIC = "1";
var DISTANCE = "2";
var SMALLDISTANCE = "3";
var WEIGHT = "4";
var SHOW = "5";
var HIDE = "6";
var LEFT = "7";
var RIGHT = "8";
var START = "start";
var STOP = "stop";
var CLICKED_POINT = "0";
var GEOCODED_POINT = "1";
var CLICKED_LEG = "0";
var GEOCODED_LEG = "1";
var DRAW_RUNNING = "0";
var DRAW_BIKING = "1";
var DRAW_MANUAL = "2";
var ELEVATION_UNLOOKEDUP = null;
var ELEVATION_LOOKEDUP_NOT_YET_RETURNED = -1;
var currentWeightUnits = getCurrentUnits();
var bIsIE;
var showMarkers = true;
window.onunload = saveUnsavedChanges;

function addLeg(a, g, d, b) {
    if ((uiPolyline != undefined) && (uiPolyline.getEditable())) {
        setupEditablePolyline(uiPolyline)
    }
    if (bRecordPoints) {
        if (shouldUseDirectionsForDrawingLeg(d, b, xArray.length)) {
            addLegsFromDirectionsObject(a, g, d, b)
        } else {
            addSingleLeg(a, g, d, b);
            if ((!b) && (!d)) {
                pointTypeArray.push(CLICKED_POINT)
            }
        }
        drawMarkers(gLatLngArray)
    }
}

function addLegsFromDirectionsObject(d, l, j, g) {
    lastPoint = gLatLngArray[gLatLngArray.length - 1];
    var b = (getRouteDrawMode() == DRAW_RUNNING) ? google.maps.TravelMode.WALKING : google.maps.TravelMode.BICYCLING;
    var a = {
        origin: new google.maps.LatLng(lastPoint.lat(), lastPoint.lng()),
        destination: new google.maps.LatLng(l, d),
        travelMode: b
    };
    var h = new google.maps.DirectionsService();
    h.route(a, function (o, m) {
        if (m == google.maps.DirectionsStatus.OK) {
            var p = o.routes[0].overview_path;
            for (var n = 1; n < p.length; n++) {
                addSingleLeg(p[n].lng(), p[n].lat(), j, g);
                if (n == p.length - 1) {
                    pointTypeArray.push(CLICKED_POINT)
                } else {
                    pointTypeArray.push(GEOCODED_POINT)
                }
            }
            drawPolyLine(gLatLngArray);
            drawMarkers(gLatLngArray)
        }
    })
}

function formatLatLngForDirections(a, d) {
    var b = new Array(a.lat() + ", " + a.lng(), d.lat() + ", " + d.lng());
    return b
}

function resetDistanceMarkers() {
    mileMarkersToDraw = [];
    for (var a = 2; a < distancesArray.length; a++) {
        prepMarkersForLeg(a)
    }
}

function insertVertex(a, b, h) {
    xArray.splice(a, 0, b.lng());
    yArray.splice(a, 0, b.lat());
    gLatLngArray.splice(a, 0, b);
    elevationArray.splice(a, 0, ELEVATION_UNLOOKEDUP);
    pointTypeArray.splice(a, 0, h);
    distancesArray.splice(a, 0, 0);
    updateDistances(xArray, yArray, EDIT);
    var g = false;
    var d = false;
    drawElevationGraphIfApplicable(g, d);
    resetDistanceMarkers();
    markRouteAsUnsaved();
    drawMarkers(gLatLngArray)
}

function editVertex(a, b) {
    xArray[a] = b.lng();
    yArray[a] = b.lat();
    gLatLngArray[a] = b;
    elevationArray[a] = ELEVATION_UNLOOKEDUP;
    updateDistances(xArray, yArray, EDIT);
    var g = false;
    var d = false;
    drawElevationGraphIfApplicable(g, d);
    resetDistanceMarkers();
    markRouteAsUnsaved();
    drawMarkers(gLatLngArray)
}

function addSingleLeg(a, g, d, b) {
    xArray.push(a);
    yArray.push(g);
    gLatLngArray.push(new google.maps.LatLng(g, a));
    elevationArray.push(ELEVATION_UNLOOKEDUP);
    ElevationsArrLen = elevationArray.length;
    updateDistances(xArray, yArray, ADD);
    drawElevationGraphIfApplicable(d, b);
    prepMarkersForLeg(distancesArray.length);
    markRouteAsUnsaved()
}

function drawElevationGraphIfApplicable(b, a) {
    if (b == NOT_LOADING_FROM_QUERYSTRING) {
        if (a == NOT_CREATING_THERE_AND_BACK) {
            if (currentElevationGraphHeight > 0) {
                getElevationsAndDrawGraph()
            }
        }
    }
}

function getBearing() {
    var g = yArray[yArray.length - 2];
    var d = yArray[yArray.length - 1];
    var b = xArray[xArray.length - 2];
    var a = xArray[xArray.length - 1];
    return (Math.atan2(Math.sin(a - b) * Math.cos(d), Math.cos(g) * Math.sin(d) - Math.sin(g) * Math.cos(d) * Math.cos(a - b))) % (2 * Math.PI)
}

function prepMarkerArray() {
    removeAllMileMarkers();
    mileMarkersToDraw = new Array(0);
    for (var a = 2; a <= distancesArray.length; a++) {
        prepMarkersForLeg(a)
    }
}

function prepMarkersForLeg(a) {
    var g;
    var h = returnDistanceInChosenUnits(distancesArray[a - 1]);
    if (distancesArray.length < 1) {
        g = 0
    } else {
        g = returnDistanceInChosenUnits(distancesArray[a - 2])
    }
    var d = Math.floor(g);
    var j = Math.floor(h);
    if (d < j) {
        for (var b = d + 1; b <= j; b++) {
            calcMarkerLatLng(parseFloat(b) - g, a - 1)
        }
    }
}

function getSlopeOfLeg(d, a) {
    var g = d[a - 1];
    var b = d[a - 2];
    var h;
    if (b.lng() == g.lng()) {
        h = 1e-8
    } else {
        h = b.lng() - g.lng()
    }
    return ((b.lat() - g.lat()) / (h))
}

function getLatLngDistanceOfLeg(a) {
    var d = a - 2;
    var b = a - 1;
    return Math.sqrt(Math.pow(gLatLngArray[d].lng() - gLatLngArray[b].lng(), 2) + Math.pow(gLatLngArray[d].lat() - gLatLngArray[b].lat(), 2))
}

function calcMarkerLatLng(a, q) {
    var r = a / returnDistanceInChosenUnits(legArray[q - 1]);
    var s = getLatLngDistanceOfLeg(q);
    var h = r * s;
    var m = gLatLngArray[q - 2].lng();
    var j = gLatLngArray[q - 2].lat();
    var n = getSlopeOfLeg(gLatLngArray, q);
    var p = h * (1 / (Math.sqrt(1 + Math.pow(n, 2))));
    var b = h * (n / ((Math.sqrt(1 + Math.pow(n, 2)))));
    var o = parseFloat(gLatLngArray[q - 1].lng());
    var g = parseFloat(gLatLngArray[q - 2].lng());
    if (g > o) {
        p = -p;
        b = -b
    }
    var l = parseFloat(m) + parseFloat(p);
    var d = parseFloat(j) + parseFloat(b);
    mileMarkersToDraw.push(new google.maps.LatLng(d, l))
}

function updateDistances(h, g, j) {
    if (j == ADD) {
        fLastLeg = getLastLegDistance(h, g);
        var d = (distancesArray.length == 0) ? 0 : distancesArray[distancesArray.length - 1];
        distancesArray.push(d + fLastLeg);
        legArray.push(fLastLeg)
    } else {
        if (j == REMOVE) {
            distancesArray.pop();
            legArray.pop()
        } else {
            if (j == EDIT) {
                var b = 0;
                for (var a = 0; a < distancesArray.length; a++) {
                    prevLeg = getPreviousLegDistance(h, g, a);
                    b = prevLeg + b;
                    distancesArray[a] = b
                }
            }
        }
    }
    updateDistanceBoxes()
}

function handleWeightChange() {
    var a = distancesArray[distancesArray.length - 1];
    currentWeightUnits = getCurrentUnits();
    updateCalorieCounter(a)
}

function updateCalorieCounter(a) {
    var b = document.controlPanel.weight.value;
    if (!isNaN(b)) {
        var g;
        if (getCurrentUnits() == METRIC) {
            g = parseFloat(b)
        } else {
            g = parseFloat(b) * 0.45359237
        }
        var d = parseFloat(a) * 1.609345;
        document.controlPanel.calories.value = d * g * 1.036
    }
}

function updateDistanceBoxes() {
    $("#mileage").html(parseInt(returnDistanceInChosenUnits(distancesArray[distancesArray.length - 1]) * 10000) / 10000);
    updateCalorieCounter(distancesArray[distancesArray.length - 1])
}

function returnDistanceInMiles(h, j, l, b) {
    var g = new google.maps.LatLng(h, j);
    var d = new google.maps.LatLng(l, b);
    var a = google.maps.geometry.spherical.computeDistanceBetween(g, d) * 0.000621371192;
    return (a)
}

function initializeQuerystringParameter(g, a) {
    var b = "";
    var d = getQuerystringParameter(g, paramString);
    if (d.length > 0) {
        b = d
    } else {
        b = a
    }
    return b
}

function completeThereAndBackCourse() {
    var a = gLatLngArray.length - 1;
    if (gLatLngArray.length > 1) {
        for (var b = a - 1; b >= 0; b--) {
            bAllElevationsFound = false;
            addLeg(gLatLngArray[b].lng(), gLatLngArray[b].lat(), NOT_LOADING_FROM_QUERYSTRING, IS_CREATING_THERE_AND_BACK);
            numberOfFoundElevations++;
            addElevationValueToArray(elevationArray[b], elevationArray.length - 1);
            pointTypeArray.push(pointTypeArray[b])
        }
        bAllElevationsFound = true;
        drawElevationGraph();
        drawPolyLine(gLatLngArray);
        drawMarkers(gLatLngArray)
    }
}

function rehydrateMapFromUrl() {
    var H = getQuerystringParameter("fl", paramString);
    if (H.length > 0) {
        var u = H.split("-");
        var D = u[0];
        var G = u[1];
        var I = u[2];
        var n = u[3];
        var C = u[4];
        if (D == "s") {
            map.setMapTypeId(google.maps.MapTypeId.SATELLITE)
        } else {
            if (D == "m") {
                map.setMapTypeId(google.maps.MapTypeId.ROADMAP)
            } else {
                if (D == "h") {
                    map.setMapTypeId(google.maps.MapTypeId.HYBRID)
                } else {
                    if (D == "p") {
                        map.setMapTypeId(google.maps.MapTypeId.TERRAIN)
                    } else {
                        if (D == "o") {
                            map.setMapTypeId("OSM")
                        } else {
                            if (D == "c") {
                                map.setMapTypeId("OpenCycle")
                            } else {
                                if (D == "k") {
                                    map.setMapTypeId("USGSoldskool")
                                } else {
                                    if (D == "t") {
                                        map.setMapTypeId("USGS")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }(G == "m") ? setUnits(METRIC) : setUnits(ENGLISH);
        (I == "s") ? toggleCalorieCounter(SHOW) : toggleCalorieCounter(HIDE);
        document.controlPanel.weight.value = unescape(n);
        currentWeightUnits = getCurrentUnits();
        (C == "0") ? toggleMarkers(HIDE) : toggleMarkers(SHOW)
    }
    var l = getQuerystringParameter("name", paramString);
    if (unescape(l) != "") {
        $("#nameData").html(unescape(l))
    }
    var g = getQuerystringParameter("description", paramString);
    if (unescape(g) != "") {
        $("#descriptionData").html(unescape(g))
    }
    var o = getQuerystringParameter("show_name_description", paramString);
    if (o == "t") {
        toggleNameDescription(SHOW)
    }
    var t = parseFloat(initializeQuerystringParameter("centerX", DEFAULT_LNG));
    var r = parseFloat(initializeQuerystringParameter("centerY", DEFAULT_LAT));
    var E = getQuerystringParameter("zl", paramString);
    var q;
    if (E.length != 0) {
        var d = getQuerystringParameter("zv", paramString);
        q = parseInt(initializeQuerystringParameter("zl", DEFAULT_ZOOM));
        if (d.length == 0) {
            q = 17 - q
        }
    } else {
        q = DEFAULT_ZOOM
    }
    map.setCenter(new google.maps.LatLng(r, t));
    map.setZoom(q);
    var A = initializeQuerystringParameter("rdm", DRAW_RUNNING);
    setRouteDrawMode(A);
    var h = getQuerystringParameter("pta", paramString);
    if (h.length > 0) {
        var a = h.split(",")
    }
    var p = getQuerystringParameter("polyline", paramString);
    if (p.length > 0) {
        arrPoints = decodePolyline(p);
        bRecordPoints = true;
        document.controlPanel.startRecording.value = "Recording...";
        var w = 0;
        while (w < arrPoints.length) {
            if (rId.length == 0) {
                var F = contractNumber(arrPoints[w++]);
                var v = contractNumber(arrPoints[w++])
            } else {
                var F = arrPoints[w++];
                var v = arrPoints[w++]
            }
            addLeg(v, F, IS_LOADING_FROM_QUERYSTRING, NOT_CREATING_THERE_AND_BACK);
            if (h.length > 0) {
                pointTypeArray.push(a[(w / 2) - 1])
            } else {
                pointTypeArray.push(CLICKED_POINT)
            }
        }
        if (rId.length != 0) {
            if (routeIdFromQueryString.length == 0) {
                markRouteAsUnsaved()
            } else {
                markRouteAsSaved()
            }
        }
        addTweetButton(rId);
        drawPolyLine(gLatLngArray);
        drawMarkers(gLatLngArray);
        var m = initializeQuerystringParameter("elev", DEFAULT_ELEV_PARAM);
        if (m != DEFAULT_ELEV_PARAM) {
            var B = m.split("a");
            var s = B[0];
            var b = B[2].split("b");
            for (var z = 0; z < b.length; z++) {
                bAllElevationsFound = false;
                if (b[z] == "0") {
                    addElevationValueToArray(ELEVATION_UNLOOKEDUP, z)
                } else {
                    addElevationValueToArray(b[z] / 100, z)
                }
            }
            bAllElevationsFound = true;
            drawElevationGraph();
            elevationSwitch(s)
        }
    }
    if ((getQuerystringParameter("centerX", paramString) == "") && (getQuerystringParameter("centerY", paramString) == "")) {
        getDefaultLoc()
    }
}

function getDefaultLoc() {
    $.ajax({
        url: "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxAuthentication/getDefaultLocation",
        dataType: "json",
        type: "POST",
        success: function (j) {
            var b = $.parseJSON(j);
            if (b.loggedin == "true") {
                var d = parseFloat(b.lat);
                var a = parseFloat(b.lng);
                var h = parseFloat(b.zoom);
                if ((d + a + h) != 0) {
                    var g = new google.maps.LatLng(d, a);
                    defaultLocMarker = new google.maps.Marker({
                        position: g,
                        map: map
                    });
                    map.setZoom(h);
                    map.setCenter(g);
                    $("#noDefaultLocButtons").hide();
                    $("#hasDefaultLocButtons").show()
                }
            }
        }
    })
}

function charFill(b, g, a, h) {
    var d = b.length;
    for (k = 0; k < (g - d); k++) {
        if (h == LEFT) {
            b = a + b
        } else {
            if (h == RIGHT) {
                b = b + a
            }
        }
    }
    return b
}

function expandNumber(b) {
    var a;
    if (b.charAt(0) == "-") {
        a = true;
        b = b.replace("-", "")
    } else {
        a = false
    }
    var d = parseFloat(b) * 100000;
    var g = d.toString();
    if (g.indexOf(".") > 0) {
        g = g.substr(0, g.indexOf("."))
    }
    if (g.length < 5) {
        g = charFill(g, 5, "0", LEFT)
    }
    if (a) {
        g = "-" + g
    }
    return g
}

function fixNumber(a) {
    if (a.charAt(0) == "-") {
        isNegative = true;
        a = a.replace("-", "")
    } else {
        isNegative = false
    }
    var b = new String(a);
    if (b.length < 5) {
        b = charFill(b, 5, "0", LEFT)
    }
    if (isNegative) {
        b = "-" + b
    }
    return b
}

function contractNumber(d) {
    var j = fixNumber(new String(d));
    var g = j.length;
    var a = g - 5;
    var h = j.substr(a, 5);
    var b = j.substr(0, a);
    return parseFloat(b + "." + h)
}

function prepPointArray(a) {
    var d = "";
    var b;
    for (i = 0; i < a.length; i++) {
        d += (expandNumber(new String(a[i].lat())) + "," + expandNumber(new String(a[i].lng())));
        if (i < a.length - 1) {
            d += ","
        }
    }
    return d
}

function getPreviousLegDistance(h, b, a) {
    var g = 0;
    previousIdx = a - 1;
    if (a > 0) {
        var d;
        g = returnDistanceInMiles(b[a], h[a], b[previousIdx], h[previousIdx])
    }
    return g
}

function getLastLegDistance(g, a) {
    var d = 0;
    lastPointIdx = g.length - 1;
    secondToLastPointIdx = g.length - 2;
    if (g.length > 1) {
        var b;
        d = returnDistanceInMiles(a[lastPointIdx], g[lastPointIdx], a[secondToLastPointIdx], g[secondToLastPointIdx])
    }
    return d
}

function popInternalArraysForLeg() {
    xArray.pop();
    yArray.pop();
    gLatLngArray.pop();
    updateDistances(xArray, yArray, REMOVE);
    prepMarkerArray();
    pointTypeArray.pop();
    elevationArray.pop();
    ElevationsArrLen = elevationArray.length;
    numberOfFoundElevations--
}

function removeLastLeg() {
    if ((uiPolyline != undefined) && (uiPolyline.getEditable())) {
        setupEditablePolyline(uiPolyline)
    }
    if (xArray.length > 0) {
        if (gLatLngArray.length == 1) {
            popInternalArraysForLeg()
        } else {
            if (pointTypeArray[gLatLngArray.length - 2] == CLICKED_POINT) {
                popInternalArraysForLeg()
            } else {
                while (pointTypeArray[gLatLngArray.length - 2] == GEOCODED_POINT) {
                    popInternalArraysForLeg()
                }
                popInternalArraysForLeg()
            }
        }
        markRouteAsUnsaved();
        drawPolyLine(gLatLngArray);
        drawMarkers(gLatLngArray);
        drawElevationGraph()
    } else {
        alert("No points to remove.\n\nSince all points have been removed, recording has been turned off. Press recording button again to restart.");
        setRecordingStateAndButtons()
    }
}

function encodePolyline(b) {
    var h = b.split(",");
    var l = "";
    var g = 0;
    var j = 0;
    for (c = 0; c < h.length; c += 2) {
        x = h[c];
        xd = x - g;
        g = x;
        f = (Math.abs(xd) << 1) - (xd < 0);
        do {
            e = f & 31;
            f >>= 5;
            if (f) {
                e |= 32
            }
            l += String.fromCharCode(e + 63)
        } while (f != 0);
        y = h[c + 1];
        yd = y - j;
        j = y;
        f = (Math.abs(yd) << 1) - (yd < 0);
        do {
            e = f & 31;
            f >>= 5;
            if (f) {
                e |= 32
            }
            l += String.fromCharCode(e + 63)
        } while (f != 0)
    }
    return l
}

function getQuerystringParameter(g, b) {
    var d = "";
    var l = new String(b);
    var m = new String(g);
    m = m.toLowerCase();
    if (l.indexOf("?") > -1) {
        var r = l.split("?");
        if (r[1].length > 0) {
            var h = r[1];
            var a = h.split("&");
            for (i = 0; i <= a.length - 1; i++) {
                var q = a[i];
                var n = new String(a[i]);
                n = n.toLowerCase();
                var p = n.split("=");
                var o = p[0];
                var j = p[1];
                if (m == o) {
                    d = unescape(q.substr(o.length + 1));
                    break
                }
            }
        }
    }
    return d
}

function addBookmark(b, a) {
    window.external.AddFavorite(a, b)
}

function createPointListForRoute(a) {
    var d = "";
    for (var b = 0; b < a.length; b++) {
        d += a[b].lat() + "a" + a[b].lng();
        if (b < a.length - 1) {
            d += "a"
        }
    }
    return d
}

function returnPermalinkString() {
    var g = map.getCenter().lng();
    var d = map.getCenter().lat();
    var h = "";
    if (gLatLngArray.length > 0) {
        h = createPointListForRoute(gLatLngArray)
    }
    var b = new String(location.href);
    var a = b.split("?");
    b = a[0];
    return ("centerX=" + escape(g) + "&centerY=" + escape(d) + "&zl=" + new String(map.getZoom()) + "&zv=2&fl=" + createFeatureListString() + "&polyline=" + escape(h) + "&elev=" + createElevationQueryString() + "&rId=" + rId + "&rdm=" + getRouteDrawMode() + "&pta=" + pointTypeArray.join())
}

function createFeatureListString() {
    var a;
    a = getCurrentOverlayType();
    a += "-";
    a += ((getCurrentUnits() == METRIC) ? "m" : "e");
    a += "-";
    a += ((document.getElementById("weightRow").style.display == "none") ? "h" : "s");
    a += "-";
    a += escape(document.controlPanel.weight.value);
    a += "-";
    a += ((showMarkers == true) ? "1" : "0");
    return a
}

function createTinyURL() {
    document.getElementById("url").value = returnPermalinkString();
    document.tinyUrlForm.submit()
}

function createPermalink() {
    saveRoute(returnPermalinkString());
    markRouteAsSaved()
}

function displayRouteUrlMessage() {
    document.getElementById("routeUrlMessage").innerHTML = "<div style='color:#ff0000'>URL for this route is: http://www.gmap-pedometer.com/?r=" + rId + " " + ((document.all) ? "<a href=\"javascript:addBookmark('Gmap Pedometer Route " + rId + "','http://www.gmap-pedometer.com/?r=" + rId + "');\">Add bookmark</a>" : "")
}

function markRouteAsUnsaved() {
    routeSaved = false
}

function markRouteAsSaved() {
    routeSaved = true
}

function getRoute(b) {
    var a;
    if (parseInt(b) < 5000000) {
        a = "getRoute.php"
    } else {
        a = "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/get"
    }
    $.ajax({
        url: a,
        type: "POST",
        data: "rId=" + b,
        success: function (d) {
            paramString = "?" + d;
            document.getElementById("map").innerHTML = "";
            drawMap();
            rehydrateMapFromUrl()
        }
    })
}

function getCurrentOverlayType() {
    var a;
    if (map.getMapTypeId() == google.maps.MapTypeId.SATELLITE) {
        a = "s"
    } else {
        if (map.getMapTypeId() == google.maps.MapTypeId.ROADMAP) {
            a = "m"
        } else {
            if (map.getMapTypeId() == google.maps.MapTypeId.HYBRID) {
                a = "h"
            } else {
                if (map.getMapTypeId() == "USGS") {
                    a = "t"
                } else {
                    if (map.getMapTypeId() == "USGSoldskool") {
                        a = "k"
                    } else {
                        if (map.getMapTypeId() == google.maps.MapTypeId.TERRAIN) {
                            a = "p"
                        } else {
                            if (map.getMapTypeId() == "OSM") {
                                a = "o"
                            } else {
                                if (map.getMapTypeId() == "OpenCycle") {
                                    a = "c"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return a
}

function getCurrentUnitsCode() {
    return (getCurrentUnits() == METRIC) ? "m" : "e"
}

function getCurrentShowNameDescriptionState() {
    return (($(".nameRow").css("display") == "block") ? "t" : "f")
}

function getCurrentShowWeightState() {
    return (($(".weightRow").css("display") == "none") ? "h" : "s")
}

function getCurrentWeight() {
    return escape($("#weight").val())
}

function getCurrentShowMarkersState() {
    return ((showMarkers == true) ? "1" : "0")
}

function setAndAppendField(g, h, d, a) {
    if (g) {
        g += "_"
    }
    if (typeof (a) == "string") {
        a += g + h + "=" + escape(d) + "&"
    } else {
        var b = document.createElement("input");
        b.setAttribute("name", g + h);
        b.setAttribute("id", g + h);
        b.setAttribute("value", d);
        a.appendChild(b)
    }
    return a
}

function saveRouteFireModal() {
    if (suppressSaveModal == false) {
        if (rId.length == 0) {
            if (isLoggedIn == LOGINSTATE_IS_LOGGEDIN) {
                $.fn.colorbox({
                    href: "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/saveToAccount",
                    overlayClose: true,
                    width: "80%",
                    height: "80%",
                    iframe: true,
                    open: true,
                    onClosed: getHeader
                })
            } else {
                if (isLoggedIn == LOGINSTATE_NOT_LOGGEDIN) {
                    $.fn.colorbox({
                        href: "saveWithoutLogin.html",
                        overlayClose: false,
                        width: "80%",
                        height: "80%",
                        iframe: true,
                        open: true,
                        onClosed: getHeader
                    })
                } else {
                    alert("We're still checking if you're logged in -- hang on and try again in a few moments.");
                    return
                }
            }
        } else {
            if (isLoggedIn == LOGINSTATE_IS_LOGGEDIN) {
                $.fn.colorbox({
                    href: "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/isRouteOwner?rId=" + rId,
                    overlayClose: true,
                    width: "80%",
                    height: "80%",
                    iframe: true,
                    open: true,
                    onClosed: getHeader
                })
            } else {
                if (isLoggedIn == LOGINSTATE_NOT_LOGGEDIN) {
                    $.fn.colorbox({
                        href: "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/isRouteOwner?rId=" + rId,
                        overlayClose: true,
                        width: "80%",
                        height: "80%",
                        iframe: true,
                        open: true,
                        onClosed: getHeader
                    })
                } else {
                    alert("We're still checking if you're logged in -- hang on and try again in a few moments.");
                    return
                }
            }
        }
    } else {
        saveRoute()
    }
}

function postToFacebook() {
    var b = "http://www.gmap-pedometer.com";
    var a = "You should check out www.gmap-pedometer.com -- the fast and easy way to check the distance of your workouts!";
    if ((typeof (rId) != "undefined") && (rId != "")) {
        b += "?r=" + rId;
        a = "I did " + parseInt(returnDistanceInChosenUnits(distancesArray[distancesArray.length - 1]) * 100) / 100 + " " + ((getCurrentUnits() == METRIC) ? "km" : "mi") + " today and I measured my distance on www.gmap-pedometer.com!"
    }
    var d = {
        method: "feed",
        link: b,
        name: "Gmap-Pedometer.com",
        description: a
    };

    function g(h) {}
    FB.ui(d, g)
}

function addTweetButton(g) {
    var d;
    var b;
    if (typeof (g) == "undefined" || g == "") {
        d = '" ';
        b = '"Use an online map to measure your workouts!" '
    } else {
        d = "?r=" + g + '" ';
        b = '"I did ' + parseInt(returnDistanceInChosenUnits(distancesArray[distancesArray.length - 1]) * 100) / 100 + " " + ((getCurrentUnits() == METRIC) ? "km" : "mi") + ' today!" '
    }
    var a = '<script src="//platform.twitter.com/widgets.js" type="text/javascript"><\/script><div><a href="https://twitter.com/share" class="twitter-share-button" data-via="GmapPedometer"data-url="http://gmap-pedometer.com' + d + "data-text=" + b + 'data-count="none">Tweet</a></div>';
    $("#tweetHolder").html(a)
}

function saveRoute(b) {
    var a = "";
    a = prepareFieldsForSave(a);
    $.ajax({
        url: "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/createUpdate",
        type: "POST",
        data: a,
        success: function (g) {
            rId = parseInt(g);
            if (b == "modal") {
                var d = $(".cboxIframe")[0].src = "saveResponse.php?r=" + rId
            }
            suppressSaveModal = true;
            $("#routeUrlMessage").html("current route: http://" + location.host + "?r=" + rId);
            addTweetButton(rId)
        }
    })
}

function sanitize(a) {
    a.replace("'", "''");
    a.replace("<", "&lt;");
    a.replace(">", "&gt;");
    return a
}

function calculateElevationChange() {
    return returnSmallDistanceInChosenUnits(elevationArray[elevationArray.length - 1] - elevationArray[0])
}

function calculateElevationGain() {
    var a = 0;
    for (i = 0; i < elevationArray.length; i++) {
        if (i > 0 && elevationArray[i] > elevationArray[i - 1]) {
            a = a + (elevationArray[i] - elevationArray[i - 1])
        }
    }
    return returnSmallDistanceInChosenUnits(a)
}

function nameDescriptionSavePrep(b) {
    var a = "";
    if (b != "[Click to enter text]") {
        a = sanitize(b)
    }
    return a
}

function prepareFieldsForSave(b) {
    b = setAndAppendField("", "id", rId, b);
    b = setAndAppendField("", "distance", $("#mileage").html(), b);
    b = setAndAppendField("", "show_name_description", getCurrentShowNameDescriptionState(), b);
    b = setAndAppendField("", "name", nameDescriptionSavePrep($("#nameData").html()), b);
    b = setAndAppendField("", "description", nameDescriptionSavePrep($("#descriptionData").html()), b);
    b = setAndAppendField("", "center_lat", map.getCenter().lat(), b);
    b = setAndAppendField("", "center_lng", map.getCenter().lng(), b);
    b = setAndAppendField("", "zoom_level", map.getZoom(), b);
    b = setAndAppendField("", "overlay_type", getCurrentOverlayType(), b);
    b = setAndAppendField("", "units", getCurrentUnitsCode(), b);
    b = setAndAppendField("", "show_weight", getCurrentShowWeightState(), b);
    b = setAndAppendField("", "weight", getCurrentWeight(), b);
    b = setAndAppendField("", "show_markers", getCurrentShowMarkersState(), b);
    b = setAndAppendField("", "draw_mode", getRouteDrawMode(), b);
    b = setAndAppendField("", "elevation_graph_height", currentElevationGraphHeight, b);
    b = setAndAppendField("", "elevation_gain", calculateElevationGain(), b);
    b = setAndAppendField("", "elevation_change", calculateElevationChange(), b);
    for (var a = 0; a < gLatLngArray.length; a++) {
        b = setAndAppendField("point" + a, "lat", gLatLngArray[a].lat(), b);
        b = setAndAppendField("point" + a, "lng", gLatLngArray[a].lng(), b);
        b = setAndAppendField("point" + a, "elevation", Math.round(elevationArray[a] * 100), b);
        b = setAndAppendField("point" + a, "source", pointTypeArray[a], b)
    }
    b = setAndAppendField("", "numPoints", gLatLngArray.length, b);
    return b
}

function saveRouteUsingColorbox() {
    var a = document.getElementById("cboxIframe").name;
    var b = document.createElement("form");
    b.setAttribute("method", "post");
    b.setAttribute("action", "/gp/" + ENVIRONMENT_IDENTIFIER + "ajaxRoute/createUpdate");
    b.setAttribute("target", a);
    b.setAttribute("rel", "moodalbox");
    b.style.display = "none";
    b = prepareFieldsForSave(b);
    document.body.appendChild(b);
    b.submit()
}

function decodePolyline(z) {
    if (rId.length == 0) {
        var w = z.length;
        var v = 0;
        var u = new Array();
        var t = 0;
        var s = 0;
        while (v < w) {
            var r;
            var q = 0;
            var p = 0;
            do {
                r = z.charCodeAt(v++) - 63;
                p = p | (r & 31) << q;
                q = q + 5
            } while (r >= 32);
            var n;
            if (p & 1) {
                n = ~ (p >> 1)
            } else {
                n = p >> 1
            }
            t = t + n;
            u.push(t);
            q = 0;
            p = 0;
            do {
                r = z.charCodeAt(v++) - 63;
                p = p | (r & 31) << q;
                q = q + 5
            } while (r >= 32);
            var j;
            if (p & 1) {
                j = ~ (p >> 1)
            } else {
                j = p >> 1
            }
            s = s + j;
            u.push(s)
        }
        return u
    } else {
        var o = z.split("a");
        return o
    }
}

function clearLinkHandler() {
    if (bRecordPoints) {
        if (confirm("Are you sure you want to clear the route you've created?\nClicking OK to will clear all points and stop recording.\nClicking Cancel will continue recording and leave points as they are. \nIf you have been saving this route, further changes will be saved with a different route id.")) {
            distancesArray.splice(1, distancesArray.length - 1);
            legArray.splice(0, legArray.length);
            gLatLngArray.splice(0, gLatLngArray.length);
            xArray.splice(0, xArray.length);
            yArray.splice(0, yArray.length);
            mileMarkersToDraw.splice(0, mileMarkersToDraw.length);
            elevationArray.splice(0, elevationArray.length);
            pointTypeArray.splice(0, pointTypeArray.length);
            numberOfFoundElevations = 0;
            ElevationsArrLen = 0;
            $("#mileage").html("0.0000");
            $("#calories").val("0.0000");
            drawElevationGraph();
            setRecordingStateAndButtons();
            if (rId != "") {
                document.getElementById("routeUrlMessage").innerHTML = "<div style='color:#ff0000'>New route started.</div>"
            }
            suppressSaveModal = false;
            markRouteAsUnsaved();
            rId = "";
            addTweetButton(rId)
        }
    } else {
        alert("No points to clear")
    }
}

function clearMarkers() {
    for (var a in ptHash) {
        if (ptHash.hasOwnProperty(a)) {
            ptHash[a].setMap(null);
            delete ptHash[a]
        }
    }
}

function clearPolylines() {
    for (var a = polyLineSegmentsArr.length - 1; a >= 0; a--) {
        polyLineSegmentsArr[a].setMap(null);
        polyLineSegmentsArr.pop()
    }
}

function clearOverlays() {
    clearPolylines();
    clearMarkers()
}

function setRecordingStateAndButtons() {
    bRecordPoints = false;
    if (defaultLocMarker == undefined) {
        clearOverlays();
        $("#startRecording").val("Start recording")
    } else {
        clearOverlays();
        defaultLocMarker.setMap(map);
        $("#recordFromDefaultLoc").val("Default location");
        $("#recordFromOtherLoc").val("Other location")
    }
}

function drawMarkers(g) {
    clearMarkers();
    if (g.length > 0) {
        if (showMarkers) {
            drawStopStartMarker(g[0], START);
            drawStopStartMarker(g[g.length - 1], STOP);
            for (var a = 0; a < mileMarkersToDraw.length; a++) {
                var b;
                var h = a + 1;
                if (h < 11) {
                    b = "unitMarker." + h + ".png"
                } else {
                    b = "unitMarker.php?nm=" + h
                }
                var d = {
                    url: b,
                    size: new google.maps.Size(20, 34),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(9, 34)
                };
                drawMileMarker(mileMarkersToDraw[a], d, a)
            }
        }
    } else {}
}

function drawStopStartMarker(a, b) {
    ptHash[b] = new google.maps.Marker({
        position: a,
        map: map
    })
}

function removeAllMileMarkers() {
    for (var a = 0; a < mileMarkersToDraw.length; a++) {
        if (ptHash[a] != undefined) {
            ptHash[a].setMap(null);
            delete ptHash[a]
        }
    }
}

function drawMileMarker(h, d, b) {
    var a = false;
    var g = false;
    if (ptHash[b] == undefined) {
        ptHash[b] = new google.maps.Marker({
            position: h,
            icon: d,
            map: map
        })
    }
}

function doBoundsIntersect(m, j) {
    var o, g, l, d;
    var n, b, h, a;
    o = m.minX;
    g = m.maxX;
    l = m.minY;
    d = m.maxY;
    n = j.minX;
    b = j.maxX;
    h = j.minY;
    a = j.maxY;
    return !(n > g || b < o || h > d || a < l)
}

function drawPolyLine(d, b) {
    clearPolylines();
    var a = d.slice(0);
    uiPolyline = new google.maps.Polyline({
        path: a,
        strokeColor: "#0000FF",
        zIndex: 5,
        map: map
    });
    polyLineSegmentsArr.push(uiPolyline);
    google.maps.event.addListener(uiPolyline, "click", function () {
        setupEditablePolyline(this)
    });
    if ((b !== undefined) && (b == true)) {
        setupEditablePolyline(uiPolyline)
    }
    google.maps.event.addListener(uiPolyline.getPath(), "set_at", function (g) {
        editVertex(g, this.getArray()[g]);
        drawPolyLine(d, true)
    });
    google.maps.event.addListener(uiPolyline.getPath(), "insert_at", function (j) {
        var h;
        for (var g = 0; g < editPoints.length; g++) {
            h = editPoints[g];
            if (h.vertex >= j) {
                break
            }
        }
        var l = (h.prevLeg == GEOCODED_LEG) ? GEOCODED_POINT : CLICKED_POINT;
        insertVertex(j, uiPolyline.getPath().getAt(j), l);
        drawPolyLine(d, true)
    })
}

function setupEditablePolyline(d) {
    d.setEditable(!d.getEditable());
    if (!d.getEditable()) {
        while (editPoints.length > 0) {
            var g = editPoints.pop();
            g.setMap(null)
        }
    } else {
        var b = -1;
        while (editPoints.length > 0) {
            var g = editPoints.pop();
            g.setMap(null)
        }
        for (var a = 0; a < pointTypeArray.length; a++) {
            if (pointTypeArray[a] == CLICKED_POINT) {
                b++;
                editPoints.push(new google.maps.Marker({
                    position: gLatLngArray[a],
                    draggable: true,
                    vertex: a,
                    markerIndex: b,
                    zIndex: 6,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillOpacity: 1,
                        fillColor: "0000ff",
                        strokeOpacity: 1,
                        strokeColor: "0000ff",
                        strokeWeight: 1,
                        scale: 10
                    }
                }));
                if (a > 0) {
                    if (pointTypeArray[a - 1] == GEOCODED_POINT) {
                        editPoints[b].prevLeg = GEOCODED_LEG
                    } else {
                        editPoints[b].prevLeg = CLICKED_LEG
                    }
                }
                if (a < (pointTypeArray.length - 1)) {
                    if (pointTypeArray[a + 1] == GEOCODED_POINT) {
                        editPoints[b].nextLeg = GEOCODED_LEG
                    } else {
                        editPoints[b].nextLeg = CLICKED_LEG
                    }
                }
                editPoints[b].setMap(map);
                google.maps.event.addListener(editPoints[b], "dragend", function (l) {
                    var j = this;
                    var p = l.latLng;
                    if (((j.prevLeg == CLICKED_LEG) && (j.nextLeg == CLICKED_LEG)) || ((j.prevLeg == undefined) && (j.nextLeg == CLICKED_LEG)) || ((j.nextLeg == undefined) && (j.prevLeg == CLICKED_LEG))) {
                        editVertex(j.vertex, p);
                        drawPolyLine(gLatLngArray, true)
                    } else {
                        var m = (getRouteDrawMode() == DRAW_BIKING) ? google.maps.TravelMode.BICYCLING : google.maps.TravelMode.WALKING;
                        if (j.prevLeg == undefined) {
                            originLatLng = l.latLng
                        } else {
                            if (j.prevLeg == GEOCODED_LEG) {
                                originVertex = editPoints[j.markerIndex - 1].vertex;
                                originLatLng = gLatLngArray[originVertex]
                            } else {
                                originLatLng = l.latLng
                            }
                        } if (j.nextLeg == undefined) {
                            destinatonLatLng = l.latLng
                        } else {
                            if ((j.nextLeg != undefined) && (j.nextLeg == GEOCODED_LEG)) {
                                destinationVertex = editPoints[j.markerIndex + 1].vertex;
                                destinatonLatLng = gLatLngArray[destinationVertex]
                            } else {
                                destinatonLatLng = l.latLng
                            }
                        }
                        var h = {
                            origin: originLatLng,
                            destination: destinatonLatLng,
                            travelMode: m
                        };
                        if (((j.prevLeg != undefined) && (j.prevLeg == GEOCODED_LEG)) && ((j.nextLeg != undefined) && (j.nextLeg == GEOCODED_LEG))) {
                            var o = [];
                            o.push({
                                location: l.latLng,
                                stopover: true
                            });
                            h.waypoints = o
                        }
                        var n = new google.maps.DirectionsService();
                        n.route(h, function (w, s) {
                            if (s == google.maps.DirectionsStatus.OK) {
                                function u(G, F, H) {
                                    var A = [];
                                    yArrayChunk = [];
                                    gLatLngArrayChunk = [];
                                    elevationArrayChunk = [];
                                    pointTypeArrayChunk = [];
                                    distancesArrayChunk = [];
                                    for (var J = 0; J < F.length; J++) {
                                        var I = F[J].path;
                                        for (var z = 0; z < I.length - 1; z++) {
                                            A.push(I[z].lng());
                                            yArrayChunk.push(I[z].lat());
                                            gLatLngArrayChunk.push(I[z]);
                                            elevationArrayChunk.push(ELEVATION_UNLOOKEDUP);
                                            pointTypeArrayChunk.push(GEOCODED_POINT);
                                            distancesArrayChunk.push(0)
                                        }
                                    }
                                    pointTypeArrayChunk[0] = CLICKED_POINT;
                                    var B = H - G;

                                    function C(R, K, Q, O) {
                                        var M = R.slice(0);
                                        R.splice(K, R.length - K);
                                        var L = K + Q;
                                        var P = M.length - L;
                                        var N = M.splice(L, P);
                                        $.merge(R, O);
                                        $.merge(R, N);
                                        return R
                                    }
                                    xArray = C(xArray, G, B, A);
                                    yArray = C(yArray, G, B, yArrayChunk);
                                    gLatLngArray = C(gLatLngArray, G, B, gLatLngArrayChunk);
                                    elevationArray = C(elevationArray, G, B, elevationArrayChunk);
                                    pointTypeArray = C(pointTypeArray, G, B, pointTypeArrayChunk);
                                    distancesArray = C(distancesArray, G, B, distancesArrayChunk);
                                    updateDistances(xArray, yArray, EDIT);
                                    var E = false;
                                    var D = false;
                                    drawElevationGraphIfApplicable(E, D);
                                    resetDistanceMarkers();
                                    markRouteAsUnsaved();
                                    drawMarkers(gLatLngArray)
                                }
                                var q = w.routes[0].legs;
                                var v = j.vertex;
                                var r = (editPoints[j.markerIndex + 1]) ? editPoints[j.markerIndex + 1].vertex : undefined;
                                var t = (editPoints[j.markerIndex - 1]) ? editPoints[j.markerIndex - 1].vertex : undefined;
                                if ((j.prevLeg == undefined) || (j.nextLeg == undefined)) {
                                    if (j.prevLeg == undefined) {
                                        editVertex(j.vertex, p);
                                        u(v, q[0].steps, r)
                                    } else {
                                        if (j.nextLeg == undefined) {
                                            editVertex(j.vertex, p);
                                            u(t, q[0].steps, v)
                                        }
                                    }
                                } else {
                                    if ((j.nextLeg == CLICKED_LEG) && (j.prevLeg == GEOCODED_LEG)) {
                                        editVertex(j.vertex, p);
                                        u(t, q[0].steps, v)
                                    } else {
                                        if ((j.nextLeg == GEOCODED_LEG) && (j.prevLeg == CLICKED_LEG)) {
                                            editVertex(j.vertex, p);
                                            u(v, q[0].steps, r)
                                        } else {
                                            if ((j.nextLeg == GEOCODED_LEG) && (j.prevLeg == GEOCODED_LEG)) {
                                                u(v, q[1].steps, r);
                                                editVertex(j.vertex, p);
                                                u(t, q[0].steps, v)
                                            }
                                        }
                                    }
                                }
                                drawPolyLine(gLatLngArray, true)
                            }
                        })
                    }
                })
            }
        }
    }
}

function setCurrentUnits(b) {
    var a = document.controlPanel.units;
    if (b == ENGLISH) {
        a[0].checked = true;
        a[1].checked = false
    } else {
        if (b == METRIC) {
            a[0].checked = false;
            a[1].checked = true
        }
    }
}

function setRouteDrawMode(a) {
    var d = parseInt(a);
    for (var b = 0; b <= 2; b++) {
        if (b == d) {
            document.controlPanel.legDraw[b].checked = true
        } else {
            document.controlPanel.legDraw[b].checked = false
        }
    }
}

function getRouteDrawMode() {
    var a;
    var b = document.controlPanel.legDraw;
    if (b[0].checked) {
        a = DRAW_RUNNING
    } else {
        if (b[1].checked) {
            a = DRAW_BIKING
        } else {
            if (b[2].checked) {
                a = DRAW_MANUAL
            }
        }
    }
    return a
}

function shouldUseDirectionsForDrawingLeg(h, d, b) {
    var a = false;
    if ((!h) && (!d) && (b > 0)) {
        var g = document.controlPanel.legDraw;
        if (g[0].checked || g[1].checked) {
            a = true
        }
    }
    return a
}

function getCurrentUnits() {
    var b;
    var a = document.controlPanel.units;
    if (a[0].checked) {
        b = ENGLISH
    } else {
        if (a[1].checked) {
            b = METRIC
        }
    }
    return b
}

function getCurrentMultiplier(a) {
    var b = getCurrentUnits();
    var d;
    if (a == DISTANCE) {
        if (b == METRIC) {
            d = 1.609345
        } else {
            d = 1
        }
    } else {
        if (a == WEIGHT) {
            if (b == METRIC) {
                d = 0.45359237
            } else {
                d = 1
            }
        } else {
            if (a == SMALLDISTANCE) {
                if (b == METRIC) {
                    d = 0.3048
                } else {
                    d = 1
                }
            }
        }
    }
    return d
}

function returnSmallDistanceInChosenUnits(a) {
    var b = getCurrentMultiplier(SMALLDISTANCE);
    return a * b
}

function roundToTwoDecimalPlaces(a) {
    return Math.round(a * 100) / 100
}

function returnDistanceInChosenUnits(a) {
    var b = getCurrentMultiplier(DISTANCE);
    return a * b
}

function toggleMarkers(a) {
    if (a == SHOW) {
        showMarkers = true;
        document.getElementById("markerSwitch").innerHTML = 'Turn <a href="javascript:toggleMarkers(HIDE);">off</a> mile markers'
    } else {
        if (a == HIDE) {
            showMarkers = false;
            document.getElementById("markerSwitch").innerHTML = 'Turn <a href="javascript:toggleMarkers(SHOW);">on</a> mile markers'
        }
    }
    prepMarkerArray();
    drawMarkers(gLatLngArray)
}

function toggleNameDescription(a) {
    if (a == SHOW) {
        document.getElementById("nameDescriptionSwitch").innerHTML = 'Turn <a href="javascript:toggleNameDescription(HIDE);">off</a> name and description';
        $(".nameRow").show();
        $(".descriptionRow").show();
        $(".nameRow").fadeTo(250, 1);
        $(".descriptionRow").fadeTo(250, 1);
        var b = $(".nameRow").height() + $(".descriptionRow").height();
        $("#controls").height($("#controls").height() + b)
    } else {
        if (a == HIDE) {
            document.getElementById("nameDescriptionSwitch").innerHTML = 'Turn <a href="javascript:toggleNameDescription(SHOW);">on</a> name and description';
            var d = $(".nameRow").height() + $(".descriptionRow").height();
            $(".nameRow").fadeTo(250, 0, function () {
                $(".nameRow").hide()
            });
            $(".descriptionRow").fadeTo(250, 0, function () {
                $(".descriptionRow").hide()
            });
            setTimeout(function () {
                $("#controls").height($("#controls").height() - d)
            }, 250)
        }
    }
}

function toggleCalorieCounter(a) {
    if (a == SHOW) {
        document.getElementById("calorieCounterSwitch").innerHTML = 'Turn <a href="javascript:toggleCalorieCounter(HIDE);">off</a> calorie counter';
        $(".weightRow").show();
        $(".calorieRow").show();
        $(".weightRow").fadeTo(250, 1);
        $(".calorieRow").fadeTo(250, 1);
        var b = $(".weightRow").height() + $(".calorieRow").height();
        $("#controls").height($("#controls").height() + b)
    } else {
        if (a == HIDE) {
            if ($(".weightRow").css("display") == "block") {
                document.getElementById("calorieCounterSwitch").innerHTML = 'Turn <a href="javascript:toggleCalorieCounter(SHOW);">on</a> calorie counter';
                var d = $(".weightRow").height() + $(".calorieRow").height();
                $(".weightRow").fadeTo(250, 0, function () {
                    $(".weightRow").hide()
                });
                $(".calorieRow").fadeTo(250, 0, function () {
                    $(".calorieRow").hide()
                });
                setTimeout(function () {
                    $("#controls").height($("#controls").height() - d)
                }, 250)
            }
        }
    }
}

function updateWeightBoxWithUnitToggle(d) {
    if (d != currentWeightUnits) {
        var a = document.controlPanel.weight.value;
        var b;
        if (getCurrentUnits() == METRIC) {
            b = parseFloat(a) * 0.45359237
        } else {
            b = parseFloat(a) * 2.20462262
        }
        document.controlPanel.weight.value = b;
        currentWeightUnits = getCurrentUnits()
    }
}

function handleUnitToggle(a) {
    updateWeightBoxWithUnitToggle(a);
    setUnitLabels(a);
    prepMarkerArray();
    drawMarkers(gLatLngArray);
    elevationSwitch(currentElevationGraphHeight)
}

function setUnitLabels(a) {
    if (a == METRIC) {
        $("#dstUnits1").html("km");
        $("#wtUnits").html("kg")
    } else {
        if (a == ENGLISH) {
            $("#dstUnits1").html("miles");
            $("#wtUnits").html("lb")
        }
    }
    updateDistanceBoxes()
}

function setUnits(a) {
    if (a != getCurrentUnits()) {
        setCurrentUnits(a);
        setUnitLabels(a)
    }
}

function geoCode() {
    var a = new google.maps.Geocoder();
    a.geocode({
        address: document.getElementById("locationBox").value
    }, function (d, b) {
        var h = document.locationSearch.zoom_level;
        var g = parseInt(h[h.selectedIndex].value);
        map.setCenter(d[0].geometry.location);
        map.setZoom(g)
    })
}

function showCountry() {
    var a = document.locationSearch.country;
    a.style.display = "inline"
}

function printMap() {
    document.getElementById("searchBox").style.display = "none";
    document.getElementById("copy").style.display = "none";
    document.getElementById("printDone").style.display = "block";
    document.getElementById("mapPane").style.left = "0";
    window.print()
}

function drawSvgAnalogue(b, a) {
    svgParent.innerHTML += '<img src="parseSvg.pl?' + b + '" style="' + a + '">'
}

function printDone() {
    document.getElementById("printDone").style.display = "none";
    document.getElementById("searchBox").style.display = "block";
    document.getElementById("copy").style.display = "block";
    document.getElementById("mapPane").style.left = "30%";
    document.getElementById("mapPane").style.width = "70%";
    document.getElementById("mapPane").style.height = "96%";
    if ((typeof (svgCache) != "undefined") && (svgCache.length > 0)) {
        svgParent.innerHTML = "";
        svgCache = "";
        drawPolyLine(gLatLngArray)
    }
}

function getElevation(b, a) {
    if (elevationArray[a] == ELEVATION_UNLOOKEDUP) {
        elevationArray[a] = ELEVATION_LOOKEDUP_NOT_YET_RETURNED;
        $.ajax({
            url: "getElevation.php?x=" + b.lng() + "&y=" + b.lat()
        }).done(function (d) {
            addElevation(d, a)
        })
    }
}

function addElevationValueToArray(a, b) {
    if (a == ELEVATION_UNLOOKEDUP) {
        elevationArray[b] = null
    } else {
        elevationArray[b] = parseInt(a * 100) / 100
    }
}

function addElevation(a, b) {
    numberOfFoundElevations++;
    if (a == "-32768") {
        bShowRefreshLink = true;
        a = "0"
    }
    var d = parseFloat(a) * 3.2808399;
    elevationArray[b] = parseInt(d * 100) / 100;
    drawElevationGraph()
}

function getPixelsPerUnit() {
    if (getCurrentUnits() == METRIC) {
        return "62"
    } else {
        return "100"
    }
}

function drawElevGraphHtml(a) {
    var v;
    var u = 0;
    var n = 0;
    var p = 0;
    v = "";
    var q = new String(a);
    var d = q.split(";");
    var g = 50;
    var r;
    var b = new Array(0);
    CurrentElevations = "";
    for (var m = 0; m < d.length; m++) {
        var t = new String(d[m]);
        var l = t.split(",");
        var s = parseFloat(l[1]);
        if (m == 0) {
            u = s;
            n = s;
            p = s
        }
        if (s > u) {
            u = s
        }
        if (s < n) {
            n = s
        }
        CurrentElevations = CurrentElevations += roundToTwoDecimalPlaces(returnDistanceInChosenUnits(distancesArray[m])) + "," + roundToTwoDecimalPlaces(returnSmallDistanceInChosenUnits(elevationArray[m])) + ";";
        if ((m == d.length - 1) || ((m + 1) % g == 0)) {
            CurElevObj = new String(CurrentElevations);
            b.push(CurElevObj.substr(0, CurElevObj.length - 1))
        }
        if ((m < d.length - 2) && ((m + 1) % g == 0)) {
            CurrentElevations = roundToTwoDecimalPlaces(returnDistanceInChosenUnits(distancesArray[m])) + "," + roundToTwoDecimalPlaces(returnSmallDistanceInChosenUnits(elevationArray[m])) + ";"
        }
    }
    var o = roundToTwoDecimalPlaces(returnDistanceInChosenUnits(distancesArray[distancesArray.length - 1]));
    v += '<div style="width:' + (getPixelsPerUnit() * o) + 'px">';
    for (var h = 0; h < b.length; h++) {
        v += '<img style="margin:0px" src="drawGraph.php?elevDist=' + b[h] + "&graphHeight=" + currentElevationGraphHeight + "&pixelsPerUnit=" + getPixelsPerUnit() + "&min=" + n + "&max=" + u + "&start=" + p + "&totalDistance=" + o + '">'
    }
    v += "</div>";
    return v
}

function drawElevationGraph() {
    var a = drawElevGraphQString();
    if ((elevationArray.length >= 2) && (!bAllElevationsWereZero)) {
        if (numberOfFoundElevations == gLatLngArray.length) {
            document.getElementById("elevationChart").innerHTML = ((bShowRefreshLink) ? REFRESH_LINK : "") + drawElevGraphHtml(a)
        } else {
            iPercent = Math.round((numberOfFoundElevations / (gLatLngArray.length - 1)) * 100);
            document.getElementById("elevationChart").innerHTML = '<span style="font-family:arial;font-size:10pt">Please wait, looking up elevations...' + iPercent + "%</span>"
        }
    } else {
        document.getElementById("elevationChart").innerHTML = NO_GRAPH_MESSAGE
    }
}

function elevationSwitch(a) {
    currentElevationGraphHeight = a;
    if (a == 0) {
        document.getElementById("elevationSwitch0").innerHTML = unlinkElevation0;
        document.getElementById("elevationSwitch100").innerHTML = linkElevation100;
        document.getElementById("elevationSwitch200").innerHTML = linkElevation200
    } else {
        if (a == 100) {
            document.getElementById("elevationSwitch0").innerHTML = linkElevation0;
            document.getElementById("elevationSwitch100").innerHTML = unlinkElevation100;
            document.getElementById("elevationSwitch200").innerHTML = linkElevation200
        } else {
            if (a == 200) {
                document.getElementById("elevationSwitch0").innerHTML = linkElevation0;
                document.getElementById("elevationSwitch100").innerHTML = linkElevation100;
                document.getElementById("elevationSwitch200").innerHTML = unlinkElevation200
            }
        }
    } if ((a == 100) || (a == 200)) {
        window.setTimeout("getElevationsAndDrawGraph()", 1);
        $("#elevationChart").css("display", "block")
    }
    $("#elevationChart").animate({
        height: a
    }, 500, setElevationVisibility(a))
}

function setElevationVisibility(a) {
    if (a == 0) {
        setBorder("#elevationChart", "0px");
        $("#elevationChart").css("display", "none")
    } else {
        setBorder("#elevationChart", "1px solid black")
    }
}

function setBorder(b, a) {
    $(b).css("border-left", a);
    $(b).css("border-right", a);
    $(b).css("border-top", a);
    $(b).css("border-bottom", a)
}

function refreshGraph() {
    bShowRefreshLink = false;
    numberOfFoundElevations = 0;
    performElevationLookup = false;
    getElevationsUponGraphSelect()
}

function getElevationsAndDrawGraph() {
    getElevationsUponGraphSelect();
    drawElevationGraph()
}

function getElevationsUponGraphSelect() {
    numberOfFoundElevations = 0;
    for (var a = 0; a < gLatLngArray.length; a++) {
        bAllElevationsFound = false;
        if (elevationArray[a] == ELEVATION_UNLOOKEDUP) {
            getElevation(gLatLngArray[a], a)
        } else {
            if (elevationArray[a] == ELEVATION_LOOKEDUP_NOT_YET_RETURNED) {} else {
                numberOfFoundElevations++
            }
        }
    }
    bAllElevationsFound = true
}

function createElevationQueryString() {
    var b = "";
    for (var a = 0; a < elevationArray.length; a++) {
        b += Math.round(elevationArray[a] * 100);
        if (a < elevationArray.length - 1) {
            b += "b"
        }
    }
    var d = "1";
    return currentElevationGraphHeight + "a" + d + "a" + b
}

function drawElevGraphQString() {
    var b = "";
    for (i = 0; i < elevationArray.length; i++) {
        b += roundToTwoDecimalPlaces(returnDistanceInChosenUnits(distancesArray[i])) + "," + roundToTwoDecimalPlaces(returnSmallDistanceInChosenUnits(elevationArray[i])) + ";";
        if ((elevationArray[i] != ELEVATION_LOOKEDUP_NOT_YET_RETURNED) && (elevationArray[i] != ELEVATION_UNLOOKEDUP)) {
            bAllElevationsWereZero = false
        }
    }
    var a = new String(b);
    return a.substring(0, a.length - 1)
}

function saveUnsavedChanges() {
    if (routeSaved == false) {
        if (isAutoSaveEnabled()) {
            var a = confirm("Your route has unsaved changes. Click OK to save, or cancel to continue without saving.");
            if (a) {
                synchronousSave()
            }
        }
    }
}

function synchronousSave() {
    $.ajax({
        url: "saveRoute.php",
        type: "POST",
        data: returnPermalinkString(),
        success: function (a) {
            setCookie("lastRid", rId, 365)
        }
    })
}

function getCookie(d) {
    var a = "";
    var b = document.cookie.split(";");
    for (var g = 0; g < b.length; g++) {
        if (b[g].indexOf(d + "=") > -1) {
            a = b[g].substr(b[g].indexOf("=") + 1);
            break
        }
    }
    return a
}

function setCookie(h, l, b) {
    var g = h + "=" + l + ";";
    var j;
    if (b != 0) {
        var d = 86400000;
        var a = new Date();
        a.setTime(a.setTime(a.getTime() + (b * d)));
        g += "expires=" + a.toGMTString() + ";"
    }
    g += "path=/";
    document.cookie = g
}

function drawAutosaveMessage() {
    var a = getCookie("lastRid");
    if (isAutoSaveEnabled()) {
        if (a != "0") {
            document.getElementById("autoSaveMessage").innerHTML = '<a href="?r=' + a + '">Click here</a> to reload route ' + a + "."
        }
    }
}

function clearAutoSaveMessage() {}

function isAutoSaveEnabled() {
    var a = getCookie("lastRid");
    return (a.length > 0)
}
var debugWin;

function debugIt(a) {
    if (!debugWin) {
        debugWin = window.open("", "", "")
    }
    debugWin.document.write(a + "<br>")
}

function debugItNoHr(a) {
    if (!debugWin) {
        debugWin = window.open("", "", "")
    }
    debugWin.document.write(a)
}

function svgon() {
    _mSvgEnabled = true;
    _mSvgForced = true
}

function hideControlBox() {
    $("#copy").before('<span id="zoomLink" class="plain"><a href="javascript:showControlBox();">zoom open</a></span>');
    $("#zoomLink").height($("#controls").height());
    $("#zoomLink").width($("#controls").width());
    $("#controls").animate({
        opacity: "0"
    }, 250, shrinkControlBoxParts)
}

function shrinkControlBoxParts() {
    $("#controls").css("display", "none");
    $("#copy").css("display", "none");
    $("#zoomLink").css("display", "block");
    $("#zoomLink").animate({
        height: "25",
        width: "100"
    }, 500)
}

function showControlBox() {
    var a = $("#controls").height();
    var b = $("#controls").width();
    $("#zoomLink").animate({
        height: a,
        width: b
    }, 500, showControlBoxParts)
}

function showControlBoxParts() {
    $("#zoomLink").remove();
    $("#copy").css("display", "block");
    $("#controls").css("display", "block");
    $("#controls").css("opacity", "100")
}

function scrollMap() {
    resizeMap()
}

function expandMap() {
    $("#map").animate({
        height: $("#map").height() + 149
    });
    $("#mapPane").height($("#mapPane").height() + 149);
    $("#moremaplink").text("re-shrink map");
    $("#moremaplink")[0].href = "javascript:shrinkMap();";
    var a = ($.browser.msie || $.browser.webkit) ? "body" : "html";
    map.checkResize()
}

function shrinkMap() {
    $("#moremaplink").text("click here to expand map");
    $("#moremaplink")[0].href = "javascript:expandMap();";
    var a = ($.browser.msie || $.browser.webkit) ? "body" : "html";
    $("#map").animate({
        height: $("#map").height() - 149
    });
    $("#map").height($("#map").height() - 149);
    $("#mapPane").height($("#mapPane").height() - 149);
    map.checkResize()
}

function loadAds() {
    function d(m, l) {
        $("#" + l).show();
        m -= $("#" + l).width();
        return m
    }
    var j = 768;
    var h = 468;
    var a = 234;
    var b = $("body").width();
    var g = b - j;
    if (g >= j) {
        g = d(g, "mmLeaderboardLeft")
    } else {
        if (g >= a) {
            g = d(g, "mmHalfBannerLeft")
        }
    }
};