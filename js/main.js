import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let island, countertop, sink, roboticHand, plates = [], conveyorBelt;
let isAnimating = false;
let conveyorBeltTexture;
let sceneContainer; // Declare this at the top of your file with other global variables

function init() {
    console.log("Main.js loaded")
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const container = document.getElementById('scene-container');
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000); // Changed FOV to 60
    camera.position.set(0, 0, 55); // Moved camera back and centered vertically
    camera.lookAt(0, -5, 0); // Looking slightly downward

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); // Set clear color to black, but fully transparent
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -5, 0); // Set control target to match lookAt
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    sceneContainer = new THREE.Group();
    scene.add(sceneContainer);
    sceneContainer.position.y = 2; // Move entire scene up

    createIsland();
    createPlates();
    startAnimationLoop();

    animate();

    // Make sure to call this in your init function
    adjustCameraPosition();
}

function onWindowResize() {
    const container = document.getElementById('scene-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    renderer.setSize(container.clientWidth, container.clientHeight);
    
    adjustCameraPosition();
}

function adjustCameraPosition() {
    const container = document.getElementById('scene-container');
    const aspect = container.clientWidth / container.clientHeight;
    
    // Define the desired width and height of the scene in 3D units
    const desiredWidth = 60;
    const desiredHeight = 30;
    
    // Calculate the field of view needed to fit the scene
    const fov = 2 * Math.atan((desiredHeight / 2) / 50) * (180 / Math.PI);
    camera.fov = fov;
    
    // Calculate the distance needed to fit the scene width
    const distance = (desiredWidth / 2) / Math.tan((fov / 2) * (Math.PI / 180)) / aspect;
    
    // Adjust these values to tilt the camera view
    const cameraHeight = 10; // Raise the camera
    const lookAtY = -5; // Look at a point below the center

    camera.position.set(0, cameraHeight, distance);
    camera.lookAt(0, lookAtY, 0);
    
    camera.updateProjectionMatrix();
    
    controls.target.set(0, lookAtY, 0);
    controls.update();
    
    // Reset scene container scale
    sceneContainer.scale.set(1, 1, 1);
    
    // Move the entire scene down
    sceneContainer.position.set(0, -5, 0); // Adjust this value to move the island down
}

window.addEventListener('resize', onWindowResize);

function createIsland() {
    // Island base
    const islandGeometry = new THREE.BoxGeometry(30, 14, 16); // Increased from 24, 12, 12
    const islandMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.5
    });
    island = new THREE.Mesh(islandGeometry, islandMaterial);
    sceneContainer.add(island);

    // Countertop
    const countertopGeometry = new THREE.BoxGeometry(30.8, 0.4, 16.8); // Increased from 24.8, 0.4, 12.8
    const countertopMaterial = new THREE.MeshPhongMaterial({ color: 0x999999 });
    countertop = new THREE.Mesh(countertopGeometry, countertopMaterial);
    countertop.position.y = 7.2; // Increased from 6.2
    sceneContainer.add(countertop);

    // Sink
    const sinkGeometry = new THREE.BoxGeometry(14, 4, 8);
    
    // Create stainless steel texture
    const stainlessSteelCanvas = createStainlessSteelTexture(256, 256);
    const stainlessSteelTexture = new THREE.CanvasTexture(stainlessSteelCanvas);
    stainlessSteelTexture.wrapS = THREE.RepeatWrapping;
    stainlessSteelTexture.wrapT = THREE.RepeatWrapping;
    stainlessSteelTexture.repeat.set(2, 2); // Adjust these values to change texture tiling
    
    const sinkMaterial = new THREE.MeshPhongMaterial({ 
        map: stainlessSteelTexture,
        bumpMap: stainlessSteelTexture,
        bumpScale: 0.05,
        shininess: 100
    });
    
    sink = new THREE.Mesh(sinkGeometry, sinkMaterial);
    sink.position.set(4, 5, 0);
    sceneContainer.add(sink);

    // Conveyor belt
    const beltLength = 8; // Increased from 6
    const beltWidth = 5; // Increased from 4
    const beltGroup = new THREE.Group();

    // Main belt
    const beltGeometry = new THREE.BoxGeometry(beltLength, 0.4, beltWidth);
    const beltMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 }); // Dark grey
    const belt = new THREE.Mesh(beltGeometry, beltMaterial);
    beltGroup.add(belt);

    // Belt rollers
    const rollerGeometry = new THREE.CylinderGeometry(0.4, 0.4, beltWidth, 16);
    const rollerMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 }); // Light grey
    
    const leftRoller = new THREE.Mesh(rollerGeometry, rollerMaterial);
    leftRoller.rotation.z = Math.PI / 2;
    leftRoller.position.set(-beltLength/2, 0, 0);
    beltGroup.add(leftRoller);

    const rightRoller = leftRoller.clone();
    rightRoller.position.set(beltLength/2, 0, 0);
    beltGroup.add(rightRoller);

    // Belt slats
    const slatCount = 5;
    const slatGeometry = new THREE.BoxGeometry(0.2, 0.48, beltWidth);
    const slatMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 }); // Medium grey

    for (let i = 0; i < slatCount; i++) {
        const slat = new THREE.Mesh(slatGeometry, slatMaterial);
        slat.position.set((i / slatCount) * beltLength - beltLength/2, 0.2, 0);
        beltGroup.add(slat);
    }

    beltGroup.position.set(3, 0.2, 0); // Moved X from 2 to 3
    sceneContainer.add(beltGroup);

    conveyorBelt = beltGroup;

    // Cabinet and shelves
    const cabinetWidth = 10; // Increased from 8
    const cabinetHeight = 12.8; // Increased from 10.8
    const cabinetDepth = 15.6; // Increased from 11.6

    // Cabinet
    const cabinetGeometry = new THREE.BoxGeometry(cabinetWidth, cabinetHeight, cabinetDepth);
    const cabinetMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b4513, // Wood color
        transparent: true,
        opacity: 0.5
    });
    const cabinet = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
    cabinet.position.set(-10, cabinetHeight/2 - 7, 0); // Moved X from -8 to -10, Y adjusted
    sceneContainer.add(cabinet);

    // Shelves
    const shelfGeometry = new THREE.BoxGeometry(cabinetWidth - 0.4, 0.2, cabinetDepth - 0.4);
    const shelfMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 }); // Wood color

    // Bottom shelf
    const bottomShelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
    bottomShelf.position.set(-10, -5, 0);
    sceneContainer.add(bottomShelf);

    // Middle shelf
    const middleShelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
    middleShelf.position.set(-10, 0, 0);
    sceneContainer.add(middleShelf);

    // Top shelf
    const topShelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
    topShelf.position.set(-10, 5, 0);
    sceneContainer.add(topShelf);
    sceneContainer.add(island)
    scene.add(sceneContainer)
}

