const svg = document.getElementById('drawing-area');
const undoStack = []; 
let resizeHandles = []; 
let selectedElement = null; 
let isMoving = false; 
let startX = 0, startY = 0; 
let rotationHandle = null; 
let initialAngle = 0; 

const highlightElement = (element) => {
    element.setAttribute('stroke-dasharray', '4');
    element.setAttribute('stroke-opacity', '0.7');
};

const unhighlightElement = (element) => {
    element.removeAttribute('stroke-dasharray');
    element.removeAttribute('stroke-opacity');
};

function selectElement(event) {
    if (selectedElement) {
        unhighlightElement(selectedElement);
        clearResizeHandles();
        clearRotationHandle();
    }

    selectedElement = event.target;
    highlightElement(selectedElement);

    document.getElementById('line-color').value = selectedElement.getAttribute('stroke') || '#000000';
    document.getElementById('line-width').value = selectedElement.getAttribute('stroke-width') || 1;

    if (selectedElement.tagName !== 'line') {
        document.getElementById('fill-color').value = selectedElement.getAttribute('fill') || '#ffffff';
    }
    showResizeHandles(selectedElement);
    showRotationHandle(selectedElement);
}

function deselectElement(){
    if(selectedElement){
        unhighlightElement(selectedElement);
        clearResizeHandles();
        clearRotationHandle();
        selectedElement=null;
    }
}

function showResizeHandles(element) {
    clearResizeHandles();

    const bbox = element.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    createResizeHandle(bbox.x, bbox.y, element, 'top-left');
    createResizeHandle(bbox.x + bbox.width, bbox.y, element, 'top-right');
    createResizeHandle(bbox.x, bbox.y + bbox.height, element, 'bottom-left');
    createResizeHandle(bbox.x + bbox.width, bbox.y + bbox.height, element, 'bottom-right');
}

function createResizeHandle(x, y, targetElement, position) {
    const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handle.setAttribute('cx', x);
    handle.setAttribute('cy', y);
    handle.setAttribute('r', 5);
    handle.setAttribute('fill', 'blue');
    handle.setAttribute('cursor', 'pointer');
    handle.dataset.position = position;

    svg.appendChild(handle);
    resizeHandles.push(handle);

    handle.addEventListener('mousedown', (event) => startResizing(event, targetElement));
}

function clearResizeHandles() {
    resizeHandles.forEach(handle => handle.remove());
    resizeHandles = [];
    resizeHandles = [];
}

