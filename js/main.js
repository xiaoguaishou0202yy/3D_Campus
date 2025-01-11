// Add these variables at the top of your code

let scene, camera, renderer, controls;
let buildingData = null;
let model; // Add this
const modelToGeoScale = 0.0001; // Move this to global scope

let debugMode = false;
let debugLayer;
let centerPointsHelper;
let matchedBuildingsCount = 0;
let totalBuildingsCount = 0;

// Add debug controls
const addDebugControls = () => {
    const debugPanel = document.createElement('div');
    debugPanel.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: white;
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
    `;
    
    debugPanel.innerHTML = `
        <h3>Debug Controls</h3>
        <button id="toggleDebug">Toggle Debug View</button>
        <button id="showCenters">Show Center Points</button>
        <div id="matchStats"></div>
        <div id="coordinateInfo"></div>
    `;
    
    document.body.appendChild(debugPanel);
    
    document.getElementById('toggleDebug').onclick = toggleDebugView;
    document.getElementById('showCenters').onclick = toggleCenterPoints;
};
 

// Load GeoJSON data first
const loadBuildingData = async () => {
    try {
        const response = await fetch('data/campusbuildings.geojson');
        buildingData = await response.json();
        console.log('GeoJSON data loaded:', buildingData.features.length, 'buildings');
        return buildingData;
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
    }
};

// Create a mapping of building data using coordinates as keys
const createBuildingMap = (features) => {
    const buildingMap = new Map();
    
    features.forEach(feature => {
        const coordinates = feature.geometry.coordinates[0]; // Get outer ring coordinates
        
        // Calculate center point
        let centerX = 0, centerY = 0;
        coordinates.forEach(point => {
            centerX += point[0];
            centerY += point[1];
        });
        centerX /= coordinates.length;
        centerY /= coordinates.length;
        
        // Store with center point as key
        const key = `${centerX.toFixed(2)},${centerY.toFixed(2)}`;
        buildingMap.set(key, {
            ...feature.properties,
            coordinates: coordinates
        });
    });
    
    return buildingMap;
};

const init = async () => {
    // Load GeoJSON data first
    const geoData = await loadBuildingData();
    const buildingMap = createBuildingMap(geoData.features);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Camera Setup
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 50000);
    camera.position.set(2800, 600, -40000);
    
    // Camera Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 100;
    controls.maxDistance = 50000;
    controls.maxPolarAngle = Math.PI / 2;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1000, 1000, 1000);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load 3D Models with GeoJSON data integration
    const loader = new THREE.GLTFLoader();
    loader.load("data/campusbuildings.gltf", (gltf) => {
        model = gltf.scene;
    
        // Get the merged mesh
        let mergedMesh;
        model.traverse((child) => {
            if (child.isMesh) {
                mergedMesh = child;
            }
        });
        
        if (!mergedMesh) {
            console.error('No mesh found in the model');
            return;
        }

        // Transform the model to match GeoJSON coordinates
        transformModelToWGS84(model, buildingData);
    
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.userData.center = center;
    
        // Create debug layer first
        debugLayer = new THREE.Group();
        scene.add(debugLayer);
    
        // Split the merged mesh into individual buildings
        const buildings = splitMergedMesh(mergedMesh, buildingData);
        console.log('Split buildings count:', buildings.children.length);
        console.log('Merged mesh details:', {
            geometry: !!mergedMesh.geometry,
            vertexCount: mergedMesh.geometry.getAttribute('position').count,
            indices: mergedMesh.geometry.index ? mergedMesh.geometry.index.count : 'none'
        });
        
        // Remove the original merged mesh and add the split buildings
        model.remove(mergedMesh);
        model.add(buildings);
    
        // Reset counters
        totalBuildingsCount = buildings.children.length;
        matchedBuildingsCount = 0;
    
        // Process each building
        buildings.children.forEach((building) => {
            const meshBox = new THREE.Box3().setFromObject(building);
            const meshCenter = meshBox.getCenter(new THREE.Vector3());
            
            // Convert coordinates
            const approxGeoX = (meshCenter.x * modelToGeoScale - center.x * modelToGeoScale).toFixed(2);
            const approxGeoY = (meshCenter.z * modelToGeoScale - center.z * modelToGeoScale).toFixed(2);
            
            const key = `${approxGeoX},${approxGeoY}`;
            const buildingInfo = buildingMap.get(key);
            
            // Store debug info in userData
            building.userData.debugInfo = {
                meshCenter: meshCenter,
                geoCoords: { x: approxGeoX, y: approxGeoY },
                matched: !!buildingInfo
            };
            
            if (buildingInfo) {
                matchedBuildingsCount++;
                building.userData.buildingInfo = buildingInfo;
                
                // Add debug visualization
                const debugBox = new THREE.Box3Helper(meshBox, 0x00ff00);
                debugBox.visible = false;
                debugLayer.add(debugBox);
            } else {
                // Add debug visualization for unmatched buildings
                const debugBox = new THREE.Box3Helper(meshBox, 0xff0000);
                debugBox.visible = false;
                debugLayer.add(debugBox);
            }
        });
    
        // Update match statistics
        updateMatchStats();
        setupEventListeners();
        
        scene.add(model);
    });

    window.addEventListener('resize', onWindowResize, false);

    addDebugControls();
};

// Function to display building information
const displayBuildingInfo = (buildingInfo) => {
    const infoPanel = document.getElementById('buildingInfo') || createInfoPanel();
    infoPanel.innerHTML = `
        <h3>${buildingInfo.BldgName || 'Unknown Building'}</h3>
        <p>Address: ${buildingInfo.Street_Add || 'N/A'}</p>
        <p>Building ID: ${buildingInfo.GlobalID || 'N/A'}</p>
        <p>Area: ${(buildingInfo.SHAPE_Area || 0).toFixed(2)} sq ft</p>
        <p>Height: ${(buildingInfo.Height || 0).toFixed(2)} ft</p>
        <p>Zone: ${buildingInfo.Zones || 'N/A'}</p>
    `;
    infoPanel.style.display = 'block';
};

// Function to create info panel
const createInfoPanel = () => {
    const panel = document.createElement('div');
    panel.id = 'buildingInfo';
    panel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        display: none;
        z-index: 1000;
    `;
    document.body.appendChild(panel);
    return panel;
};

