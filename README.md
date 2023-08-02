# Web Renderer - Three.js based visualizer for point cloud

### Technical stack 
- Vite + React + Typescript + Tailwindcss

### Dev Environment
- Windows 11
- node==16.15.1

###  Run program
```
cd web-renderer
yarn
yarn run dev
```

### How to use ?

- click 'Original Cloud' to upload original point cloud

- right click to select point

- press 'z' to cancel selection

- press 'e' to extract points as vertices of polygon

- click 'Compute Occlusion' to get occlusion level of point cloud 

- click 'Extract polygon' will send polygon data to backend

- click 'Ground Truth' to specify path of ground truth cloud

- click 'Semantic' to specify path of semantic segmentation cloud

- click 'Evaluate' to get result of evaluation metrics

- click 'Mesh' to upload wireframed mesh