function createPlates() {
    const plateRadius = 2;
    const plateHeight = 0.4;
    const borderThickness = 0.1;

    const plateGeometry = new THREE.CylinderGeometry(plateRadius, plateRadius, plateHeight, 32);
    const borderGeometry = new THREE.CylinderGeometry(plateRadius + borderThickness, plateRadius + borderThickness, plateHeight, 32);
    
    const plateMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF }); // Bright white color
    const borderMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 }); // Black color

    for (let i = 0; i < 9; i++) {
        // Create plate group
        const plateGroup = new THREE.Group();

        // Create and add border
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        plateGroup.add(border);

        // Create and add plate
        const plate = new THREE.Mesh(plateGeometry, plateMaterial);
        plate.position.y = borderThickness; // Raise the plate slightly to sit on top of the border
        plateGroup.add(plate);

        // Rotate and position the plate group
        plateGroup.rotation.x = Math.PI / 2; // Rotate to lay flat
        
        const row = Math.floor(i / 3);
        const col = i % 3;
        plateGroup.position.set(
            (col - 1) * 4.4, // X position: -4.4, 0, or 4.4
            6.4, // Y position: just above the sink (sink top is at 6)
            (row - 1) * 4 // Z position: -4, 0, or 4
        );
        
        sceneContainer.add(plateGroup);
        plates.push(plateGroup);
    }
}