function showRotationHandle(element) {
    if (rotationHandle) {
        rotationHandle.remove();
    }

    const bbox = element.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    const transform = element.getAttribute('transform');
    let angle = 0;
    if (transform && transform.includes('rotate')) {
        const match = transform.match(/rotate\(([-\d.]+)/);
        if (match) {
            angle = parseFloat(match[1]);
        }
    }

    const handlePoint = getTransformedPoint(centerX, bbox.y - 20, centerX, centerY, angle);

    rotationHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    rotationHandle.setAttribute('cx', handlePoint.x);
    rotationHandle.setAttribute('cy', handlePoint.y);
    rotationHandle.setAttribute('r', 5);
    rotationHandle.setAttribute('fill', 'green');
    rotationHandle.setAttribute('stroke', 'black');
    rotationHandle.setAttribute('stroke-width', 1);
    rotationHandle.setAttribute('cursor', 'crosshair');
    rotationHandle.dataset.type = 'rotation-handle';

    svg.appendChild(rotationHandle);

    rotationHandle.addEventListener('mousedown', (event) => {
        event.stopPropagation();
        startRotating(event, element);
    });

    rotationHandle.addEventListener('click', (event) => {
        event.stopPropagation();
    });
}

function clearRotationHandle() {
    if (rotationHandle) {
        rotationHandle.remove();
        rotationHandle = null;
    }
}

function startMove(event) {
    if (!selectedElement) return;

    isMoving = true;
    const svgPoint = getSVGPoint(event);
    startX = svgPoint.x;
    startY = svgPoint.y;

    svg.addEventListener('mousemove', moveElemnt);
    svg.addEventListener('mouseup', stopMove);
}

function moveElemnt(event) {
    if (!isMoving || !selectedElement) return;

    const svgPoint = getSVGPoint(event);
    const dx = svgPoint.x - startX;
    const dy = svgPoint.y - startY;
    const { centerX, centerY, angle } = getElementRotationAndCenter(selectedElement);

    const transformedDx = dx * Math.cos(-angle * Math.PI / 180) - dy * Math.sin(-angle * Math.PI / 180);
    const transformedDy = dx * Math.sin(-angle * Math.PI / 180) + dy * Math.cos(-angle * Math.PI / 180);

    if (selectedElement.tagName === 'rect') {
        const x = parseFloat(selectedElement.getAttribute('x')) + transformedDx;
        const y = parseFloat(selectedElement.getAttribute('y')) + transformedDy;
        selectedElement.setAttribute('x', x);
        selectedElement.setAttribute('y', y);
    } else if (selectedElement.tagName === 'ellipse') {
        const cx = parseFloat(selectedElement.getAttribute('cx')) + transformedDx;
        const cy = parseFloat(selectedElement.getAttribute('cy')) + transformedDy;
        selectedElement.setAttribute('cx', cx);
        selectedElement.setAttribute('cy', cy);
    } else if (selectedElement.tagName === 'line') {
        const x1 = parseFloat(selectedElement.getAttribute('x1')) + transformedDx;
        const y1 = parseFloat(selectedElement.getAttribute('y1')) + transformedDy;
        const x2 = parseFloat(selectedElement.getAttribute('x2')) + transformedDx;
        const y2 = parseFloat(selectedElement.getAttribute('y2')) + transformedDy;

        selectedElement.setAttribute('x1', x1);
        selectedElement.setAttribute('y1', y1);
        selectedElement.setAttribute('x2', x2);
        selectedElement.setAttribute('y2', y2);
    }

    startX = svgPoint.x;
    startY = svgPoint.y;

    showResizeHandles(selectedElement);
    showRotationHandle(selectedElement);
}


function startResizing(event, targetElement) {
    event.preventDefault();
    const handle = event.target;

    let initialX, initialY, initialWidth, initialHeight, initialCX, initialCY, initialRX, initialRY, initialX1, initialY1, initialX2, initialY2;

    const position = handle.dataset.position;

    if (targetElement.tagName === 'rect') {
        initialX = parseFloat(targetElement.getAttribute('x'));
        initialY = parseFloat(targetElement.getAttribute('y'));
        initialWidth = parseFloat(targetElement.getAttribute('width'));
        initialHeight = parseFloat(targetElement.getAttribute('height'));
    } else if (targetElement.tagName === 'ellipse') {
        initialCX = parseFloat(targetElement.getAttribute('cx'));
        initialCY = parseFloat(targetElement.getAttribute('cy'));
        initialRX = parseFloat(targetElement.getAttribute('rx'));
        initialRY = parseFloat(targetElement.getAttribute('ry'));
    } else if (targetElement.tagName === 'line') {
        initialX1 = parseFloat(targetElement.getAttribute('x1'));
        initialY1 = parseFloat(targetElement.getAttribute('y1'));
        initialX2 = parseFloat(targetElement.getAttribute('x2'));
        initialY2 = parseFloat(targetElement.getAttribute('y2'));
    }

    const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - event.clientX;
        const dy = moveEvent.clientY - event.clientY;

        if (targetElement.tagName === 'rect') {
            if (position === 'top-left') {
                targetElement.setAttribute('x', initialX + dx);
                targetElement.setAttribute('y', initialY + dy);
                targetElement.setAttribute('width', initialWidth - dx);
                targetElement.setAttribute('height', initialHeight - dy);
            } else if (position === 'top-right') {
                targetElement.setAttribute('y', initialY + dy);
                targetElement.setAttribute('width', initialWidth + dx);
                targetElement.setAttribute('height', initialHeight - dy);
            } else if (position === 'bottom-left') {
                targetElement.setAttribute('x', initialX + dx);
                targetElement.setAttribute('width', initialWidth - dx);
                targetElement.setAttribute('height', initialHeight + dy);
            } else if (position === 'bottom-right') {
                targetElement.setAttribute('width', initialWidth + dx);
                targetElement.setAttribute('height', initialHeight + dy);
            }
        } else if (targetElement.tagName === 'ellipse') {
            if (position === 'top-left') {
                targetElement.setAttribute('rx', Math.max(initialRX - dx, 5));
                targetElement.setAttribute('ry', Math.max(initialRY - dy, 5));
                targetElement.setAttribute('cx', initialCX + dx / 2);
                targetElement.setAttribute('cy', initialCY + dy / 2);
            } else if (position === 'top-right') {
                targetElement.setAttribute('rx', Math.max(initialRX + dx, 5));
                targetElement.setAttribute('ry', Math.max(initialRY - dy, 5));
                targetElement.setAttribute('cx', initialCX + dx / 2);
                targetElement.setAttribute('cy', initialCY + dy / 2);
            } else if (position === 'bottom-left') {
                targetElement.setAttribute('rx', Math.max(initialRX - dx, 5));
                targetElement.setAttribute('ry', Math.max(initialRY + dy, 5));
                targetElement.setAttribute('cx', initialCX + dx / 2);
                targetElement.setAttribute('cy', initialCY + dy / 2);
            } else if (position === 'bottom-right') {
                targetElement.setAttribute('rx', Math.max(initialRX + dx, 5));
                targetElement.setAttribute('ry', Math.max(initialRY + dy, 5));
                targetElement.setAttribute('cx', initialCX + dx / 2);
                targetElement.setAttribute('cy', initialCY + dy / 2);
            }
        } else if (targetElement.tagName === 'line') {
            if (position === 'top-left') {
                targetElement.setAttribute('x1', initialX1 + dx);
                targetElement.setAttribute('y1', initialY1 + dy);
            } else if (position === 'bottom-right') {
                targetElement.setAttribute('x2', initialX2 + dx);
                targetElement.setAttribute('y2', initialY2 + dy);
            }
        }
        showResizeHandles(targetElement);
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function startRotating(event, element) {
    event.preventDefault();

    const bbox = element.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    const initialMouseAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);

    const initialTransform = element.getAttribute('transform') || '';
    let currentAngle = 0;

    const onMouseMove = (moveEvent) => {
        const currentMouseAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
        const angleDelta = ((currentMouseAngle - initialMouseAngle) * 180) / Math.PI;

        currentAngle = angleDelta;
        element.setAttribute('transform', `${initialTransform} rotate(${currentAngle} ${centerX} ${centerY})`);

        showResizeHandles(element);
        showRotationHandle(element);
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function stopMove() {
    isMoving = false;
    svg.removeEventListener('mousemove', moveElemnt);
    svg.removeEventListener('mouseup', stopMove);
}

function addElement(type) {
    const color = document.getElementById('line-color').value;
    const width = document.getElementById('line-width').value;

    let element;
    switch (type) {
        case 'line':
            element = document.createElementNS("http://www.w3.org/2000/svg", "line");
            element.setAttribute('x1', 50);
            element.setAttribute('y1', 50);
            element.setAttribute('x2', 200);
            element.setAttribute('y2', 200);
            break;
        case 'ellipse':
            element = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
            element.setAttribute('cx', 150);
            element.setAttribute('cy', 150);
            element.setAttribute('rx', 50);
            element.setAttribute('ry', 30);
            break;
        case 'rect':
            element = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            element.setAttribute('x', 100);
            element.setAttribute('y', 100);
            element.setAttribute('width', 100);
            element.setAttribute('height', 50);
            break;
    }

    element.setAttribute('stroke', color);
    element.setAttribute('stroke-width', width);
    element.setAttribute('fill', 'none');
    element.addEventListener('click', selectElement);
    svg.appendChild(element);

    undoStack.push(() => svg.removeChild(element));
}

function deleteSelectedElement(){
    if(selectedElement){
        svg.removeChild(selectedElement);
        undoStack.push(()=>svg.appendChild(selectedElement));
        deselectElement();
    }
}

function updateSelectedElementProperties() {
    if (selectedElement) {
        const color = document.getElementById('line-color').value;
        const width = document.getElementById('line-width').value;

        selectedElement.setAttribute('stroke', color);
        selectedElement.setAttribute('stroke-width', width);

        if (selectedElement.tagName !== 'line') {
            const fillColor = document.getElementById('fill-color').value || 'none';
            selectedElement.setAttribute('fill', fillColor);
        }
    }
}

function getSVGPoint(event) {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM().inverse();
    return point.matrixTransform(ctm);
}

function saveSVG() {
    const svgData = svg.outerHTML;
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'drawing.svg';
    link.click();
}

function exportPNG() {
    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(svg);

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svg.clientWidth;
        canvas.height = svg.clientHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'drawing.png';
        link.click();
    };
    img.src = url;
}

function undoLastAction() {
    if (undoStack.length > 0) {
        const undoAction = undoStack.pop();
        undoAction();
    }
}

function getElementRotationAndCenter(element) {
    const bbox = element.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    const transform = element.getAttribute('transform');
    let angle = 0;
    if (transform && transform.includes('rotate')) {
        const match = transform.match(/rotate\(([-\d.]+) (\d+) (\d+)\)/);
        if (match) {
            angle = parseFloat(match[1]);
        }
    }

    return { centerX, centerY, angle };
}

function getTransformedPoint(x, y, centerX, centerY, angle) {
    const radians = (angle * Math.PI) / 180;
    const dx = x - centerX;
    const dy = y - centerY;

    const transformedX = centerX + dx * Math.cos(radians) - dy * Math.sin(radians);
    const transformedY = centerY + dx * Math.sin(radians) + dy * Math.cos(radians);

    return { x: transformedX, y: transformedY };
}

document.getElementById('add-line').addEventListener('click', () => addElement('line'));
document.getElementById('add-ellipse').addEventListener('click', () => addElement('ellipse'));
document.getElementById('add-rect').addEventListener('click', () => addElement('rect'));
document.getElementById('line-color').addEventListener('input', updateSelectedElementProperties);
document.getElementById('line-width').addEventListener('input', updateSelectedElementProperties);
document.getElementById('fill-color').addEventListener('input', updateSelectedElementProperties);
document.getElementById('undo').addEventListener('click', undoLastAction);
document.getElementById('save-svg').addEventListener('click', saveSVG);
document.getElementById('export-png').addEventListener('click', exportPNG);
document.getElementById('delete-element').addEventListener('click',deleteSelectedElement);

svg.addEventListener('mousedown', (event) => {
    if (event.target !== svg) {
        selectElement(event);
        startMove(event);
    }
});

svg.addEventListener('click', (event)=>{
    if(event.target===svg){
        deselectElement();
    }
});