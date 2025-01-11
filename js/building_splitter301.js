window.splitMergedMesh = function(mergedMesh) {
    console.log('Starting spatial-based split');
    
    const geometry = mergedMesh.geometry;
    const buildings = new THREE.Group();
    
    const positions = geometry.getAttribute('position').array;
    const indices = geometry.getIndex().array;
    
    // Step 1: Create triangles array
    const triangles = [];
    for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i];
        const b = indices[i + 1];
        const c = indices[i + 2];
        
        triangles.push({
            vertices: [
                new THREE.Vector3(
                    positions[a * 3],
                    positions[a * 3 + 1],
                    positions[a * 3 + 2]
                ),
                new THREE.Vector3(
                    positions[b * 3],
                    positions[b * 3 + 1],
                    positions[b * 3 + 2]
                ),
                new THREE.Vector3(
                    positions[c * 3],
                    positions[c * 3 + 1],
                    positions[c * 3 + 2]
                )
            ],
            processed: false,
            index: Math.floor(i / 3)
        });
    }
    
    // Step 2: Find distinct buildings using spatial proximity
    const buildingGroups = [];
    const maxDistance = 5; // Adjust this value based on your model scale
    
    triangles.forEach((triangle, index) => {
        if (triangle.processed) return;
        
        // Start a new building group
        const currentGroup = [];
        const trianglesToProcess = [triangle];
        triangle.processed = true;
        
        while (trianglesToProcess.length > 0) {
            const currentTriangle = trianglesToProcess.pop();
            currentGroup.push(currentTriangle.index);
            
            // Find connected triangles
            triangles.forEach((otherTriangle) => {
                if (otherTriangle.processed) return;
                
                // Check if triangles are connected or very close
                if (areTrianglesConnected(currentTriangle.vertices, otherTriangle.vertices, maxDistance)) {
                    trianglesToProcess.push(otherTriangle);
                    otherTriangle.processed = true;
                }
            });
        }
        
        buildingGroups.push(currentGroup);
    });
    
    console.log('Found building groups:', buildingGroups.length);
    
    // Step 3: Create separate meshes for each building group
    buildingGroups.forEach((faceIndices, buildingIndex) => {
        const buildingGeometry = new THREE.BufferGeometry();
        const vertexMap = new Map();
        const newPositions = [];
        const newIndices = [];
        let vertexCounter = 0;
        
        faceIndices.forEach(faceIndex => {
            const ia = indices[faceIndex * 3];
            const ib = indices[faceIndex * 3 + 1];
            const ic = indices[faceIndex * 3 + 2];
            
            [ia, ib, ic].forEach(originalIndex => {
                const key = `${positions[originalIndex * 3]},${positions[originalIndex * 3 + 1]},${positions[originalIndex * 3 + 2]}`;
                if (!vertexMap.has(key)) {
                    vertexMap.set(key, vertexCounter++);
                    newPositions.push(
                        positions[originalIndex * 3],
                        positions[originalIndex * 3 + 1],
                        positions[originalIndex * 3 + 2]
                    );
                }
                newIndices.push(vertexMap.get(key));
            });
        });
        
        buildingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
        buildingGeometry.setIndex(newIndices);
        buildingGeometry.computeVertexNormals();
        
        const buildingMesh = new THREE.Mesh(
            buildingGeometry,
            mergedMesh.material.clone()
        );
        buildingMesh.name = `Building_${buildingIndex}`;
        buildings.add(buildingMesh);
    });
    
    console.log('Final buildings count:', buildings.children.length);
    return buildings;
};

// Helper function to check if two triangles are connected or very close
function areTrianglesConnected(verticesA, verticesB, maxDistance) {
    // Check if triangles share any vertices
    for (const va of verticesA) {
        for (const vb of verticesB) {
            if (va.distanceTo(vb) < maxDistance) {
                return true;
            }
        }
    }
    return false;
}