function startAnimationLoop() {
    if (!isAnimating) {
        isAnimating = true;
        animationLoop();
    }
}

function animationLoop() {
    resetPlates()
        .then(() => animatePlates())
        .then(() => {
            if (isAnimating) {
                setTimeout(animationLoop, 2000);
            }
        });
}

function resetPlates() {
    return new Promise(resolve => {
        plates.forEach((plate) => {
            plate.position.set(
                Math.random() * 1.5 - 0.75,
                2.2,
                Math.random() * 1.5 - 0.75
            );
        });
        resolve();
    });
}

function animatePlates() {
    return new Promise(resolve => {
        let animationStep = 0;
        const totalSteps = 3;

        function animateStep() {
            switch(animationStep) {
                case 0:
                    dropPlatesOntoConveyor().then(() => {
                        animationStep++;
                        animateStep();
                    });
                    break;
                case 1:
                    moveAlongConveyor().then(() => {
                        animationStep++;
                        animateStep();
                    });
                    break;
                case 2:
                    placeOnShelves().then(() => {
                        resolve();
                    });
                    break;
            }
        }

        animateStep();
    });
}

function dropPlatesOntoConveyor() {
    return new Promise(resolve => {
        let droppedCount = 0;
        function dropNextPlate(index) {
            if (index >= plates.length) {
                resolve();
                return;
            }
            const plate = plates[index];
            const targetY = 0.3;
            const duration = 600;
            const startTime = Date.now();
            const startY = plate.position.y + 10;

            function animatePlate() {
                const elapsedTime = Date.now() - startTime;
                const progress = Math.min(elapsedTime / duration, 1);
                plate.position.y = startY - (startY - targetY) * progress;

                if (progress < 1) {
                    requestAnimationFrame(animatePlate);
                } else {
                    droppedCount++;
                    if (droppedCount === plates.length) {
                        resolve();
                    } else {
                        setTimeout(() => dropNextPlate(index + 1), 200);
                    }
                }
            }
            animatePlate();
        }
        dropNextPlate(0);
    });
}

function moveAlongConveyor() {
    return new Promise(resolve => {
        const duration = 1500;
        const startTime = Date.now();
        const startPositions = plates.map(plate => ({...plate.position}));

        function animate() {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            plates.forEach((plate, index) => {
                // Move from right to left
                const startX = 5;
                const endX = -1;
                const targetX = startX + (endX - startX) * progress;
                plate.position.x = targetX;
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        }

        animate();
    });
}

function placeOnShelves() {
    return new Promise(resolve => {
        const shelfPositions = [-4, 0, 4]; // Y positions of the shelves
        const duration = 1000;
        const startTime = Date.now();
        const startPositions = plates.map(plate => ({...plate.position}));

        function animate() {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            plates.forEach((plate, index) => {
                const shelfIndex = Math.floor(index / 3);
                const plateOffset = (index % 3 - 1) * 2.8; // Increased spacing
                const targetX = -8 + plateOffset;
                const targetY = shelfPositions[shelfIndex];
                const targetZ = 0;

                plate.position.x = startPositions[index].x + (targetX - startPositions[index].x) * progress;
                plate.position.y = startPositions[index].y + (targetY - startPositions[index].y) * progress;
                plate.position.z = startPositions[index].z + (targetZ - startPositions[index].z) * progress;
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        }

        animate();
    });
}

function animateConveyorBelt() {
    if (conveyorBelt) {
        conveyorBelt.children.forEach(child => {
            if (child.geometry.type === 'BoxGeometry' && child.geometry.parameters.width === 0.2) {
                child.position.x -= 0.08;
                if (child.position.x < -3) {
                    child.position.x += 6;
                }
            }
        });
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    animateConveyorBelt();
    renderer.render(scene, camera);
}

function createStainlessSteelTexture(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#b8b8b8');
    gradient.addColorStop(0.5, '#f0f0f0');
    gradient.addColorStop(1, '#b8b8b8');

    // Fill background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add some noise for texture
    for (let i = 0; i < width * height / 10; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }

    return canvas;
}

init();