let socket = io();

const STATE_IDLE = 'idle';
const STATE_PANNING = 'panning';
fabric.Canvas.prototype.toggleDragMode = function(dragMode) {
    // Remember the previous X and Y coordinates for delta calculations
    let lastClientX;
    let lastClientY;
    // Keep track of the state
    let state = STATE_IDLE;

    // We're entering dragmode
    if (dragMode) {
        // Discard any active object
        this.discardActiveObject();
        // Set the cursor to 'move'
        this.defaultCursor = 'move';
        // Loop over all objects and disable events / selectable. We remember its value in a temp variable stored on each object
        this.forEachObject(function(object) {
            object.prevEvented = object.evented;
            object.prevSelectable = object.selectable;
            object.evented = false;
            object.selectable = false;
        });
        // Remove selection ability on the canvas
        this.selection = false;
        // When MouseUp fires, we set the state to idle
        this.on('mouse:up', function(e) {
            state = STATE_IDLE;
        });
        // When MouseDown fires, we set the state to panning
        this.on('mouse:down', (e) => {
            state = STATE_PANNING;
            lastClientX = e.e.clientX;
            lastClientY = e.e.clientY;
        });
        // When the mouse moves, and we're panning (mouse down), we continue
        this.on('mouse:move', (e) => {
            if (state === STATE_PANNING && e && e.e) {
                // let delta = new fabric.Point(e.e.movementX, e.e.movementY); // No Safari support for movementX and movementY
                // For cross-browser compatibility, I had to manually keep track of the delta
                // Calculate deltas
                let deltaX = 0;
                let deltaY = 0;
                if (lastClientX) {
                    deltaX = e.e.clientX - lastClientX;
                }
                if (lastClientY) {
                    deltaY = e.e.clientY - lastClientY;
                }
                // Update the last X and Y values
                lastClientX = e.e.clientX;
                lastClientY = e.e.clientY;

                let delta = new fabric.Point(deltaX, deltaY);
                this.relativePan(delta);
                this.trigger('moved');
            }
        });
    } else {
        // When we exit dragmode, we restore the previous values on all objects
        this.forEachObject(function(object) {
            object.evented = (object.prevEvented !== undefined) ? object.prevEvented : object.evented;
            object.selectable = (object.prevSelectable !== undefined) ? object.prevSelectable : object.selectable;
        });
        // Reset the cursor
        this.defaultCursor = 'default';
        // Remove the event listeners
        this.off('mouse:up');
        this.off('mouse:down');
        this.off('mouse:move');
        // Restore selection ability on the canvas
        this.selection = true;
    }
};
let dragMode = false;
let canvas = new fabric.Canvas('c', { enablePointerEvents: true });
let line, triangle, origX, origY, isFreeDrawing = false;
let isRectActive = false, isCircleActive = false, isArrowActive = false, activeColor = '#000000';
let isLoadedFromJson = false;

//init variables
let div = $("#canvasWrapper");
let $canvas = $("#c");

//width and height of canvas's wrapper
let w, h;
w = div.width();
h = div.height();
$canvas.width(w).height(h);

//set w & h for canvas
canvas.setHeight(h);
canvas.setWidth(w);

let canvasOriginalWidth = w,
    canvasOriginalHeight = h,
    canvasWidth = w,
    canvasHeight = h,
    imgWidth,
    imgHeight,
    bgImage,
    canvasScale = 1,
    photoUrlLandscape = 'https://images8.alphacoders.com/292/292379.jpg',
    photoUrlPortrait = 'https://presspack.rte.ie/wp-content/blogs.dir/2/files/2015/04/AMC_TWD_Maggie_Portraits_4817_V1.jpg';

