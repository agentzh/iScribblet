/*
 * Scribblet (http://scribblet.org)
 * Copyright (c) 2009 Kai Jäger. Some rights reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the license.txt file.
 */

(function() {
    // All symbols used inside the code are declared here. This reduces the
    // number of "var" keywords in the code and helps the minifier do its job.
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
        exportData,
        scrollTop,
        scrollLeft;

    // "Constant" definitions
    LINE_COLORS = ['red', 'lime', 'blue', 'black'];
    LINE_WIDTH = 2;

    exportData = '';

    // Assign DOM objects and functions to variables. This results in smaller
    // code after minification.
    _window = window;
    _document = document;
    _documentBody = _document.body;

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

    /*
    var meta = _createElement("meta")
    with (meta) {
        name = "viewport";
        content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    }
    document.getElementsByTagName('head')[0].appendChild(meta);
    */

    // Current stroke color
    colorIndex = 0;
    strokeColor = LINE_COLORS[0];

    // Holds the internal representation of the current scribbble
    scribble = [];

    // Create canvas, info display, copy & paste bin
    canvas = _createElement('canvas');
    with (canvas.style) {
        position = _absolute;
        left = top = _zeroPixels;
        zIndex = '199';
        cursor = 'crosshair';
    }
    _appendChild(_documentBody, canvas);
    canvasContext = canvas.getContext('2d');

    textDisplay = _createElement('div');
    with (textDisplay.style) {
        background = '#FFF';
        border = '1px solid #000';
        margin = '15px';
        position = 'fixed';
        zIndex = '200';
        background = '#F2F2F2';
        opacity = MozOpacity = '0.9';
        top = 50 + _pixels;
        left = 50 + _pixels;
    }

    var aTag = _createElement('a');
    with (aTag) {
        innerHTML = '<span style="padding: 2em">Scroll</span>';
        border = 'none';
        padding = '20px';
        margin = '10px';
        font = 'bold 14px sans-serif';
        position = 'static';
    }
    _appendChild(textDisplay, aTag);

    var scrollMode = false;

    function toggleScroll() {
        scrollMode = !scrollMode;
        textDisplay.style.background = (scrollMode ? '#929292' : '#F2F2F2');
        return false;
    }

    aTag.addEventListener("click", toggleScroll, false);

    _appendChild(_documentBody, textDisplay);

    // Repaints the scribble
    function repaint() {
        with (canvasContext) {
            clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
            temp2 = scribble.length;
            temp = 0;
            lastX = -1;
            lastY = -1;
            beginPath();
            while (temp < temp2) {
                if (scribble[temp] == -1) {
                    strokeStyle = strokeColor;
                    lineWidth = LINE_WIDTH;
                    stroke();
                    beginPath();
                    lastX = -1;
                    ++temp;
                } else if (lastX == -1) {
                    lastX = scribble[temp++] - scrollLeft;
                    lastY = scribble[temp++] - scrollTop;
                    moveTo(lastX, lastY);
                } else {
                    lineTo(scribble[temp++] - scrollLeft, scribble[temp++] -
                        scrollTop);
                }
            }
            stroke();
        }
    };

    // Load and save routines
    function exportScribble() {
        scribble.unshift(colorIndex);
        scribble.unshift(_documentBody.clientWidth);
        exportData = scribble.join(',');
        scribble.shift();
        scribble.shift();
    }

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

    /*
    canvas.onmousedown = function(e) {
        isMouseDown = true;
        lastX = e.clientX;
        lastY = e.clientY;
        scribble.push(lastX + scrollLeft);
        scribble.push(lastY + scrollTop);
    };

    canvas.onmouseup = function(e) {
        isMouseDown = false;
        scribble.push(e.clientX + scrollLeft);
        scribble.push(e.clientY + scrollTop);
        scribble.push(-1);

        exportScribble();
        repaint();
    };
    */

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
            scribble.push(-1);
        }

        lastX = x;
        lastY = y;

        isMouseDown = true;

        //alert("touch start: " + lastX + ", " + lastY);
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

        if (lastX >= 0 && lastY >= 0) {
            if (Math.abs(x - lastX) >= 30 || Math.abs(y - lastY) >= 30) {
                e.preventDefault();
                return false;
            }
        }

        //alert("touch move: " + temp + " " + temp2);
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

    /*
    canvas.onmousemove = function(e) {
        if (!isMouseDown)
            return;
        temp = e.clientX;
        temp2 = e.clientY;

        scribble.push(temp + scrollLeft);
        scribble.push(temp2 + scrollTop);

        with (canvasContext) {
            beginPath();
            moveTo(lastX, lastY);
            lineTo(temp, temp2);
            strokeStyle = strokeColor;
            lineWidth = LINE_WIDTH;
            stroke();
        }

        lastX = temp;
        lastY = temp2;
    };
    */
})();
