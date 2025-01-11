

mapboxgl.accessToken = 'pk.eyJ1Ijoicm9hbWluZ2Nsb3VkIiwiYSI6ImNtMWlsN2RmaTBkZHgya3B4bXJzNjB1NzkifQ._YDH5yXDlRscvmRrh6MWGg';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/roamingcloud/cm3uzavue001p01qr9ude2gxh',
    // Updated coordinates for main campus area
    center: [-89.4053, 43.0766], // Moved east from previous position
    zoom: 12.4,
    pitch: 60,
    bearing: 0,
    antialias: true,
    terrain: {
        source: 'mapbox-dem',
        exaggeration: 1.5,
        enabled: true
    }
});


// Add geolocate control to the map to get user's location
const geolocateControl = new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true, // Follow the user as they move
    showUserHeading: true
});

map.addControl(geolocateControl);

// eslint-disable-next-line no-undef
const tb = (window.tb = new Threebox(
    map,
    map.getCanvas().getContext('webgl'),
    {
        defaultLights: true
    }
));

// Variable to track if model has been added
let userModel = null;

// Create a red marker at the model's center point
const marker = new mapboxgl.Marker({
    color: "#FF0000", // Red color
    scale: 1.5 // Make it a bit larger than default
})
    .setLngLat([-89.4159, 43.0789])
    .addTo(map);


// Event listener for when geolocation is successful
map.on('style.load', () => {
    map.addLayer({
        id: 'custom-threebox-model',
        type: 'custom',
        renderingMode: '3d',
        onAdd: function() {
            tb.loadObj({
                obj: 'data/campusbuildings.gltf',
                type: 'gltf',
                scale: 0.99, // Adjusted scale to better match base map
                units: 'meters',
                rotation: { x: 90, y: 173.3, z: 0 },
                anchor: 'center'
            }, (model) => {
                campusModel = model;
                // Updated coordinates to match main campus location
                tb.add(campusModel.setCoords([-89.4158, 43.07870]));


                map.flyTo({
                    center: [userLng, userLat],
                    zoom: 18
                }); 
            });

        },
        render: function () {
            tb.update();
        }

    }

    )



});