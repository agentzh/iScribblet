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
    style.zIndex = '199';
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
    style.zIndex = '200';
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
            hideTimer = setTimeout(doHideMsg, 3000);
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
                    var json = ajax.responseText;
                    if (json == "") {
                        msg("Fetched JSON data is empty");
                        return
                    }

                    var hist;
                    try {
                        hist = JSON.parse(json);

                    } catch (e) {
                        msg("Faile to parse JSON: " + e);
                        return;
                    }

                    msg("History data loaded.");
                    hideMsg();
                    historyLoaded = true;

                    var i
                    for (i = 0; i < scribble.length; i++) {
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

    function saveData() {
        if (!historyLoaded) {
            // TODO: append new data
            //msg("history not yet loaded");
            return;
        }

        if (saved) {
            //msg("already saved");
            return;
        }

        var jsonData = JSON.stringify({"url": url, "points": JSON.stringify(scribble)})
        saved = true;

        var ajax = new XMLHttpRequest();
        ajax.onreadystatechange = function() {
            if (ajax.readyState == 4) {
                var status = ajax.status
                if (status == 200) {
                    //alert(ajax.responseText);
                    var ans = ajax.responseText;
                    if (ans == "") {
                        msg("Empty response for saving");
                        saved = false;
                        return
                    }

                    msg(ans);
                    hideMsg();
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
                msg("Failed to store data: status=" + ajax.status + ": " + body);
                return;
            }
        }

        msg("Saving data...");
        ajax.open("POST", "https://api.iscribblet.org/store", true);
        ajax.setRequestHeader("Content-Type", "text/plain");
        ajax.send(jsonData);
    }

    setInterval(saveData, 3000);

    window.onbeforeunload = function () {
        if (scribble.length > 0 && !saved) {
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

    loadHistory();
})();
