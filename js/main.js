import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

let scene, camera, renderer, controls;
let island, countertop, sink, roboticHand, plates = [], conveyorBelt;
let waterParticles = [], waterHose;
let isAnimating = false;
let conveyorBeltTexture;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const container = document.getElementById('scene-container');
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); // Set clear color to black, but fully transparent
    container.appendChild(renderer.domElement);

    camera.position.set(0, 6, 28);
    camera.lookAt(0, 6, 0);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 6, 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    createIsland();
    createPlates();
    createWaterHose();
    startAnimationLoop();

    animate();
}
function onWindowResize() {
    const container = document.getElementById('scene-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

window.addEventListener('resize', onWindowResize);

function createIsland() {
    // Island base
    const islandGeometry = new THREE.BoxGeometry(24, 12, 12);
    const islandMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.5
    });
    island = new THREE.Mesh(islandGeometry, islandMaterial);
    scene.add(island);

    // Countertop
    const countertopGeometry = new THREE.BoxGeometry(24.8, 0.4, 12.8);
    const countertopMaterial = new THREE.MeshPhongMaterial({ color: 0x999999 });
    countertop = new THREE.Mesh(countertopGeometry, countertopMaterial);
    countertop.position.y = 6.2;
    scene.add(countertop);

    // Sink
    const sinkGeometry = new THREE.BoxGeometry(8, 2, 8);
    const sinkMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
    sink = new THREE.Mesh(sinkGeometry, sinkMaterial);
    sink.position.set(0, 5, 0);
    scene.add(sink);

    // Conveyor belt
    const beltLength = 6;
    const beltWidth = 4;
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

    beltGroup.position.set(2, 0.2, 0);
    scene.add(beltGroup);

    conveyorBelt = beltGroup;

    // Cabinet and shelves
    const cabinetWidth = 8;
    const cabinetHeight = 10.8;
    const cabinetDepth = 11.6;

    // Cabinet
    const cabinetGeometry = new THREE.BoxGeometry(cabinetWidth, cabinetHeight, cabinetDepth);
    const cabinetMaterial = new THREE.MeshPhongMaterial({
        color: 0x8b4513, // Wood color
        transparent: true,
        opacity: 0.5
    });
    const cabinet = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
    cabinet.position.set(-8, cabinetHeight/2 - 6, 0);
    scene.add(cabinet);

    // Shelves
    const shelfGeometry = new THREE.BoxGeometry(cabinetWidth - 0.4, 0.2, cabinetDepth - 0.4);
    const shelfMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 }); // Wood color

    // Bottom shelf
    const bottomShelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
    bottomShelf.position.set(-8, -4, 0);
    scene.add(bottomShelf);

    // Middle shelf
    const middleShelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
    middleShelf.position.set(-8, 0, 0);
    scene.add(middleShelf);

    // Top shelf
    const topShelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
    topShelf.position.set(-8, 4, 0);
    scene.add(topShelf);
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
        
        scene.add(plateGroup);
        plates.push(plateGroup);
    }
}

function createWaterHose() {
    const hoseGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 32);
    const hoseMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    waterHose = new THREE.Mesh(hoseGeometry, hoseMaterial);
    waterHose.position.set(1.5, 0.5, 0);
    waterHose.rotation.z = Math.PI / 4;
    scene.add(waterHose);

    const particleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const particleMaterial = new THREE.MeshPhongMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 });

    for (let i = 0; i < 50; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(waterHose.position);
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                -Math.random() * 0.1 - 0.1,
                (Math.random() - 0.5) * 0.1
            ),
            lifetime: 0
        };
        scene.add(particle);
        waterParticles.push(particle);
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
            const targetY = 0.2;
            const duration = 500;
            const startTime = Date.now();
            const startY = plate.position.y;

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

function animateWater() {
    waterParticles.forEach(particle => {
        particle.position.add(particle.userData.velocity);
        particle.userData.lifetime += 0.016;

        if (particle.userData.lifetime > 1 || particle.position.y < 0.2) {
            particle.position.copy(waterHose.position);
            particle.userData.velocity.set(
                (Math.random() - 0.5) * 0.1,
                -Math.random() * 0.1 - 0.1,
                (Math.random() - 0.5) * 0.1
            );
            particle.userData.lifetime = 0;
        }

        particle.material.opacity = 0.7 * (1 - particle.userData.lifetime);
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
    animateWater();
    renderer.render(scene, camera);
}

init();