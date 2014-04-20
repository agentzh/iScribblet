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
    LINE_WIDTH = 1;

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

    var meta = _createElement("meta")
    with (meta) {
        name = "viewport";
        content = "minimal-ui"
    }
    document.getElementsByTagName('head')[0].appendChild(meta);

    // Current stroke color
    colorIndex = 0;
    strokeColor = 'red';

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
        color = '#000';
        background = '#FFF';
        border = '1px solid #000';
        margin = '15px';
        position = 'fixed';
        zIndex = '200';
        background = '#F2F2F2';
        opacity = MozOpacity = '0.9';
        top = 15 + _pixels;
        left = 15 + _pixels;
    }
    _appendChild(_documentBody, textDisplay);

    var scrollButton = _createElement('a');
    with (scrollButton) {
        innerHTML = '<span style="color: #000; padding: 2em">Scroll</span>';
        border = '5px solid #000';
        padding = '20px';
        margin = '10px';
        font = 'bold 14px sans-serif';
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
        font = 'bold 14px sans-serif';
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
        font = 'bold 14px sans-serif';
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

    // Load and save routines
    /*
    function exportScribble() {
        scribble.unshift(colorIndex);
        scribble.unshift(_documentBody.clientWidth);
        exportData = scribble.join(',');
        scribble.shift();
        scribble.shift();
    }
    */

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
        scribble.push(lastX + scrollLeft);
        scribble.push(lastY + scrollTop);
    };

    canvas.onmouseup = function(e) {
        if (scrollMode) {
            return true;
        }

        isMouseDown = false;
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

        if (lastX >= 0 && lastY >= 0) {
            if (Math.abs(x - lastX) >= 30 || Math.abs(y - lastY) >= 30) {
                return false;
            }
        }

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
})();
