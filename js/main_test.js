/* 
let scene, camera, renderer;

const init = () => {
    //Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    //Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //Camera
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.01, 500);
    camera.rotation.y = (90/180) * Math.PI;
    camera.position.set(0.5,0,0);

    //Camera Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.addEventListener("change", () => {
        renderer.render(scene, camera);
    });

    //Light
    ambientLight = new THREE.AmbientLight(0xffffff, 20);
    scene.add(ambientLight);

    //Loader
    const loader = new THREE.GLTFLoader();
    loader.load("data/campusbuildings.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
        
        // Example: force a moderate uniform scale
        model.scale.set(0.01, 0.01, 0.01);
        
        // Check bounding box to see if it’s huge or tiny
        const box = new THREE.Box3().setFromObject(model);
        console.log("Bounds:", box.min, box.max);
        console.log("Size:", box.getSize(new THREE.Vector3()));
      
        // Then force the camera to look at (0,0,0)
        controls.target.set(0, 0, 0);
        controls.update();
      
        renderer.render(scene, camera);
    });
      

};

//Recursive Loop for Render Scene
const animate = () => {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

init(); */


let scene, camera, renderer, controls;

const init = () => {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Light blue sky background

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 50000);
    camera.position.set(12800, 50, -48000); // Position based on your model bounds
    
    // Camera Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movements
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