function initCanvas(canvas) {
    canvas.clear();
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.shadow = new fabric.Shadow({
        blur: 0,
        offsetX: 0,
        offsetY: 0,
        affectStroke: true,
        color: '#ffffff',
    });
    canvas.freeDrawingBrush.width = 5;

    canvas.freeDrawingBrush.onMouseMove = (function(onMouseMove) {
        return function(pointer, event) {
            if (event.e.pointerType === 'pen') {
                let pressureEl = document.getElementById('pressure');
                pressureEl.innerHTML = event.e.pressure;
                canvas.freeDrawingBrush.width = 5 * event.e.pressure;
            }
            onMouseMove.call(this, pointer, event);
        }
    })(canvas.freeDrawingBrush.onMouseMove);

    setCanvasZoom();

    $('#zoomin').click(function () {
        canvasScale *= 1.25;
        // scaleAndPositionImage();
    });
    $('#zoomout').click(function () {
        canvasScale /= 1.25;
        // scaleAndPositionImage();
    });


    setCanvasSize({ height: canvasHeight, width: canvasWidth });
    let src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAUCAYAAABvVQZ0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAaGVYSWZNTQAqAAAACAAEAQYAAwAAAAEAAgAAARIAAwAAAAEAAQAAASgAAwAAAAEAAgAAh2kABAAAAAEAAAA+AAAAAAADoAEAAwAAAAEAAQAAoAIABAAAAAEAAAAToAMABAAAAAEAAAAUAAAAABCwCY0AAALiaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA1LjQuMCI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgICAgICAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyI+CiAgICAgICAgIDx0aWZmOlBob3RvbWV0cmljSW50ZXJwcmV0YXRpb24+MjwvdGlmZjpQaG90b21ldHJpY0ludGVycHJldGF0aW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpDb21wcmVzc2lvbj4xPC90aWZmOkNvbXByZXNzaW9uPgogICAgICAgICA8dGlmZjpSZXNvbHV0aW9uVW5pdD4yPC90aWZmOlJlc29sdXRpb25Vbml0PgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+MjA8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICAgICA8ZXhpZjpDb2xvclNwYWNlPjE8L2V4aWY6Q29sb3JTcGFjZT4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjE5PC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CsNpvz0AAAA+SURBVDgRY2RgYPgPxKSC30ANrOiaGNEFoIr+Aem/QIwuD7MYJA5ig2gYZgKyR8FoCIyGwGgIjIYALUOABQAxEAYLzBmxWAAAAABJRU5ErkJggg==';
    canvas.setBackgroundColor({source: src, repeat: 'repeat'}, function () {
        canvas.renderAll();
    });

    // setTimeout(function () {
    //     setCanvasBackgroundImageUrl(photoUrlLandscape, 0, 0, 1)
    // }, 50)
    // setTimeout(function () {
    //     setCanvasBackgroundImageUrl(photoUrlPortrait, 0, 0, 1)
    // }, 6000)


    // canvas.on({
    //     'touch:gesture': function(e) {
    //         if (e.e.touches && e.e.touches.length == 2) {
    //             pausePanning = true;
    //             var point = new fabric.Point(e.self.x, e.self.y);
    //             if (e.self.state == "start") {
    //                 zoomStartScale = self.canvas.getZoom();
    //             }
    //             var delta = zoomStartScale * e.self.scale;
    //             self.canvas.zoomToPoint(point, delta);
    //             pausePanning = false;
    //         }
    //     },
    //     'object:selected': function() {
    //         pausePanning = true;
    //     },
    //     'selection:cleared': function() {
    //         pausePanning = false;
    //     },
    //     'touch:drag': function(e) {
    //         if (pausePanning == false && undefined != e.e.layerX && undefined != e.e.layerY) {
    //             currentX = e.e.layerX;
    //             currentY = e.e.layerY;
    //             xChange = currentX - lastX;
    //             yChange = currentY - lastY;
    //
    //             if( (Math.abs(currentX - lastX) <= 50) && (Math.abs(currentY - lastY) <= 50)) {
    //                 var delta = new fabric.Point(xChange, yChange);
    //                 canvas.relativePan(delta);
    //             }
    //
    //             lastX = e.e.layerX;
    //             lastY = e.e.layerY;
    //         }
    //     }
    // });

    canvas.on('mouse:wheel', function(opt) {
        let delta = opt.e.deltaY;
        let pointer = canvas.getPointer(opt.e);
        let zoom = canvas.getZoom();
        zoom = zoom + delta/200;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;

        if (zoom > 4) zoom = 4;
        // limit zoom to 1x out
        if (zoom < 1) {
            zoom = 1;
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        }


        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        // scaleAndPositionImage();
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });

    canvas.isDrawingMode = false;

    return canvas;
}

function setCanvasSize(canvasSizeObject) {
    canvas.setWidth(canvasSizeObject.width);
    canvas.setHeight(canvasSizeObject.height);
}

