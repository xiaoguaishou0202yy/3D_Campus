// Add your Mapbox Access Token here
mapboxgl.accessToken = 'pk.eyJ1Ijoicm9hbWluZ2Nsb3VkIiwiYSI6ImNtMWlsN2RmaTBkZHgya3B4bXJzNjB1NzkifQ._YDH5yXDlRscvmRrh6MWGg';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the container element
    style: 'mapbox://styles/roamingcloud/cm3uzavue001p01qr9ude2gxh', // Replace with your style URL
    center: [-89.4012, 43.0731], // Initial map center [longitude, latitude] (e.g., Madison, WI)
    zoom: 12, // Initial zoom level
    pitch: 45,
    bearing: 0
});

// Optional: Add navigation controls
map.addControl(new mapboxgl.NavigationControl());

    
// Add a Three.js scene as a custom Mapbox layer
map.on('style.load', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 50); // Adjust camera position as needed

    const renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: map.painter.context.gl,
        antialias: true,
    });
    renderer.autoClear = false;

    // Load the GLB file
    const loader = new THREE.GLTFLoader();
    loader.load(
        'data/campusbuildings.glb', // Replace with your .glb file URL
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(2, 2, 2); // Adjust the scale to match the Mapbox map
            
            const lng = -89.4012; // Longitude
            const lat = 43.0731;  // Latitude
            const altitude = 0;   // Elevation in meters

            const modelPosition = mapboxgl.MercatorCoordinate.fromLngLat({ lng, lat }, altitude);

            // Set the model position based on Mercator coordinates
            model.position.x = modelPosition.x;
            model.position.y = modelPosition.y;
            model.position.z = modelPosition.z;

            scene.add(model);
        },
        undefined,
        (error) => {
            console.error('Error loading the GLB file:', error);
        }
    );

    // Add light to the scene
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    scene.add(light);

    // Mapbox custom layer
    const customLayer = {
        id: 'threejs-layer',
        type: 'custom',
        renderingMode: '3d',
        onAdd: (map, gl) => {
            renderer.setSize(map.getCanvas().width, map.getCanvas().height);
        },
        render: (gl, matrix) => {
            const rotation = new THREE.Matrix4().fromArray(matrix);
            camera.projectionMatrix = rotation;

            // Render the scene with Three.js
            renderer.state.reset();
            renderer.render(scene, camera);
            map.triggerRepaint();
        },
    };

    // Add the custom layer to the map
    map.addLayer(customLayer);
});