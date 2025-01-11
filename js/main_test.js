



let scene, camera, renderer, controls;

const init = () => {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Light blue sky background

    // Renderer
    // Create WebGL renderer with antialiasing for smoother edges
    renderer = new THREE.WebGLRenderer({ antialias: true }); 
    renderer.setSize(window.innerWidth, window.innerHeight); //make renderer fill the entire window
    renderer.shadowMap.enabled = true; // Enable shadow mapping for realistic shadows
    document.body.appendChild(renderer.domElement);

    // Camera Setup
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 50000); // - Near plane of 0.1 and far plane of 50000 to accommodate large models
    camera.position.set(2800, 600, -40000); // Position based on your model bounds
    
    // Camera Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movements
    controls.dampingFactor = 0.05;// Control the smoothing amount
    controls.screenSpacePanning = false;// Disable vertical panning
    controls.minDistance = 100;// Prevent zooming too close
    controls.maxDistance = 50000;// Prevent zooming too far
    controls.maxPolarAngle = Math.PI / 2;// Prevent camera going below ground

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1000, 1000, 1000);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Load Models
    const loader = new THREE.GLTFLoader();
    loader.load("data/campusbuildings.gltf", (gltf) => {
        const model = gltf.scene;
        
        // Don't scale the model since your bounds are already in reasonable ranges
        // Instead, center it based on its bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        
        model.position.x -= center.x;
        model.position.z -= center.z;
        // Keep y (vertical) position as is since we probably want buildings on the ground


        console.log('Full GLTF data:', gltf);
    
        // Detailed mesh inspection
        model.traverse((child) => {
            if (child.isMesh) {
                console.log('------------------------');
                console.log('Mesh found:');
                console.log('Name:', child.name);
                console.log('UUID:', child.uuid);
                console.log('Type:', child.type);
                console.log('Position:', child.position);
                console.log('Parent name:', child.parent?.name);
                
                // Log material information
                if (child.material) {
                    console.log('Material:', child.material.name);
                    console.log('Material type:', child.material.type);
                }
                
                // Log geometry information
                if (child.geometry) {
                    console.log('Vertices count:', child.geometry.attributes.position.count);
                }
            }
        });
    
        // Count total meshes
        let meshCount = 0;
        model.traverse((child) => {
            if (child.isMesh) meshCount++;
        });
        console.log('Total number of meshes:', meshCount);
        
        scene.add(model);
        
        // Set controls target to model center
        controls.target.set(0, center.y, 0);
        controls.update();
        
        // Optional: Automatically frame the model
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        camera.position.z = cameraZ;
        
        // Optional: Add a ground plane
        const groundGeometry = new THREE.PlaneGeometry(size.x * 2, size.z * 2);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x7ec850,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = box.min.y;
        ground.receiveShadow = true;
        scene.add(ground);
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
};

const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

const animate = () => {
    requestAnimationFrame(animate);
    controls.update(); // Required for damping
    renderer.render(scene, camera);
};

init();
animate();


