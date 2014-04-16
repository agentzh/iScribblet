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
        copyPasteBin,
        textDisplay,
        textDisplayStyle,
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
        zIndex = '200';
        cursor = 'crosshair';
    }
    _appendChild(_documentBody, canvas);
    canvasContext = canvas.getContext('2d');

    textDisplay = _createElement('div');
    _appendChild(textDisplay,
        _document.createTextNode('Press \'E\' to email scribble, CTRL + C to copy scribble to clipboard, CTRL + V to paste scribble from clipboard, UP/DOWN to change color, DEL to clear, ESC or \'X\' to close.'));
    with (textDisplay.style) {
        background = '#FFF';
        border = '1px solid #000';
        padding = '5px';
        font = 'bold 11px sans-serif';
        position = _absolute;
        zIndex = '199';
        background = '#F2F2F2';
        opacity = MozOpacity = '0.9';
        top = _zeroPixels;
    }
    _appendChild(_documentBody, textDisplay);

    copyPasteBin = _createElement('input');
    with (copyPasteBin.style) {
        position = _absolute;
        left = '-1000' + _pixels;
        top = scrollTop + _pixels
    }
    _document.onfocus = function() {
        with (copyPasteBin) {
            value = exportData;
            focus();
            select();
        }
    };
    _appendChild(_documentBody, copyPasteBin);
    _document.onfocus();

    function handlePaste() {
        if (copyPasteBin.value.length < 3) {
            copyPasteBin.value = '';
            return;
        }
        scribble = copyPasteBin.value.split(/,/g);
        _window.resizeBy(scribble.shift() - _documentBody.clientWidth, 0);
        colorIndex = parseInt(scribble.shift());
        strokeColor = LINE_COLORS[colorIndex];
        repaint();
        exportScribble();
        _document.onfocus();
    }

    copyPasteBin.addEventListener('input', handlePaste, false);

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
                    lastX = scribble[temp++];
                    lastY = scribble[temp++] - scrollTop;
                    moveTo(lastX, lastY);
                } else {
                    lineTo(scribble[temp++], scribble[temp++] -
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
        copyPasteBin.value = exportData;
        copyPasteBin.focus();
        copyPasteBin.select();
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

        textDisplay.style.top = scrollTop + _pixels;
        canvas.style.top = scrollTop + _pixels;
        copyPasteBin.style.top = scrollTop + _pixels;

        textDisplay.style.left = scrollLeft + _pixels;
        canvas.style.left = scrollLeft + _pixels;
        copyPasteBin.style.left = scrollLeft + _pixels;

        repaint();
    };
    temp();

    /*
    canvas.onmousedown = function(e) {
        isMouseDown = true;
        lastX = e.clientX;
        lastY = e.clientY;
        scribble.push(lastX);
        scribble.push(lastY + scrollTop);
    };

    canvas.onmouseup = function(e) {
        isMouseDown = false;
        scribble.push(e.clientX);
        scribble.push(e.clientY + scrollTop);
        scribble.push(-1);

        exportScribble();
        repaint();
    };
    */

    timer = null;
    var InScrolling = false;
    clearScrollingState = function () { InScrolling = false; };

    canvas.addEventListener("touchstart", function(e) {
        if (e.touches.length > 1) {
            if (timer) {
                window.clearTimeout(timer);
            }
            InScrolling = true;
            timer = window.setTimeout(clearScrollingState, 500)
            return true;
        }

        if (InScrolling) {
            return true;
        }

        if (e.touches.length == 1) {
            if (isMouseDown) {
                scribble.push(-1);
            }

            //scribble.push(-1);
            var x = e.touches[0].clientX
            var y = e.touches[0].clientY

            lastX = x;
            lastY = y;

            isMouseDown = true;

            //alert("touch start: " + lastX + ", " + lastY);
            scribble.push(lastX);
            scribble.push(lastY + scrollTop);
            e.preventDefault();
            return false;
        }
    });

    /*
    canvas.addEventListener("touchend", function(e) {
        if (e.touches.length == 1) {
            if (!isMouseDown) {
                return;
            }
            isMouseDown = false;
            scribble.push(e.touches[0].clientX);
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
        if (e.touches.length > 1) {
            if (timer) {
                window.clearTimeout(timer);
            }
            InScrolling = true;
            timer = window.setTimeout(clearScrollingState, 500)
            return true;
        }

        if (InScrolling) {
            return true;
        }

        if (e.touches.length == 1) {
            if (!isMouseDown)
                return true;
            temp = e.touches[0].clientX;
            temp2 = e.touches[0].clientY;

            if (lastX >= 0 && lastY >= 0) {
                if (Math.abs(temp - lastX) >= 50 || Math.abs(temp2 - lastY) >= 50) {
                    return;
                }
            }

            //alert("touch move: " + temp + " " + temp2);
            scribble.push(temp);
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
            e.preventDefault();
            return false;
        }
    });

    /*
    canvas.onmousemove = function(e) {
        if (!isMouseDown)
            return;
        temp = e.clientX;
        temp2 = e.clientY;

        scribble.push(temp);
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

    copyPasteBin.onkeyup = function(e) {
        switch (e.keyCode) {
            // Paste
            case 86:
                if (e.ctrlKey)
                    handlePaste();
                break;
            // ESC or X - Close
            case 27:
            case 88:
                _documentBody.removeChild(canvas);
                _documentBody.removeChild(textDisplay);
                _documentBody.removeChild(copyPasteBin);
                _document.onfocus = _window.onresize = _window.onscroll = null;
                copyPasteBin.removeEventListener('input', handlePaste, false);
                break;
            // UP/DOWN - Change color
            case 38:
            case 40:
                colorIndex += 39 - e.keyCode;
                if (colorIndex < 0) colorIndex = LINE_COLORS.length - 1;
                strokeColor = LINE_COLORS[colorIndex % LINE_COLORS.length];
                exportScribble();
                repaint();
                break;
            // E - Email
            case 69:
                temp4 = _createElement('form');
                with (temp4) {
                    action = 'mailto:';
                    method = 'post';
                    enctype = 'text/plain';
                    style.visibility = 'hidden';
                }
                temp5 = _createElement('textarea');
                temp5.name = 'Message';
                temp5.value = '\n1. Go to: ' + _window.location.href +
                    '\n\n2. Press \'Scribble here!\' (or go to http://scribblet.org)\n\n3. Paste this into the document:\n' +
                    exportData;
                _appendChild(temp4, temp5);
                _appendChild(_documentBody, temp4);
                try {
                    // This fixes a problem with Safari
                    if (escape(temp5.value).length >= 1980)
                        throw 0;
                    temp4.submit();
                } catch (e) {
                    _window.prompt('Could not create email. Copy & paste this instead:',
                        temp5.value);
                    _window.location.href = 'mailto:';
                }
                _documentBody.removeChild(temp4);
                break;
            // DEL - Clear
            case 46:
                scribble.length = 0;
                exportScribble();
                repaint();
        }
    };
})();