// Function to highlight selected building
const highlightBuilding = (selected) => {
    // Reset all buildings
    scene.traverse((child) => {
        if (child.isMesh && child.userData.buildingInfo) {
            child.material.color.setHex(0xcccccc);
            child.material.opacity = 1;
        }
    });
    
    // Highlight selected building
    selected.material.color.setHex(0x00ff00);
    selected.material.opacity = 0.8;
};

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};

// Start the application
init().then(() => {
    animate();
}); 

// Function to toggle debug view
const toggleDebugView = () => {
    debugMode = !debugMode;
    debugLayer.children.forEach(child => {
        child.visible = debugMode;
    });
    
    scene.traverse((child) => {
        if (child.isMesh && child.userData.debugInfo) {
            if (debugMode) {
                // Make buildings semi-transparent in debug mode
                child.material.transparent = true;
                child.material.opacity = 0.5;
                
                // Color based on match status
                child.material.color.setHex(
                    child.userData.debugInfo.matched ? 0x00ff00 : 0xff0000
                );
            } else {
                // Reset to normal view
                child.material.transparent = false;
                child.material.opacity = 1;
                child.material.color.setHex(0xcccccc);
            }
        }
    });
};

// Function to show center points
const toggleCenterPoints = () => {
    if (!model) return; // Add safety check
    
    if (centerPointsHelper) {
        scene.remove(centerPointsHelper);
        centerPointsHelper = null;
        return;
    }
    
    centerPointsHelper = new THREE.Group();
    const center = model.userData.center; // Get stored center
    
    // Add 3D model center points
    scene.traverse((child) => {
        if (child.isMesh && child.userData.debugInfo) {
            const center = child.userData.debugInfo.meshCenter;
            const sphereGeometry = new THREE.SphereGeometry(5);
            const sphereMaterial = new THREE.MeshBasicMaterial({
                color: child.userData.debugInfo.matched ? 0x00ff00 : 0xff0000
            });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.copy(center);
            centerPointsHelper.add(sphere);
        }
    });
    
    // Add GeoJSON center points
    buildingMap.forEach((building, key) => {
        const [x, y] = key.split(',').map(Number);
        const geoCenter = new THREE.Vector3(
            x / modelToGeoScale + model.position.x,
            0,
            y / modelToGeoScale + model.position.z
        );
        
        const sphereGeometry = new THREE.SphereGeometry(5);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(geoCenter);
        centerPointsHelper.add(sphere);
    });
    
    scene.add(centerPointsHelper);
};

// Function to update match statistics
const updateMatchStats = () => {
    const matchStats = document.getElementById('matchStats');
    if (matchStats) {
        const matchPercentage = ((matchedBuildingsCount / totalBuildingsCount) * 100).toFixed(1);
        matchStats.innerHTML = `
            <p>Total Buildings: ${totalBuildingsCount}</p>
            <p>Matched Buildings: ${matchedBuildingsCount}</p>
            <p>Match Rate: ${matchPercentage}%</p>
        `;
    }
};


const setupEventListeners = () => {
    // Add mouse move handler for coordinate inspection
    renderer.domElement.addEventListener('mousemove', (event) => {
        if (!debugMode) return;
        
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        const coordInfo = document.getElementById('coordinateInfo');
        if (coordInfo) {
            if (intersects.length > 0 && intersects[0].object.userData.debugInfo) {
                const debug = intersects[0].object.userData.debugInfo;
                coordInfo.innerHTML = `
                    <p>Mesh Center: (${debug.meshCenter.x.toFixed(2)}, ${debug.meshCenter.z.toFixed(2)})</p>
                    <p>Geo Coords: (${debug.geoCoords.x}, ${debug.geoCoords.y})</p>
                    <p>Matched: ${debug.matched ? 'Yes' : 'No'}</p>
                `;
            } else {
                coordInfo.innerHTML = '';
            }
        }
    });
};

