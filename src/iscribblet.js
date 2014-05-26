/*
 * iScribblet (https://github.com/agentzh/iScribblet)
 * Copyright (c) 2014 Yichun Zhang.
 * Copyright (c) 2009 Kai Jäger. Some rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the license.txt file.
 */

(function() {
    var COLORS,
        LINE_COLORS,
        LINE_WIDTH,
        _absolute,
        _pixels,
        _zeroPixels,
        _window,
        _document,
        _documentBody,
        textDisplay,
        strokeColor,
        colorIndex,
        canvas,
        canvasContext,
        temp,
        temp2,
        temp3,
        temp4,
        temp5,
        scribble,
        isMouseDown,
        lastX,
        lastY,
        scrollTop,
        scrollLeft;

    // "Constant" definitions
    LINE_WIDTH = 1;

    var saved = true;
    var lastSaved = 0;

    // Assign DOM objects and functions to variables. This results in smaller
    // code after minification.
    _window = window;
    _document = document;
    _documentBody = _document.body;

    // Current stroke color
    colorIndex = 0;
    strokeColor = 'red';

    function _createElement(tagName) {
        return _document.createElement(tagName);
    };

    function _appendChild(parent, child) {
        parent.appendChild(child);
    };

    scrollTop = _documentBody.scrollTop;
    scrollLeft = _documentBody.scrollLeft;

    _absolute = 'absolute';
    _pixels = 'px';
    _zeroPixels = '0px';

    var meta = _createElement("meta")
    with (meta) {
        name = "viewport";
        content = "minimal-ui"
    }
    document.getElementsByTagName('head')[0].appendChild(meta);

    // Holds the internal representation of the current scribbble
    scribble = [];

    // Create canvas, info display, copy & paste bin
    canvas = _createElement('canvas');
    var style = canvas.style;
    style.position = _absolute;
    style.left = _zeroPixels;
    style.top = _zeroPixels;
    style.zIndex = '1990';
    style.cursor = 'crosshair';
    _appendChild(_documentBody, canvas);
    canvasContext = canvas.getContext('2d');

    textDisplay = _createElement('div');
    style = textDisplay.style;
    style.color = '#000';
    style.background = '#FFF';
    style.border = '1px solid #000';
    style.margin = '15px';
    style.position = 'fixed';
    style.zIndex = '2000';
    style.background = '#F2F2F2';
    style.opacity = MozOpacity = '0.9';
    style.top = 15 + _pixels;
    style.left = 15 + _pixels;
    _appendChild(_documentBody, textDisplay);

    var scrollButton = _createElement('a');
    with (scrollButton) {
        innerHTML = '<span style="color: #000; padding: 2em">Scroll</span>';
        border = '5px solid #000';
        padding = '20px';
        margin = '10px';
        font = '14px sans-serif';
        position = 'static';
    }
    _appendChild(textDisplay, scrollButton);

    var scrollMode = false;

    function toggleScroll() {
        if (browseMode && scrollMode) {
            return false;
        }
        scrollMode = !scrollMode;
        scrollButton.style.background = (scrollMode ? '#929292' : '#F2F2F2');
        return false;
    }

    toggleScroll();

    scrollButton.addEventListener("click", toggleScroll, false);

    var browseButton = _createElement('a');
    with (browseButton) {
        innerHTML = '<span style="color: #000; padding: 1em">Browse</span>';
        border = '1px solid #000';
        padding = '15px';
        margin = '10px';
        font = '14px sans-serif';
        position = 'static';
    }
    _appendChild(textDisplay, browseButton);

    var browseMode = false;

    function toggleBrowse() {
        browseMode = !browseMode;
        browseButton.style.background = (browseMode ? '#929292' : '#F2F2F2');
        if (browseMode) {
            if (!scrollMode) {
                toggleScroll();
            }
            canvas.style.display = 'none';

        } else {
            if (scrollMode) {
                toggleScroll();
            }

            canvas.style.display = 'block';
        }
        return false;
    }

    browseButton.addEventListener("click", toggleBrowse, false);

    var undoButton = _createElement('a');
    with (undoButton) {
        innerHTML = '<span style="color: #000; padding: 1em">Undo</span>';
        border = '1px solid #000';
        padding = '15px';
        margin = '10px';
        font = '14px sans-serif';
        position = 'static';
    }
    _appendChild(textDisplay, undoButton);
    function undo() {
        undoButton.style.background = '#929292';
        var i = scribble.length - 1;
        var hits = 0;
        while (i >= 0 && scribble[i] == -1) {
            i--;
            scribble.pop();
            lastSaved = 0;
            saved = false;
        }
        while (i >= 0) {
            if (scribble[i--] == -1) {
                break;
            }
            hits++;
            //alert("poping");
            scribble.pop();
        }
        if (hits) {
            saved = false;
            lastSaved = 0;
            repaint();
        }
        //alert(hits + " hits.");
        return false;
    }

    undoButton.addEventListener("mousedown", undo, false);
    undoButton.addEventListener("mouseup",
                                function () {
                                    undoButton.style.background = '#F2F2F2';
                                    return false;
                                }, false);


    var msgArea = _createElement('div');
    style = msgArea.style
    style.font = '14px sans-serif';
    style.border = '1px solid #000';
    style.background = '#F2F2F2';
    style.color = '#000';
    _appendChild(textDisplay, msgArea);

    var hideTimer = null;
    var url = location.href.replace(/#.*/, '');

    function msg(s) {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        msgArea.style.display = 'block';
        msgArea.textContent = s;
    }

    function doHideMsg() {
        msgArea.style.display = 'none';
    }

    function hideMsg() {
        if (!hideTimer) {
            hideTimer = setTimeout(doHideMsg, 5000);
        }
    }

    var historyLoaded = false;

    function loadHistory() {
        var ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function() {
            if (ajax.readyState == 4) {
                var status = ajax.status
                if (status == 200) {
                    //alert(ajax.responseText);
                    var text = ajax.responseText;
                    if (text == "") {
                        lastSaved = 0;
                        historyLoaded = true;
                        scribble = [];
                        msg("Fetched history data is empty");
                        hideMsg();
                        return
                    }

                    var hist;
                    try {
                        hist = decodePoints(text);

                    } catch (e) {
                        msg("Failed to decode points data: " + e)
                        return;
                    }

                    msg("History data loaded (" + (text.length / 1024).toFixed(3)
                        + " KB, " + hist.length + " points)");
                    hideMsg();
                    historyLoaded = true;
                    lastSaved = hist.length;

                    for (var i = 0; i < hist.length; i++) {
                        var n = parseInt(hist[i])
                        if (isNaN(n)) {
                            msg("Server returned invalid number: " + hist[i])
                            return
                        }
                        hist[i] = n
                    }

                    for (var i = 0; i < scribble.length; i++) {
                        hist.push(scribble[i]);
                    }

                    scribble = hist;
                    repaint();
                    return;
                }

                var body = ajax.responseText
                if (body && body.length > 0) {
                    if (body.length > 30) {
                        body = body.substring(0, 30)
                    }
                } else {
                    body = ""
                }

                msg("Failed to fetch data: status=" + ajax.status + ": " + body);
                setTimeout(loadHistory, 3000);
                return;
            }
        }

        msg("Loading history...");
        ajax.open("POST", "https://api.iscribblet.org/fetch", true);
        ajax.setRequestHeader("Content-Type", "text/plain");
        ajax.send(url);
    }

    var saving = false

    function saveData() {
        if (!historyLoaded) {
            // TODO: append new data
            //msg("history not yet loaded");
            return;
        }

        if (saved || saving) {
            //msg("already saved");
            return;
        }

        var apiName
        var list
        var nPoints = 0
        var savedLen = scribble.length

        if (lastSaved == 0 || lastSaved >= savedLen) {
            list = scribble;
            nPoints = savedLen;
            apiName = "store";

        } else {
            nPoints = scribble.length - lastSaved
            list = new Array()
            for (i = lastSaved; i < savedLen; i++) {
                list.push(scribble[i])
            }
            apiName = "append";
        }

        var jsonData = JSON.stringify({
            "url": url,
            "points": (apiName == "append" ? " " : "") + encodePoints(list)
        })
        saving = true;

        var ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function() {
            if (ajax.readyState == 4) {
                saving = false;

                var status = ajax.status
                if (status == 200) {
                    //alert(ajax.responseText);
                    var ans = ajax.responseText;
                    if (ans == "") {
                        msg("Empty response for saving");
                        saved = false;
                        return
                    }

                    saved = true;
                    lastSaved += nPoints;
                    msg(ans);
                    hideMsg();
                    return;
                }

                saved = false;
                var body = ajax.responseText
                if (body && body.length > 0) {
                    if (body.length > 30) {
                        body = body.substring(0, 30)
                    }
                } else {
                    body = ""
                }
                msg("Failed to store data: status=" + ajax.status + ": " + body);
                return;
            }
        }

        msg("Saving data...(" + (jsonData / 1024).toFixed(3) + " KB, "
            + nPoints +  " points)");
        ajax.open("POST", "https://api.iscribblet.org/" + apiName, true);
        ajax.setRequestHeader("Content-Type", "text/plain");
        ajax.send(jsonData);
    }

    setInterval(saveData, 5000);

    window.onbeforeunload = function () {
        if ((scribble.length > 0 && !saved) || saving) {
            return "There is still unsaved scribble data.";
        }
    }

    // Repaints the scribble
    function repaint() {
        if (browseMode) {
            return;
        }
        with (canvasContext) {
            var w = canvas.offsetWidth;
            var h = canvas.offsetHeight;
            clearRect(0, 0, w, h);
            var len = scribble.length;
            var i = 0;
            lastX = -1;
            lastY = -1;
            beginPath();
            while (i < len) {
                if (scribble[i] == -1) {
                    strokeStyle = strokeColor;
                    lineWidth = LINE_WIDTH;
                    stroke();
                    beginPath();
                    lastX = -1;
                    ++i;
                } else if (lastX == -1) {
                    lastX = scribble[i++] - scrollLeft;
                    lastY = scribble[i++] - scrollTop;
                    if (lastX >= 0 && lastX <= w && lastY >= 0 && lastY <= h) {
                        moveTo(lastX, lastY);
                    }

                } else {
                    var x = scribble[i++] - scrollLeft
                    var y = scribble[i++] - scrollTop
                    if (x >= 0 && x <= w && y >= 0 && y <= h) {
                        lineTo(x, y);
                    }
                }
            }
            stroke();
        }
    };

    // Event handlers
    isMouseDown = false;

    temp = _window.onresize = function() {
        canvas.style.top = scrollTop + _pixels;
        canvas.style.left = scrollLeft + _pixels;
        canvas.width = _documentBody.clientWidth;
        canvas.height = _window.innerHeight;
        // TODO take zoom ratio into account here
        repaint();
    };
    temp();

    temp = _window.onscroll = function() {
        scrollTop = _documentBody.scrollTop ||
            _document.documentElement.scrollTop;
        scrollLeft = _documentBody.scrollLeft ||
            _document.documentElement.scrollLeft;

        //textDisplay.style.top = scrollTop + 50 + _pixels;
        canvas.style.top = scrollTop + _pixels;

        //textDisplay.style.left = scrollLeft + 50 +  _pixels;
        canvas.style.left = scrollLeft + _pixels;

        repaint();
    };
    temp();

    canvas.onmousedown = function(e) {
        if (scrollMode) {
            return true;
        }

        if (isMouseDown) {
            saved = false;
            scribble.push(-1);
        }

        isMouseDown = true;
        lastX = e.clientX;
        lastY = e.clientY;
        saved = false;
        scribble.push(lastX + scrollLeft);
        scribble.push(lastY + scrollTop);
    };

    canvas.onmouseup = function(e) {
        if (scrollMode) {
            return true;
        }

        isMouseDown = false;
        saved = false;
        scribble.push(e.clientX + scrollLeft);
        scribble.push(e.clientY + scrollTop);
        scribble.push(-1);

        //exportScribble();
        repaint();
    };

    canvas.onmousemove = function(e) {
        if (scrollMode) {
            return true;
        }

        if (!isMouseDown) {
            return false;
        }

        var x = e.clientX;
        var y = e.clientY;

        /*
        if (lastX >= 0 && lastY >= 0) {
            if (Math.abs(x - lastX) >= 100 || Math.abs(y - lastY) >= 100) {
                return false;
            }
        }
        */

        saved = false;
        scribble.push(x + scrollLeft);
        scribble.push(y + scrollTop);

        with (canvasContext) {
            beginPath();
            moveTo(lastX, lastY);
            lineTo(x, y);
            strokeStyle = strokeColor;
            lineWidth = LINE_WIDTH;
            stroke();
        }

        lastX = x;
        lastY = y;
    };

    canvas.addEventListener("touchstart", function(e) {
        if (scrollMode) {
            return true;
        }

        var x, y;
        var touches = e.touches;
        var len = touches.length;
        for (i = 0; i < len; i++) {
            var t = touches[i]
            if (x == undefined || t.clientX < x) {
                /* assuming it is right-hand */
                x = t.clientX;
                y = t.clientY;
            }
        }

        if (isMouseDown) {
            saved = false;
            scribble.push(-1);
        }

        lastX = x;
        lastY = y;

        isMouseDown = true;

        //alert("touch start: " + lastX + ", " + lastY);
        saved = false;
        scribble.push(lastX + scrollLeft);
        scribble.push(lastY + scrollTop);
        e.preventDefault();
        return false;
    });

    /*
    canvas.addEventListener("touchend", function(e) {
        if (e.touches.length == 1) {
            if (!isMouseDown) {
                return;
            }
            isMouseDown = false;
            saved = false;
            scribble.push(e.touches[0].clientX + scrollLeft);
            scribble.push(e.touches[0].clientY + scrollTop);
            scribble.push(-1);

            exportScribble();
            repaint();
            e.preventDefault();
            return false;
        }
    });
    */

    canvas.addEventListener("touchmove", function(e) {
        if (scrollMode) {
            return true;
        }

        if (!isMouseDown) {
            e.preventDefault();
            return false;
        }

        var x, y;
        var touches = e.touches;
        var len = touches.length;
        for (i = 0; i < len; i++) {
            var t = touches[i]
            if (x == undefined || t.clientX < x) {
                /* assuming it is right-hand */
                x = t.clientX;
                y = t.clientY;
            }
        }

        /*
        if (lastX >= 0 && lastY >= 0) {
            if (Math.abs(x - lastX) >= 30 || Math.abs(y - lastY) >= 30) {
                e.preventDefault();
                return false;
            }
        }
        */

        //alert("touch move: " + temp + " " + temp2);
        saved = false;
        scribble.push(x + scrollLeft);
        scribble.push(y + scrollTop);

        with (canvasContext) {
            beginPath();
            moveTo(lastX, lastY);
            lineTo(x, y);
            strokeStyle = strokeColor;
            lineWidth = LINE_WIDTH;
            stroke();
        }

        lastX = x;
        lastY = y;
        e.preventDefault();
        return false;
    });

    var dict = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
    function encodePoints(points) {
        var x = 0;
        var y = 0;
        var result = [];
        var l;

        for (var i = 0; i < points.length; i += 2) {
            var newX = points[i];
            if (newX == -1) {
                result.push(" ");
                x = 0;
                y = 0;
                i--;
                continue;
            }

            var newY = points[i + 1];

            // step 3: calculate the delta.
            var dx = newX - x;
            var dy = newY - y;
            x = newX;
            y = newY;

            //output("dx = " + dx);
            //output("dy = " + dy);

            // step 4 and 5: turn all numbers to positive.
            dx = (dx << 1) ^ (dx >> 31);
            dy = (dy << 1) ^ (dy >> 31);

            //output("dx' = " + dx);
            //output("dy' = " + dy);

            // step 6: use Cantor pairing function to combine x & y.
            var index = ((dy + dx) * (dy + dx + 1) / 2) + dy;

            //output("index = " + index)

            while (index > 0) {

                // step 7
                var rem = index & 31;
                index = (index - rem) / 32;

                // step 8
                if (index > 0) rem += 32;

                // step 9
                result.push(dict[rem]);
            }
        }

        // step 10
        return result.join("");
    }

    var inversedDict = {}
    {
        var arr = dict.split("")
        for (var i = 0; i < arr.length; i++) {
            inversedDict[arr[i]] = i
        }
    }

    function decodePoints(s) {
        //output("s: " + s);
        var segs = s.split(/ +/);
        //output("Found " + segs.length + " segments.");
        var result = [];
        for (var i = segs.length - 1; i >= 0; i--) {
            var seg = segs[i];
            var len = seg.length;
            //output("segment: " + seg);
            //output("segment length: " + len);
            var num = null;
            for (var j = len - 1; j >= 0; j--) {
                var c = seg.charAt(j)
                n = inversedDict[c]
                if (n == null) {
                    throw "bad char: " + c;
                }
                if (n < 32) {  // last
                    if (num != null) {
                        //output("index == " + num);
                        // inverting the Cantor pairing function
                        var w = Math.floor((Math.sqrt(8 * num + 1) - 1) / 2)
                        var t = (w * w  + w) / 2
                        var dy = num - t
                        var dx = w - dy
                        result.unshift(dy)
                        result.unshift(dx)
                    }

                    num = n;

                } else {
                    n -= 32;
                    num = num * 32 + n;
                }
            }

            if (num != null) {
                //output("index == " + num);
                // inverting the Cantor pairing function
                var w = Math.floor((Math.sqrt(8 * num + 1) - 1) / 2)
                var t = (w * w  + w) / 2
                var dy = num - t
                var dx = w - dy
                result.unshift(dy)
                result.unshift(dx)
            }

            if (i > 0) {
                result.unshift(-1);
            }
        }

        var x = 0
        var y = 0
        for (var i = 0; i < result.length; i += 2) {
            var dx = result[i];
            if (dx == -1) {
                x = 0;
                y = 0;
                i--;
                continue;
            }
            var dy = result[i + 1]

            if (dx % 2 == 0) {  // posive number
                dx = dx / 2;

            } else {  // negative number
                dx = -(dx + 1) / 2
            }

            if (dy % 2 == 0) {  // posive number
                dy = dy / 2;

            } else {  // negative number
                dy = -(dy + 1) / 2
            }

            x += dx;
            y += dy;

            //output("dx = " + dx)
            //output("dy = " + dy)
            result[i] = x
            result[i + 1] = y
        }

        return result;
    }

    loadHistory();
})();
