document.addEventListener('DOMContentLoaded', () => {
    mapboxgl.accessToken = 'pk.eyJ1Ijoicm9hbWluZ2Nsb3VkIiwiYSI6ImNtMWlsN2RmaTBkZHgya3B4bXJzNjB1NzkifQ._YDH5yXDlRscvmRrh6MWGg';
    
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/roamingcloud/cm3uzavue001p01qr9ude2gxh',
        center: [-89.4053, 43.0766],
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

    // Store the GeoJSON data
    let buildingsData;

    function isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            
            if (((yi > point[1]) !== (yj > point[1])) &&
                (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }


    function convertToLocalCoordinates(lng, lat) {
        // These scale and offset values will need to be adjusted based on your specific coordinate system
        // This is a simple linear transformation example - you might need more complex transformation
        const scaleX = 100000;  // Example scale factor
        const scaleY = 100000;  // Example scale factor
        const offsetX = -9950000;  // Example offset based on your coordinates
        const offsetY = 5320000;   // Example offset based on your coordinates
    
        // Transform coordinates
        const x = (lng * scaleX) + offsetX;
        const y = (lat * scaleY) + offsetY;
    
        console.log('Converted coordinates:', {
            from: { lng, lat },
            to: { x, y }
        });
    
        return [x, y];
    }

    // Load GeoJSON data
    fetch('data/campusbuildings2.geojson')
        .then(response => response.json())
        .then(data => {
            buildingsData = data;
            console.log('GeoJSON data loaded:', buildingsData);
        })
        .catch(error => console.error('Error loading GeoJSON:', error));

    function displayBuildingInfo(info) {
        const infoPanel = document.getElementById('building-info');
        if (!info) {
            infoPanel.innerHTML = '<p class="placeholder">Select a building to view details</p>';
            return;
        }

        infoPanel.innerHTML = `
            <h3>${info.BldgName || 'Unknown Building'}</h3>
            <p><strong>Building Number:</strong> ${info.BldgNo || 'N/A'}</p>
            <p><strong>Address:</strong> ${info.Street_Add || 'N/A'}</p>
            <p><strong>Height:</strong> ${info.Height || 'N/A'} meters</p>
            <p><strong>Area:</strong> ${info.SHAPE_Area ? Math.round(info.SHAPE_Area) : 'N/A'} sq meters</p>
        `;
    }

    map.on('load', () => {
        const tb = (window.tb = new Threebox(
            map,
            map.getCanvas().getContext('webgl'),
            {
                defaultLights: true
            }
        ));

        let previouslyHighlightedMesh = null;

        // Add click event listener to the map
        map.on('click', (e) => {
            // Get point in screen coordinates
            const point = {
                x: e.point.x,
                y: e.point.y
            };

            // Check if we hit the 3D model
            const intersects = tb.queryRenderedFeatures(point);
            
            if (intersects && intersects.length > 0) {
                console.log('Hit 3D model at:', point,point.x,point);
                
                // Get the clicked point in geographic coordinates
                const lngLat = map.unproject(point);
                console.log('Geographic coordinates:', lngLat);

                // Convert to coordinates for GeoJSON comparison
                const modelCoords = [lngLat.lng, lngLat.lat];
                console.log('Converted coordinates:', modelCoords);

                // Find the building in GeoJSON data
                let foundBuilding = null;
                if (buildingsData) {
                    for (const feature of buildingsData.features) {
                        if (feature.geometry.type === 'Polygon' && 
                            isPointInPolygon(modelCoords, feature.geometry.coordinates[0])) {
                            foundBuilding = feature.properties;
                            break;
                        }
                    }
                }

                // Reset previous highlighting
                if (previouslyHighlightedMesh) {
                    previouslyHighlightedMesh.material.emissive.setHex(0x000000);
                }

                // If we found a building, highlight it and display info
                if (foundBuilding) {
                    const mesh = intersects[0].object;
                    mesh.material.emissive.setHex(0x666666);
                    previouslyHighlightedMesh = mesh;
                    displayBuildingInfo(foundBuilding);
                    console.log('Found building:', foundBuilding);
                } else {
                    displayBuildingInfo(null);
                    console.log('No building found at these coordinates');
                }
            } else {
                // Click didn't hit the 3D model
                console.log('Click missed 3D model');
                if (previouslyHighlightedMesh) {
                    previouslyHighlightedMesh.material.emissive.setHex(0x000000);
                    previouslyHighlightedMesh = null;
                }
                displayBuildingInfo(null);
            }
        });

        // Add the 3D model
        map.addLayer({
            id: 'custom-threebox-model',
            type: 'custom',
            renderingMode: '3d',
            onAdd: function() {
                tb.loadObj({
                    obj: 'data/campusbuildings.gltf',
                    type: 'gltf',
                    scale: 0.99,
                    units: 'meters',
                    rotation: { x: 90, y: 173.3, z: 0 },
                    anchor: 'center'
                }, (model) => {
                    window.campusModel = model;
                    tb.add(model.setCoords([-89.4158, 43.07870]));
                });
            },
            render: function() {
                tb.update();
            }
        });
    });

    // Add geolocate control
    const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
    });
    map.addControl(geolocateControl);
});