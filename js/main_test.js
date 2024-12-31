
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
    ambientLight = new THREE.AmbientLight(0xaaaaaa, 20);
    scene.add(ambientLight);

    //Loader
    const loader = new THREE.GLTFLoader();
    loader.load("data/campusbuildings.gltf", (gltf) => {
        const model = gltf.scene;
        scene.add(model);
      
        // 1. Compute bounding box of the entire model
        const box = new THREE.Box3().setFromObject(model);
        
        // 2. Get the center and size of that bounding box
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // 3. Optionally re-center the model at (0,0,0)
        //    (sometimes models load very far from the origin)
        model.position.x += (model.position.x - center.x);
        model.position.y += (model.position.y - center.y);
        model.position.z += (model.position.z - center.z);
        
        // 4. Move the camera so it “frames” the model.
        //    A simple approach: place it a bit above and away in Z:
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // push back just a bit
        camera.position.set(0, maxDim * 0.5, cameraZ);
        
        // 5. Make OrbitControls look at the model’s center
        controls.target.set(0, 0, 0);
        controls.update();
        
        animate();
      });
      

};

//Recursive Loop for Render Scene
const animate = () => {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

init();
