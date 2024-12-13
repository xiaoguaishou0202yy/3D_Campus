// 创建场景
const scene = new THREE.Scene();

// 添加相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10); // 初始相机位置

// 创建渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 添加光照
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// 添加辅助工具
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const gridHelper = new THREE.GridHelper(10, 10);
scene.add(gridHelper);

// 加载 GLB 模型
const loader = new THREE.GLTFLoader();
loader.load(
    'data/campusbuildings.glb',
    (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0); // 设置位置
        model.scale.set(10, 10, 10); // 调整比例
        scene.add(model);
    },
    undefined,
    (error) => console.error('Error loading model:', error)
);

// 添加 OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.update();

// 动画循环
const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};
animate();