function setCanvasZoom() {
    canvasWidth = canvasOriginalWidth * canvasScale;
    canvasHeight = canvasOriginalHeight * canvasScale;

    canvas.setWidth(canvasWidth);
    canvas.setHeight(canvasHeight);
}

function setCanvasBackgroundImageUrl(url) {
    if (url && url.length > 0) {
        fabric.Image.fromURL(url, function (img) {
            bgImage = img;
            scaleAndPositionImage();
        });
    } else {
        canvas.backgroundImage = 0;
        canvas.setBackgroundImage('', canvas.renderAll.bind(canvas));

        canvas.renderAll();
    }
}

function scaleAndPositionImage() {
    setCanvasZoom();

    let canvasAspect = canvasWidth / canvasHeight;
    let imgAspect = bgImage.width / bgImage.height;
    let left, top, scaleFactor;

    if (canvasAspect >= imgAspect) {
         scaleFactor = canvasWidth / bgImage.width;
        left = 0;
        top = -((bgImage.height * scaleFactor) - canvasHeight) / 2;
    } else {
         scaleFactor = canvasHeight / bgImage.height;
        top = 0;
        left = -((bgImage.width * scaleFactor) - canvasWidth) / 2;

    }

    canvas.setBackgroundImage(bgImage, canvas.renderAll.bind(canvas), {
        top: top,
        left: left,
        originX: 'left',
        originY: 'top',
        scaleX: scaleFactor,
        scaleY: scaleFactor
    });
    canvas.renderAll();

}

function setBrush(options) {
    if (options.width !== undefined) {
        canvas.freeDrawingBrush.width = parseInt(options.width, 10);
    }

    if (options.color !== undefined) {
        canvas.freeDrawingBrush.color = options.color;
    }
}

function setCanvasSelectableStatus(val) {
    canvas.forEachObject(function(obj) {
        obj.lockMovementX = ! val;
        obj.lockMovementY = ! val;
        obj.hasControls = val;
        obj.hasBorders = val;
        obj.selectable = val;
    });
    canvas.renderAll();
}

function setFreeDrawingMode(val) {
    isFreeDrawing = val;
    disableShapeMode();
}

function removeCanvasEvents() {
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    canvas.off('object:moving');
}

function enableShapeMode() {
    removeCanvasEvents();
    isFreeDrawing = canvas.isDrawingMode;
    canvas.isDrawingMode = false;
    canvas.selection = false;
    setCanvasSelectableStatus(false);
}

function disableShapeMode() {
    removeCanvasEvents();
    canvas.isDrawingMode = isFreeDrawing;
    if (isFreeDrawing) {
        $("#drwToggleDrawMode").addClass('active');
    }
    canvas.selection = true;
    isArrowActive = isRectActive = isCircleActive = false;
    setCanvasSelectableStatus(true);
}

function deleteObjects() {
    let activeGroup = canvas.getActiveObjects();

    if (activeGroup) {
        canvas.discardActiveObject();
        activeGroup.forEach(function (object) {
            canvas.remove(object);
        });
    }
}

function emitEvent() {
    let aux = canvas;
    let json = aux.toJSON();
    let data = {
        w: w,
        h: h,
        data: json
    };
    socket.emit('drawing', data);
}


$(function () {


    //Canvas init
    initCanvas(canvas).renderAll();

    //canvas events

    canvas.on('after:render', function() {
        if (! isLoadedFromJson) {
            emitEvent();
        }
        isLoadedFromJson = false;
        console.log(canvas.toJSON());
    });

    //dynamically resize the canvas on window resize
    $(window)
        .on('resize', function () {
            w = div.width();
            h = div.height();
            canvas.setHeight(h);
            canvas.setWidth(w);
            $canvas.width(w).height(h);
        })
        .on('keydown', function (e) {
            if (e.keyCode === 46) { //delete key
                deleteObjects();
            }
        });

    //Set Brush Size
    $(".size-btns button").on('click', function () {
        $(".size-btns button").removeClass('active');
        $(this).addClass('active');
    });

    //Set brush color
    $(".color-btns button").on('click', function () {
        let val = $(this).data('value');
        activeColor = val;
        $("#brushColor").val(val);
        setBrush({color: val});
    });

    $("#brushColor").on('change', function () {
        let val = $(this).val();
        activeColor = val;
        setBrush({color: val});
    });

    //Toggle between drawing tools
    $("#drwToggleDrawMode").on('click', function () {
        $("#toolbox button").removeClass('active');
        if (canvas.isDrawingMode) {
            setFreeDrawingMode(false);
            $(this).removeClass('active');
        } else {
            setFreeDrawingMode(true);
            $(this).addClass('active');
        }
    });

    $("#drwEraser").on('click', function() { deleteObjects(); });

    $("#pan").on('click', function () {
        dragMode = !dragMode;
        canvas.toggleDragMode(dragMode);
    });

    $("#drwClearCanvas").on('click', function () {
        canvas.clear();
        let src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAUCAYAAABvVQZ0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAaGVYSWZNTQAqAAAACAAEAQYAAwAAAAEAAgAAARIAAwAAAAEAAQAAASgAAwAAAAEAAgAAh2kABAAAAAEAAAA+AAAAAAADoAEAAwAAAAEAAQAAoAIABAAAAAEAAAAToAMABAAAAAEAAAAUAAAAABCwCY0AAALiaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA1LjQuMCI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgICAgICAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyI+CiAgICAgICAgIDx0aWZmOlBob3RvbWV0cmljSW50ZXJwcmV0YXRpb24+MjwvdGlmZjpQaG90b21ldHJpY0ludGVycHJldGF0aW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpDb21wcmVzc2lvbj4xPC90aWZmOkNvbXByZXNzaW9uPgogICAgICAgICA8dGlmZjpSZXNvbHV0aW9uVW5pdD4yPC90aWZmOlJlc29sdXRpb25Vbml0PgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+MjA8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICAgICA8ZXhpZjpDb2xvclNwYWNlPjE8L2V4aWY6Q29sb3JTcGFjZT4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjE5PC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CsNpvz0AAAA+SURBVDgRY2RgYPgPxKSC30ANrOiaGNEFoIr+Aem/QIwuD7MYJA5ig2gYZgKyR8FoCIyGwGgIjIYALUOABQAxEAYLzBmxWAAAAABJRU5ErkJggg==';
        canvas.setBackgroundColor({source: src, repeat: 'repeat'}, function () {
            canvas.renderAll();
        });
    });

    $("#shapeArrow").on('click', function () {
        if (! isArrowActive || (isRectActive || isCircleActive)) {
            disableShapeMode();
            $("#toolbox button").removeClass('active');
            $(this).addClass('active');
            isArrowActive = true;
            enableShapeMode();
            let arrow = new Arrow(canvas);
        } else {
            disableShapeMode();
            isArrowActive = false;
            $(this).removeClass('active');
        }
    });

    $("#shapeCircle").on('click', function () {
        if (! isCircleActive || (isRectActive || isArrowActive)) {
            disableShapeMode();
            $("#toolbox button").removeClass('active');
            $(this).addClass('active');
            isCircleActive = true;
            enableShapeMode();
            let circle = new Circle(canvas);
        } else {
            disableShapeMode();
            isCircleActive = false;
            $(this).removeClass('active');
        }
    });

    $("#shapeRect").on('click', function () {
        if (! isRectActive || (isArrowActive || isCircleActive)) {
            disableShapeMode();
            isRectActive = true;
            $("#toolbox button").removeClass('active');
            $(this).addClass('active');
            enableShapeMode();
            let squrect = new Rectangle(canvas);
        } else {
            isRectActive = false;
            disableShapeMode();
            $(this).removeClass('active');
        }
    });

    $("#debugButton").on('click', function () {
        deleteObjects();
    });

    canvas.renderAll();

    //Sockets
    socket.emit('ready', "Page loaded");

    socket.on('drawing', function (obj) {
        //set this flag, to disable infinite rendering loop
        isLoadedFromJson = true;

        //calculate ratio by dividing this canvas width to sender canvas width
        let ratio = w / obj.w;

        //reposition and rescale each sent canvas object
        obj.data.objects.forEach(function(object) {
            object.left *= ratio;
            object.scaleX *= ratio;
            object.top *= ratio;
            object.scaleY *= ratio;
        });

        canvas.loadFromJSON(obj.data);
    });

});
