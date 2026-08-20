import './styles.css';
function captureSceneState(){return{background:scene.background?.isColor?`#${scene.background.getHexString()}`:'studio-gradient',model:{position:modelRoot.position.toArray(),quaternion:modelRoot.quaternion.toArray(),scale:modelRoot.scale.toArray()},lights:state.lights.map(({light})=>({type:light.userData.type,name:light.name,color:'#'+light.color.getHexString(),level:light.userData.level,position:light.position.toArray(),rotation:[light.rotation.x,light.rotation.y,light.rotation.z],angle:light.angle,width:light.userData.width,height:light.userData.height,enabled:light.visible}))};}
function pushHistory(){const snapshot=captureSceneState(),previous=state.history[state.history.length-1];if(JSON.stringify(previous)!==JSON.stringify(snapshot)){state.history.push(snapshot);if(state.history.length>40)state.history.shift();state.redo=[];}}
function restoreSceneState(snapshot){if(!snapshot)return;clearLights();scene.background=null;snapshot.lights.forEach(config=>{const light=createLight(config.type,config);light.visible=config.enabled!==false;light.userData.enabled=light.visible;});modelRoot.position.fromArray(snapshot.model.position);modelRoot.quaternion.fromArray(snapshot.model.quaternion);modelRoot.scale.fromArray(snapshot.model.scale);syncDirectionalTargets();updateModelBasis();clearSelection();renderSceneTree();}
function undoScene(){if(!state.history.length)return toast('\u6ca1\u6709\u53ef\u64a4\u9500\u64cd\u4f5c','\u5f53\u524d\u5df2\u7ecf\u662f\u6700\u65e9\u72b6\u6001');state.redo.push(captureSceneState());restoreSceneState(state.history.pop());}
function redoScene(){if(!state.redo.length)return toast('\u6ca1\u6709\u53ef\u91cd\u505a\u64cd\u4f5c','\u5f53\u524d\u6ca1\u6709\u53ef\u6062\u590d\u7684\u4fee\u6539');state.history.push(captureSceneState());restoreSceneState(state.redo.pop());}
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

RectAreaLightUniformsLib.init();

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const dom = {
  workspace: $('#workspace'), root: $('#threeRoot'), wrap: $('#viewportWrap'), tree: $('#sceneTree'), inspector: $('#inspector'),
  assets: $('#assetList'), input: $('#modelInput'), selectAll: $('#selectAllAssets'), assetCount: $('#assetCount'), selectedCount: $('#selectedCount'),
  record: $('#recordButton'), queue: $('#queueButton'), frame: $('#recordFrame'), ratio: $('#ratioSelect'), ratioLabel: $('#frameRatioLabel'),
  duration: $('#durationInput'), durationOut: $('#durationOutput'), fps: $('#fpsSelect'), preview: $('#previewToggle'), queueStatus: $('#queueStatus'), queueProgress: $('#queueProgress'),
  queueDone: $('#queueDone'), queueTotal: $('#queueTotal'), queueEta: $('#queueEta'), downloads: $('#downloadList'),
  preset: $('#presetPopover'), presetList: $('#presetList'), lightPopover: $('#lightPopover'), toast: $('#toast'), gizmo: $('#viewGizmo'), timelinePlay: $('#timelinePlay'), timelineProgress: $('#timelineProgress'), timelineTime: $('#timelineTime'), timelineRuler: $('#timelineRuler'), timelinePlayhead: $('#timelinePlayhead'), timelineEndFrame: $('#timelineEndFrame'), currentFrameInput: $('#currentFrameInput'), timelinePrev: $('#timelinePrev'), timelineNext: $('#timelineNext')
};

const scene = new THREE.Scene();
function createBackdropTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const context=canvas.getContext('2d'),gradient=context.createRadialGradient(512,512,0,512,512,724);gradient.addColorStop(0,'#575a5d');gradient.addColorStop(.9,'#0e0e10');gradient.addColorStop(1,'#0e0e10');context.fillStyle=gradient;context.fillRect(0,0,1024,1024);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
const backdropTexture=createBackdropTexture();scene.background=null;
const foundationLight=new THREE.HemisphereLight('#cfd7e7','#343942',0.82);
foundationLight.name='基础环境光';
foundationLight.userData.foundation=true;
scene.add(foundationLight);
const foundationKeyLight=new THREE.DirectionalLight('#fff4dc',1.15);
foundationKeyLight.userData.previewOnly=true;
foundationKeyLight.name='????';
foundationKeyLight.position.set(4,6,5);
foundationKeyLight.target.position.set(0,1,0);
foundationKeyLight.userData.foundation=true;
foundationKeyLight.castShadow=true;
foundationKeyLight.shadow.mapSize.set(1024,1024);
scene.add(foundationKeyLight,foundationKeyLight.target);
const foundationRimLight=new THREE.DirectionalLight('#93a9ff',0.42);
foundationRimLight.userData.previewOnly=true;
foundationRimLight.name='?????';
foundationRimLight.position.set(-4,3,-5);
foundationRimLight.target.position.set(0,1,0);
foundationRimLight.userData.foundation=true;
scene.add(foundationRimLight,foundationRimLight.target);
const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 200);
camera.position.set(4.8, 3.2, 5.7);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
const roomEnvironmentTarget = pmremGenerator.fromScene(roomEnvironment);
scene.environment = roomEnvironmentTarget.texture;
scene.environmentIntensity = 0.7;
pmremGenerator.dispose();
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
dom.root.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.zoomSpeed = 1.35;
controls.rotateSpeed = 0.82;
controls.panSpeed = 0.9;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
controls.target.set(0, 1.2, 0);
controls.minDistance = 0.12;
controls.maxDistance = 80;
controls.maxPolarAngle = Math.PI - 0.01;
controls.addEventListener('change',()=>saveCurrentCameraState());

function createTransform(mode, size) {
  const control = new TransformControls(camera, renderer.domElement);
  control.setMode(mode); control.setSize(size);
  control.addEventListener('dragging-changed', event => {
    if(event.value)pushHistory();state.transformDragging = event.value;
    controls.enabled = !event.value;
    if(!event.value&&control.object===modelRoot)syncOrbitPivotToModel(true);
  });
  control.addEventListener('objectChange', () => { syncDirectionalTargets(); updateModelBasis(); renderInspector(); updateSelectionBox(); });
  const helper = control.getHelper(); helper.visible = false; scene.add(helper); return control;
}
const moveTransform = createTransform('translate', 0.82);
const rotateTransform = createTransform('rotate', 1.02);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color:'#17191f', roughness:.88, metalness:.04 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.visible = false;
const grid = new THREE.GridHelper(80, 80, '#414652', '#292d36');
grid.material.transparent = true; grid.material.opacity = .18; grid.position.y = .002; grid.visible = false; scene.add(grid);
const hemisphere = new THREE.HemisphereLight('#8da0c9', '#17120e', .45); scene.add(hemisphere);
const clayStudioLights=new THREE.Group();
const clayStudioSky=new THREE.HemisphereLight('#dfe5ee','#353941',.58);
const clayStudioKey=new THREE.DirectionalLight('#fff8ed',2.2);clayStudioKey.position.set(4.5,6,5);clayStudioKey.target.position.set(0,1,0);
const clayStudioFill=new THREE.DirectionalLight('#c5d4ee',.16);clayStudioFill.position.set(-4,3,4);clayStudioFill.target.position.set(0,1,0);
const clayStudioRim=new THREE.DirectionalLight('#e9eef8',.95);clayStudioRim.position.set(-3.5,4,-5);clayStudioRim.target.position.set(0,1,0);
clayStudioLights.add(clayStudioSky,clayStudioKey,clayStudioKey.target,clayStudioFill,clayStudioFill.target,clayStudioRim,clayStudioRim.target);clayStudioLights.visible=false;scene.add(clayStudioLights);

function groundAxis(length, width, color, rotationY=0) {
  const axis=new THREE.Mesh(new THREE.BoxGeometry(length,.018,width),new THREE.MeshBasicMaterial({color}));
  axis.rotation.y=rotationY;axis.position.y=.012;axis.renderOrder=2;return axis;
}
const worldAxes = new THREE.Group();
worldAxes.add(groundAxis(80,.055,'#ff2938'));
worldAxes.add(groundAxis(80,.055,'#20e66b',Math.PI/2));
const originRing=new THREE.Mesh(new THREE.TorusGeometry(.19,.035,12,48),new THREE.MeshBasicMaterial({color:'#ffffff'}));
originRing.rotation.x=Math.PI/2;originRing.position.y=.035;originRing.renderOrder=3;worldAxes.add(originRing);
const originDot=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.04,32),new THREE.MeshBasicMaterial({color:'#ffd43b'}));
originDot.position.y=.035;originDot.renderOrder=3;worldAxes.add(originDot);
worldAxes.visible = false; scene.add(worldAxes);

const modelRoot = new THREE.Group(); scene.add(modelRoot);
const lightHelpers = new THREE.Group(); scene.add(lightHelpers);
const wireframeOverlay = new THREE.Group(); wireframeOverlay.visible = false;
const selectionBox = new THREE.BoxHelper(modelRoot, '#ff9d40'); selectionBox.visible = false; scene.add(selectionBox);

const state = {
  assets: [], currentAssetId:null, currentModel:null, displayMode:'material', lights:[], selectedObject:null, textureFiles:[],
  recording:null, batchRunning:false, recordStage:'idle', previewPlaying:false, previewProgress:0, previewLastTime:0, activeTool:'move', transformDragging:false, cameraPan:{x:0,y:0}, previewEnabled:true, fps:30,
  presetName:'\u67d4\u5149\u6444\u5f71\u68da', customPresets:JSON.parse(localStorage.getItem('luma-presets') || '[]'),
  frame:{ x:.5, y:.49, scale:1 }, previewStartTransform:null, wireOverlay:false, wireMode:'feature', wireWidth:1, wireOpacity:.8, previewQuality:null, history:[], redo:[], frames:0, fpsTime:performance.now()
};

function material(color, metalness=.15, roughness=.45) { return new THREE.MeshStandardMaterial({ color, metalness, roughness }); }
function mesh(geometry, mat, position=[0,0,0], rotation=[0,0,0]) { const item=new THREE.Mesh(geometry,mat); item.position.set(...position); item.rotation.set(...rotation); item.castShadow=true; item.receiveShadow=true; return item; }
function createSpeaker() { const g=new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(1.42,2.65,.9),material('#a8aba9',.72,.27),[0,1.325,0])); const front=material('#16191b',.15,.42); g.add(mesh(new THREE.CylinderGeometry(.46,.46,.09,48),front,[0,1.72,.49],[Math.PI/2,0,0])); g.add(mesh(new THREE.CylinderGeometry(.3,.3,.09,48),front,[0,.8,.49],[Math.PI/2,0,0])); g.add(mesh(new THREE.CylinderGeometry(.12,.12,.1,24),material('#393d3f',.6,.25),[0,1.72,.56],[Math.PI/2,0,0])); g.add(mesh(new THREE.CylinderGeometry(.08,.08,.1,24),material('#393d3f',.6,.25),[0,.8,.56],[Math.PI/2,0,0])); return g; }
function createChair() { const g=new THREE.Group(),wood=material('#8c5a3d',.05,.62),fabric=material('#aa7757',.02,.8); g.add(mesh(new THREE.BoxGeometry(1.65,.24,1.65),fabric,[0,1.15,0])); g.add(mesh(new THREE.BoxGeometry(1.65,1.5,.2),fabric,[0,1.95,-.72],[-.16,0,0])); [[-.65,.58,-.6],[.65,.58,-.6],[-.65,.58,.6],[.65,.58,.6]].forEach(p=>g.add(mesh(new THREE.CylinderGeometry(.08,.11,1.15,16),wood,p))); return g; }
function createBottle() { const g=new THREE.Group(),glass=new THREE.MeshPhysicalMaterial({color:'#9d86d0',transmission:.5,transparent:true,opacity:.82,roughness:.12,thickness:.5}); g.add(mesh(new THREE.BoxGeometry(1.25,1.7,.62),glass,[0,.85,0])); g.add(mesh(new THREE.CylinderGeometry(.22,.22,.38,24),material('#c7b5df',.4,.22),[0,1.9,0])); g.add(mesh(new THREE.BoxGeometry(.52,.2,.4),material('#bda7d6',.55,.2),[0,2.18,0])); return g; }
function createLamp() { const g=new THREE.Group(),metal=material('#b49a68',.65,.28); g.add(mesh(new THREE.CylinderGeometry(.72,.9,.12,32),metal,[0,.06,0])); g.add(mesh(new THREE.CylinderGeometry(.06,.08,1.65,16),metal,[0,.92,0])); g.add(mesh(new THREE.CylinderGeometry(.35,.72,.75,32,1,true),material('#d5bd8c',.1,.55),[0,1.9,0])); return g; }

function addAsset(name, object, icon='\u25c8', selected=false) { const asset={id:crypto.randomUUID(),name,object,icon,selected,status:'\u5df2\u5c31\u7eea',topology:inspectMeshTopology(object),cameraState:null}; state.assets.push(asset); renderAssets(); return asset; }
addAsset('\u94f6\u8272\u97f3\u7bb1',createSpeaker(),'\u25a3',true); addAsset('\u4f11\u95f2\u5ea7\u6905',createChair(),'\u25b1',true); addAsset('\u9999\u6c34\u74f6',createBottle(),'\u25c8',true); addAsset('\u53f0\u706f',createLamp(),'\u25c8',false);
function cloneObject(source) { const clone=SkeletonUtils.clone(source); clone.traverse(child=>{if(!child.isMesh)return; child.material=Array.isArray(child.material)?child.material.map(m=>m.clone()):child.material.clone(); child.castShadow=true; child.receiveShadow=true;}); return clone; }
function rememberMaterials(object) { object.traverse(child=>{if(child.isMesh)child.userData.baseMaterial=Array.isArray(child.material)?child.material.map(m=>m.clone()):child.material.clone();}); }
function updateSelectionBox() { selectionBox.visible=state.selectedObject===state.currentModel && Boolean(state.currentModel); if(selectionBox.visible)selectionBox.setFromObject(modelRoot); }
function prepareAssetInstance(asset){
  if(asset.instance)return asset.instance;
  const object=asset.imported?asset.object:cloneObject(asset.object);object.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(object),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  if(box.isEmpty()||!Number.isFinite(size.length()))throw new Error('Model contains no visible mesh');
  object.position.sub(center);object.scale.setScalar(2.65/Math.max(size.x,size.y,size.z,.01));object.updateMatrixWorld(true);
  rememberMaterials(object);asset.instance=object;return object;
}
function loadAsset(asset) {
  if(!asset?.object)return;saveCurrentCameraState();if(asset.imported){state.displayMode='material';syncDisplayModeButtons();}detachTransforms();modelRoot.visible=true;modelRoot.clear();const object=prepareAssetInstance(asset),normalized=new THREE.Box3().setFromObject(object);
  modelRoot.position.set(0,-normalized.min.y,0); modelRoot.rotation.set(0,0,0); modelRoot.scale.set(1,1,1); modelRoot.add(object);
  state.currentModel=object;state.currentAssetId=asset.id;state.selectedObject=null;applyDisplayMode(state.displayMode);detachTransforms();updateContextHelpers();renderAssets();renderSceneTree();renderInspector();if(!restoreAssetCameraState(asset))resetCameraView();updateSelectionBox();requestAnimationFrame(()=>{asset.preview=renderer.domElement.toDataURL('image/png');renderAssets();});
}
function syncDisplayModeButtons(){
  $$('#displayModes button').forEach(button=>button.classList.toggle('active',button.dataset.mode==='wire-toggle'?state.wireOverlay:button.dataset.mode===state.displayMode));
}
function topologyLineGeometry(geometry){
  const position=geometry.getAttribute('position');
  if(!position)return null;
  const index=geometry.getIndex();
  const edgeMap=new Map(),segments=[];
  const vertexKey=vertexIndex=>index?String(index.getX(vertexIndex)):[position.getX(vertexIndex).toFixed(6),position.getY(vertexIndex).toFixed(6),position.getZ(vertexIndex).toFixed(6)].join(',');
  const addEdge=(first,second)=>{
    const a=vertexKey(first),b=vertexKey(second),key=a<b?a+'|'+b:b+'|'+a;
    if(edgeMap.has(key))return;edgeMap.set(key,true);
    const firstIndex=index?index.getX(first):first,secondIndex=index?index.getX(second):second;
    segments.push(position.getX(firstIndex),position.getY(firstIndex),position.getZ(firstIndex),position.getX(secondIndex),position.getY(secondIndex),position.getZ(secondIndex));
  };
  for(let offset=0;offset+2<(index?index.count:position.count);offset+=3){addEdge(offset,offset+1);addEdge(offset+1,offset+2);addEdge(offset+2,offset);}
  const lineGeometry=new THREE.BufferGeometry();lineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(segments,3));return lineGeometry;
}
function objTopologyLineGeometry(source){
  const vertices=[],edges=new Set(),segments=[];
  const resolveIndex=(value,length)=>{const index=Number(value);return index>0?index-1:length+index;};
  const addEdge=(first,second)=>{if(first===second||first<0||second<0||!vertices[first]||!vertices[second])return;const key=first<second?first+'|'+second:second+'|'+first;if(edges.has(key))return;edges.add(key);segments.push(...vertices[first],...vertices[second]);};
  source.split(/\r?\n/).forEach(line=>{
    const text=line.trim();
    if(text.startsWith('v ')){const values=text.slice(2).trim().split(/\s+/).map(Number);if(values.length>=3&&values.slice(0,3).every(Number.isFinite))vertices.push(values.slice(0,3));return;}
    if(!text.startsWith('f '))return;
    const face=text.slice(2).trim().split(/\s+/).map(token=>resolveIndex(token.split('/')[0],vertices.length)).filter(index=>Number.isInteger(index));
    for(let index=0;index<face.length;index++)addEdge(face[index],face[(index+1)%face.length]);
  });
  if(!segments.length)return null;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(segments,3));return geometry;
}
function inspectMeshTopology(object){let triangleCount=0;object?.traverse(child=>{if(child.isMesh){const geometry=child.geometry,position=geometry?.getAttribute('position');if(position)triangleCount+=Math.floor((geometry.index?.count||position.count)/3);}});return{triangleCount,faceCount:triangleCount,triangles:triangleCount,quads:0,ngons:0,source:'triangulated'};}
function inspectObjTopology(source){let faceCount=0,triangleCount=0,triangles=0,quads=0,ngons=0;source.split(/\r?\n/).forEach(line=>{const text=line.trim();if(!text.startsWith('f '))return;const vertices=text.slice(2).trim().split(/\s+/).filter(Boolean).length;if(vertices<3)return;faceCount++;triangleCount+=vertices-2;if(vertices===3)triangles++;else if(vertices===4)quads++;else ngons++;});return{faceCount,triangleCount,triangles,quads,ngons,source:'obj'};}
function topologyLabel(topology){if(!topology)return'未检测拓扑';if(topology.source==='obj')return`真实拓扑：${topology.triangles} 三角 / ${topology.quads} 四边 / ${topology.ngons} 多边`;return`仅含三角网格：${topology.triangleCount.toLocaleString()} 面`; }
function attachObjTopology(object,source){const geometry=objTopologyLineGeometry(source),topology=inspectObjTopology(source);if(geometry)object.userData.sourceTopologyGeometry=geometry;object.userData.topology=topology;return object;}
function wireframeMaterial(){return new THREE.LineBasicMaterial({color:'#111318',transparent:true,opacity:state.wireOpacity,linewidth:state.wireWidth,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});}
function addWireframeLines(parent,geometry){const lines=new THREE.LineSegments(geometry,wireframeMaterial());lines.name='Wireframe';lines.renderOrder=2;lines.frustumCulled=false;parent.add(lines);parent.userData.wireframeLines=lines;}
function removeWireframeLines(object){object?.traverse(child=>{const lines=child.userData.wireframeLines;if(!lines)return;child.remove(lines);lines.geometry.dispose();lines.material.dispose();delete child.userData.wireframeLines;});}
function currentTopology(){return state.currentModel?.userData.topology||state.assets.find(asset=>asset.id===state.currentAssetId)?.topology;}
function rebuildWireframe(){
  removeWireframeLines(state.currentModel);wireframeOverlay.visible=false;
  if(!state.currentModel||!state.wireOverlay)return;
  const topology=currentTopology();
  if((topology?.triangleCount||0)>200000)return;
  const sourceTopology=state.currentModel.userData.sourceTopologyGeometry;
  if(sourceTopology){addWireframeLines(state.currentModel,sourceTopology.clone());return;}
  state.currentModel.traverse(child=>{if(!child.isMesh)return;const geometry=topologyLineGeometry(child.geometry);if(geometry)addWireframeLines(child,geometry);});
}
function removeClayEdges(object){object?.traverse(child=>{const edges=child.userData.clayEdges;if(!edges)return;child.remove(edges);edges.geometry.dispose();edges.material.dispose();delete child.userData.clayEdges;});}
function addClayEdges(object){object?.traverse(child=>{if(!child.isMesh||child.userData.clayEdges)return;const geometry=new THREE.EdgesGeometry(child.geometry,28);if(!geometry.getAttribute('position')?.count){geometry.dispose();return;}const edges=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#4f555c',transparent:true,opacity:.24,depthTest:true,depthWrite:false}));edges.name='ClayEdges';edges.renderOrder=3;edges.scale.setScalar(1.0008);child.add(edges);child.userData.clayEdges=edges;});}
function createClayMaterial(sourceMaterial){const material=new THREE.MeshStandardMaterial({color:'#aeb4ba',roughness:.86,metalness:0,envMapIntensity:0});if(sourceMaterial){material.normalMap=sourceMaterial.normalMap||null;material.normalScale=sourceMaterial.normalScale?.clone?.().multiplyScalar(1.6)||new THREE.Vector2(1.6,1.6);material.aoMap=sourceMaterial.aoMap||null;material.aoMapIntensity=sourceMaterial.aoMapIntensity??1;material.bumpMap=sourceMaterial.bumpMap||null;material.bumpScale=sourceMaterial.bumpScale??1;material.displacementMap=sourceMaterial.displacementMap||null;material.displacementScale=sourceMaterial.displacementScale??0;material.displacementBias=sourceMaterial.displacementBias??0;material.alphaMap=sourceMaterial.alphaMap||null;material.transparent=sourceMaterial.transparent===true;material.opacity=sourceMaterial.opacity??1;material.side=sourceMaterial.side??THREE.FrontSide;}return material;}
function clayMaterials(baseMaterial){return Array.isArray(baseMaterial)?baseMaterial.map(createClayMaterial):createClayMaterial(baseMaterial);}
function setClayStudioLighting(enabled){clayStudioLights.visible=enabled;foundationLight.visible=!enabled;foundationKeyLight.visible=!enabled;foundationRimLight.visible=!enabled;hemisphere.visible=!enabled;state.lights.forEach(({light})=>{if(enabled){light.userData.clayVisible=light.visible;light.visible=false;}else if(light.userData.clayVisible!==undefined){light.visible=light.userData.clayVisible;delete light.userData.clayVisible;}});}
function applyDisplayMode(mode) { if(mode==='wire-toggle'){const topology=currentTopology();if(!state.wireOverlay&&(topology?.triangleCount||0)>200000){toast('线框未显示',`模型包含 ${(topology.triangleCount||0).toLocaleString()} 个三角面，超过 200,000 面上限`);return;}state.wireOverlay=!state.wireOverlay;syncDisplayModeButtons();rebuildWireframe();return;} state.displayMode=mode;syncDisplayModeButtons(); if(!state.currentModel)return;const whiteMode=mode==='white';setClayStudioLighting(whiteMode);removeClayEdges(state.currentModel);scene.environmentIntensity=whiteMode?0:.7;renderer.toneMappingExposure=whiteMode?1:1.1;state.currentModel.traverse(child=>{if(!child.isMesh)return;child.material=mode==='material'?(Array.isArray(child.userData.baseMaterial)?child.userData.baseMaterial.map(material=>material.clone()):child.userData.baseMaterial.clone()):clayMaterials(child.userData.baseMaterial);});rebuildWireframe(); }
function cameraFitDistance(box,padding=1.45){const size=box.getSize(new THREE.Vector3()),verticalFov=THREE.MathUtils.degToRad(camera.fov),horizontalFov=2*Math.atan(Math.tan(verticalFov/2)*Math.max(camera.aspect,.01)),fitHeight=size.y/(2*Math.tan(verticalFov/2)),fitWidth=size.x/(2*Math.tan(horizontalFov/2)),depth=Math.max(size.z,.01);return(Math.max(fitHeight,fitWidth)+depth/2)*padding;}
function restorePreviewTransform(){if(!state.previewStartTransform)return false;modelRoot.position.copy(state.previewStartTransform.position);modelRoot.quaternion.copy(state.previewStartTransform.quaternion);modelRoot.scale.copy(state.previewStartTransform.scale);updateModelBasis();syncOrbitPivotToModel(true);return true;}
function resetCameraView(){const pivot=modelPivot(),box=modelBounds(),distance=cameraFitDistance(box,2.1),front=new THREE.Vector3(0,0,1).applyQuaternion(modelRoot.quaternion).normalize(),up=new THREE.Vector3(0,1,0).applyQuaternion(modelRoot.quaternion).normalize();clearCameraPan();camera.up.copy(up);controls.target.copy(pivot);camera.position.copy(pivot).addScaledVector(front,distance);camera.lookAt(pivot);camera.near=Math.max(.01,distance/1000);camera.far=Math.max(200,distance*30);camera.updateProjectionMatrix();updateModelBasis();controls.update();}
function resetModelView(){state.previewPlaying=false;if(restorePreviewTransform()){state.previewProgress=0;state.previewStartTransform=null;}resetCameraView();updateTimelineUI();renderInspector();}
function actualIntensity(type,level){ if(type==='directional')return level/35; if(type==='ambient')return level/100*1.7; if(type==='rect')return level/10; return level*1.45; }
function createLight(type='spot',options={}) {
  const color=options.color||'#fff0dc',level=options.level??70; let light,helper=null;
  if(type==='rect') light=new THREE.RectAreaLight(color,actualIntensity(type,level),options.width||4,options.height||4);
  else if(type==='directional') light=new THREE.DirectionalLight(color,actualIntensity(type,level));
  else if(type==='point') light=new THREE.PointLight(color,actualIntensity(type,level),20,2);
  else if(type==='ambient') light=new THREE.AmbientLight(color,actualIntensity(type,level));
  else { light=new THREE.SpotLight(color,actualIntensity(type,level),20,options.angle||Math.PI/4,.55,1.4); light.target.position.set(0,1.1,0); scene.add(light.target); }
  const names={spot:'聚光灯',point:'点光源',directional:'方向光',ambient:'环境光',rect:'柔光箱'};
  light.name=options.name||names[type]; light.position.fromArray(options.position||[3,4,3]);
  light.rotation.set(...(options.rotation||[-.55,.65,0])); light.userData.type=type; light.userData.level=level; light.userData.enabled=true; light.userData.deletable=options.deletable!==false; light.userData.previewLight=true;
  if(type==='rect'){light.userData.width=options.width||4;light.userData.height=options.height||4;}
  if(!['ambient','rect'].includes(type)){ light.castShadow=true; light.shadow.mapSize.set(2048,2048); light.shadow.bias=-0.00015; light.shadow.normalBias=.025; }
  scene.add(light);
  if(type==='spot')helper=new THREE.SpotLightHelper(light,'#ffbd73'); else if(type==='point')helper=new THREE.PointLightHelper(light,.18,'#77a7ff'); else if(type==='directional')helper=new THREE.DirectionalLightHelper(light,.5,'#ae81ff');
  if(helper){helper.userData.lightId=light.uuid;helper.visible=false;lightHelpers.add(helper);} const entry={light,helper}; state.lights.push(entry); syncDirectionalTarget(light); return light;
}
function syncDirectionalTarget(light){ if(!light||!['spot','directional'].includes(light.userData.type))return; const direction=new THREE.Vector3(0,0,-1).applyQuaternion(light.quaternion).normalize(); light.target.position.copy(light.position).addScaledVector(direction,4); light.target.updateMatrixWorld(); }
function syncDirectionalTargets(){ state.lights.forEach(({light})=>syncDirectionalTarget(light)); }
function clearLights(){ detachTransforms(); state.lights.forEach(({light,helper})=>{scene.remove(light);if(helper){lightHelpers.remove(helper);helper.dispose?.();}if(light.target)scene.remove(light.target);});state.lights=[]; }
function detachTransforms(){moveTransform.detach();rotateTransform.detach();moveTransform.enabled=false;rotateTransform.enabled=false;moveTransform.getHelper().visible=false;rotateTransform.getHelper().visible=false;}
function refreshTransforms(){const object=state.selectedObject;let target=null;if(object===state.currentModel)target=modelRoot;else if(object?.isLight&&object.userData.type!=='ambient')target=object;if(!target){detachTransforms();return;}const useMove=state.activeTool==='move';moveTransform.enabled=useMove;rotateTransform.enabled=!useMove;if(useMove){moveTransform.attach(target);rotateTransform.detach();moveTransform.getHelper().visible=true;rotateTransform.getHelper().visible=false;}else{rotateTransform.attach(target);moveTransform.detach();rotateTransform.getHelper().visible=true;moveTransform.getHelper().visible=false;}}
function updateContextHelpers(){state.lights.forEach(({light,helper})=>{if(helper)helper.visible=state.selectedObject===light&&light.userData.enabled;});selectionBox.visible=state.selectedObject===state.currentModel&&Boolean(state.currentModel);if(selectionBox.visible)selectionBox.setFromObject(modelRoot);}function selectObject(object){state.selectedObject=object||null;if(state.selectedObject===state.currentModel)updateModelBasis();refreshTransforms();updateContextHelpers();renderSceneTree();renderInspector();updateSelectionBox();}function clearSelection(){selectObject(null);}

const presetText=(...codePoints)=>String.fromCodePoint(...codePoints);
const builtInPresets=[
  {name:presetText(0x67d4,0x5149,0x6444,0x5f71,0x68da),description:presetText(0x67d4,0x5149,0x6444,0x5f71,0x68da),background:'#171923',lights:[
    {type:'rect',name:presetText(0x5de6,0x4fa7,0x67d4,0x5149,0x7bb1),color:'#fff1df',level:82,position:[-3.8,3.5,2.4],rotation:[-.25,-.85,0],width:4.5,height:5},
    {type:'rect',name:presetText(0x53f3,0x4fa7,0x67d4,0x5149,0x7bb1),color:'#dbe8ff',level:48,position:[3.8,2.8,1.8],rotation:[-.18,.85,0],width:3.5,height:4.5}
  ]},
  {name:presetText(0x4f26,0x52c3,0x6717,0x5e03,0x5149),description:presetText(0x4f26,0x52c3,0x6717,0x5e03,0x5149),background:'#141923',lights:[
    {type:'spot',name:presetText(0x6696,0x8272,0x4e3b,0x5149),color:'#ffd0a3',level:78,position:[3.6,4.5,3.2],rotation:[-.62,.66,0],angle:Math.PI/5},
    {type:'rect',name:presetText(0x51b7,0x8272,0x8865,0x5149),color:'#a9c6ff',level:24,position:[-3,2.2,2.5],rotation:[-.18,-.8,0],width:2.8,height:3.5},
    {type:'spot',name:presetText(0x80cc,0x540e,0x8f6e,0x5ed3,0x5149),color:'#9ab5ff',level:66,position:[-2.8,3.5,-3.8],rotation:[-.35,-.68,0],angle:Math.PI/6}
  ]},
  {name:presetText(0x4ea7,0x54c1,0x4e3b,0x89c6,0x89c9),description:presetText(0x4ea7,0x54c1,0x4e3b,0x89c6,0x89c9),background:'#0e1118',lights:[
    {type:'rect',name:presetText(0x9876,0x90e8,0x6761,0x5f62,0x4e3b,0x5149),color:'#fff6df',level:86,position:[0,5.5,1.5],rotation:[0,0,0],width:5.5,height:1.2},
    {type:'rect',name:presetText(0x5de6,0x4fa7,0x7ad6,0x5411,0x9762,0x5149),color:'#d8e5ff',level:42,position:[-4,2.3,1.8],rotation:[0,-Math.PI/2,0],width:1.2,height:5},
    {type:'rect',name:presetText(0x53f3,0x4fa7,0x7ad6,0x5411,0x9762,0x5149),color:'#ffe0c2',level:38,position:[4,2.4,1.8],rotation:[0,Math.PI/2,0],width:1.2,height:5}
  ]},
  {name:presetText(0x7535,0x5f71,0x6c1b,0x56f4),description:presetText(0x7535,0x5f71,0x6c1b,0x56f4),background:'#10131d',lights:[
    {type:'spot',name:presetText(0x6696,0x8272,0x5267,0x60c5,0x4e3b,0x5149),color:'#ffb36b',level:74,position:[3.8,4.2,3],rotation:[-.62,.7,0],angle:Math.PI/5},
    {type:'spot',name:presetText(0x51b7,0x8272,0x8f6e,0x5ed3,0x706f),color:'#6d8fff',level:62,position:[-3.5,3.2,-3.8],rotation:[-.34,-.7,0],angle:Math.PI/5},
    {type:'ambient',name:presetText(0x4f4e,0x5f3a,0x5ea6,0x73af,0x5883,0x5149),color:'#8a9bc5',level:18,position:[0,0,0]}
  ]},
  {name:presetText(0x6237,0x5916,0x9633,0x5149),description:presetText(0x6237,0x5916,0x9633,0x5149),background:'#252b35',lights:[
    {type:'directional',name:presetText(0x592a,0x9633,0x65b9,0x5411,0x5149),color:'#fff0c9',level:92,position:[5,8,4],rotation:[-.75,.55,0]},
    {type:'ambient',name:presetText(0x5929,0x7a7a,0x73af,0x5883,0x5149),color:'#a9c7ff',level:34,position:[0,0,0]},
    {type:'rect',name:presetText(0x5929,0x7a7a,0x67d4,0x548c,0x8865,0x5149),color:'#b7d3ff',level:20,position:[-2,5,-2],rotation:[0,Math.PI,0],width:5,height:5}
  ]},
  {name:presetText(0x9713,0x8679,0x591c,0x666f),description:presetText(0x9713,0x8679,0x591c,0x666f),background:'#080b16',lights:[
    {type:'rect',name:presetText(0x84dd,0x7d2b,0x9762,0x5149),color:'#536dff',level:60,position:[-3,3,2],rotation:[-.25,-.72,0],width:3.5,height:4.5},
    {type:'rect',name:presetText(0x54c1,0x7ea2,0x8f6e,0x5ed3,0x5149),color:'#ff3fbd',level:54,position:[3,3,-3],rotation:[-.3,.65,0],width:3,height:4},
    {type:'ambient',name:presetText(0x591c,0x666f,0x73af,0x5883,0x5149),color:'#242c72',level:13,position:[0,0,0]}
  ]}
];
function applyPreset(preset){clearLights();scene.background=null;preset.lights.forEach(config=>createLight(config.type,{...config,deletable:false}));state.presetName=preset.name;clearSelection();renderPresets();toast('\u5df2\u5e94\u7528\u706f\u5149\u9884\u8bbe',preset.name);}
function serializePreset(name,description=''){return{name,description,background:scene.background?.isColor?`#${scene.background.getHexString()}`:'studio-gradient',lights:state.lights.map(({light})=>({type:light.userData.type,name:light.name,color:`#${light.color.getHexString()}`,level:light.userData.level,position:light.position.toArray(),rotation:[light.rotation.x,light.rotation.y,light.rotation.z],angle:light.angle,width:light.userData.width,height:light.userData.height}))};}

function renderSceneTree(){
  const model=state.assets.find(a=>a.id===state.currentAssetId),keyword=$('#sceneSearch').value.trim().toLowerCase(),rows=[];
  if(model&&(!keyword||model.name.toLowerCase().includes(keyword)))rows.push(`<div class="tree-row ${state.selectedObject===state.currentModel?'active':''}" data-object="model"><button class="tree-main"><span class="model-mark">&#9662;&nbsp;&#9683;</span><span class="object-name">${model?.name||'\u6a21\u578b'}</span></button><button class="object-visibility ${modelRoot.visible?'':'hidden'}" data-visibility="model" title="${modelRoot.visible?'\u9690\u85cf\u6a21\u578b':'\u663e\u793a\u6a21\u578b'}"><span></span></button></div>`);
  rows.push('<div class="tree-divider"></div>');
  state.lights.forEach(({light},index)=>{if(!keyword||light.name.toLowerCase().includes(keyword)){const dot=light.userData.type==='ambient'?'gray':index===1?'blue':index===2?'purple':'';rows.push(`<div class="tree-row ${state.selectedObject===light?'active':''}" data-light="${light.uuid}"><button class="tree-main"><span class="tree-dot ${dot}"></span><span class="object-name">${light.name}</span></button>${light.userData.deletable?`<button class="light-delete" data-delete-light="${light.uuid}" title="\u5220\u9664\u706f\u5149" aria-label="\u5220\u9664\u706f\u5149"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8v9m4-9v9M5 5h14M9 5l1-2h4l1 2m2 0-1 15H8L7 5"/></svg></button>`:''}<button class="object-visibility ${light.visible?'':'hidden'}" data-visibility="light" data-light-id="${light.uuid}" title="${light.visible?'\u9690\u85cf\u706f\u5149':'\u663e\u793a\u706f\u5149'}"><span></span></button></div>`);}});
  rows.push('<div class="tree-divider"></div><div class="tree-row muted"><span class="tree-main"><span class="model-mark">&#9673;</span><span class="object-name">\u6444\u50cf\u673a</span></span></div><div class="tree-row muted"><span class="tree-main"><span class="model-mark">&#9638;</span><span class="object-name">\u80cc\u666f</span></span></div>');
  dom.tree.innerHTML=rows.join('');
  dom.tree.querySelector('[data-object="model"] .tree-main')?.addEventListener('click',()=>selectObject(state.currentModel));
  dom.tree.querySelectorAll('[data-light] .tree-main').forEach(button=>button.addEventListener('click',()=>selectObject(state.lights.find(item=>item.light.uuid===button.closest('[data-light]').dataset.light)?.light)));
  dom.tree.querySelector('[data-visibility="model"]')?.addEventListener('click',()=>{modelRoot.visible=!modelRoot.visible;if(!modelRoot.visible&&state.selectedObject===state.currentModel)clearSelection();else{updateContextHelpers();renderSceneTree();}});
  dom.tree.querySelectorAll('[data-delete-light]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();const entry=state.lights.find(item=>item.light.uuid===button.dataset.deleteLight);if(entry)deleteLight(entry.light);}));
  dom.tree.querySelectorAll('[data-light] .object-name').forEach(label=>label.addEventListener('dblclick',event=>{
    event.preventDefault();event.stopPropagation();const row=label.closest('[data-light]'),light=state.lights.find(item=>item.light.uuid===row.dataset.light)?.light;if(!light)return;
    const input=document.createElement('input');input.className='tree-name-input';input.value=light.name;label.replaceWith(input);input.focus();input.select();
    const finish=commit=>{const value=input.value.trim();if(commit&&value)light.name=value;renderSceneTree();renderInspector();};
    input.addEventListener('keydown',keyEvent=>{keyEvent.stopPropagation();if(keyEvent.key==='Enter')finish(true);if(keyEvent.key==='Escape')finish(false);});input.addEventListener('blur',()=>finish(true));
  }));
  dom.tree.querySelectorAll('[data-visibility="light"]').forEach(button=>button.addEventListener('click',()=>{const entry=state.lights.find(item=>item.light.uuid===button.dataset.lightId);if(!entry)return;entry.light.visible=!entry.light.visible;entry.light.userData.enabled=entry.light.visible;if(entry.helper)entry.helper.visible=entry.light.visible&&state.selectedObject===entry.light;if(!entry.light.visible&&state.selectedObject===entry.light)clearSelection();else renderSceneTree();}));
}
function renderInspector(){
  const object=state.selectedObject;
  if(!object){dom.inspector.innerHTML='<span>\u8bf7\u9009\u62e9\u6a21\u578b\u6216\u706f\u5149\u8fdb\u884c\u8c03\u8282</span>';return;}
  if(!object.isLight){
    dom.inspector.innerHTML=`<h3>\u6a21\u578b\u8c03\u8282</h3><label>Y \u8f74\u65cb\u8f6c<input class="range" id="modelRotation" type="range" min="-180" max="180" value="${THREE.MathUtils.radToDeg(modelRoot.rotation.y)}"></label><label>\u6a21\u578b\u7f29\u653e<input class="range" id="modelScale" type="range" min="20" max="180" value="${modelRoot.scale.x*100}"></label><div class="coord-grid"><label>X<input class="number-input model-pos" data-axis="x" value="${modelRoot.position.x.toFixed(1)}"></label><label>Y<input class="number-input model-pos" data-axis="y" value="${modelRoot.position.y.toFixed(1)}"></label><label>Z<input class="number-input model-pos" data-axis="z" value="${modelRoot.position.z.toFixed(1)}"></label></div>`;
    $('#modelRotation').oninput=e=>{modelRoot.rotation.y=THREE.MathUtils.degToRad(Number(e.target.value));updateSelectionBox();};
    $('#modelScale').oninput=e=>{modelRoot.scale.setScalar(Number(e.target.value)/100);updateSelectionBox();};
    $('.model-pos').forEach(input=>input.oninput=e=>{const value=Number(e.target.value);if(!Number.isFinite(value))return;modelRoot.position[e.target.dataset.axis]=value;updateModelBasis();syncOrbitPivotToModel(true);updateSelectionBox();});
    return;
  }
  const typeName={spot:'聚光灯',point:'点光源',directional:'方向光',ambient:'环境光',rect:'柔光箱'}[object.userData.type]||'灯光',position=object.position,rotation=object.rotation;
  dom.inspector.innerHTML=`<h3><span class="tree-dot"></span><input id="lightName" class="inline-name" value="${object.name}"><button id="deleteLight" aria-label="删除灯光">删除</button></h3><label>灯光类型<select disabled><option>${typeName}</option></select></label><label>灯光状态<select id="lightVisible"><option value="on" ${object.userData.enabled?'selected':''}>启用</option><option value="off" ${!object.userData.enabled?'selected':''}>禁用</option></select></label><label>亮度 <b id="levelValue">${object.userData.level}%</b><input class="range" id="lightLevel" type="range" min="0" max="100" value="${object.userData.level}"></label><label>颜色<input id="lightColor" type="color" value="#${object.color.getHexString()}"></label>${object.userData.type==='spot'?`<label>光束角度 <b id="angleValue">${Math.round(THREE.MathUtils.radToDeg(object.angle))}°</b><input class="range" id="lightAngle" type="range" min="5" max="100" value="${THREE.MathUtils.radToDeg(object.angle)}"></label>`:''} ${object.userData.type!=='ambient'?`<div class="coord-grid">${['x','y','z'].map(axis=>`<label>${axis.toUpperCase()}<input class="number-input coord" data-axis="${axis}" value="${position[axis].toFixed(1)}"></label>`).join('')}</div><div class="coord-grid">${['x','y','z'].map(axis=>`<label>R${axis.toUpperCase()}<input class="number-input rotation" data-axis="${axis}" value="${THREE.MathUtils.radToDeg(rotation[axis]).toFixed(0)}"></label>`).join('')}</div>`:''} `;
  $('#lightName').onchange=e=>{object.name=e.target.value.trim()||typeName;renderSceneTree();};
  $('#lightVisible').onchange=e=>{object.userData.enabled=e.target.value==='on';object.visible=object.userData.enabled;const entry=state.lights.find(item=>item.light===object);if(entry?.helper)entry.helper.visible=object.userData.enabled&&state.selectedObject===object;renderSceneTree();};
  $('#lightLevel').oninput=e=>{object.userData.level=Number(e.target.value);object.intensity=actualIntensity(object.userData.type,object.userData.level);$('#levelValue').textContent=e.target.value+'%';};
  $('#lightColor').oninput=e=>object.color.set(e.target.value);
  if($('#lightAngle'))$('#lightAngle').oninput=e=>{object.angle=THREE.MathUtils.degToRad(Number(e.target.value));$('#angleValue').textContent=e.target.value+'°';};
  $$('.coord').forEach(input=>input.onchange=e=>{object.position[e.target.dataset.axis]=Number(e.target.value);syncDirectionalTarget(object);});
  $$('.rotation').forEach(input=>input.onchange=e=>{object.rotation[e.target.dataset.axis]=THREE.MathUtils.degToRad(Number(e.target.value));syncDirectionalTarget(object);});
  $('#deleteLight').onclick=()=>deleteLight(object);
  if(object.userData.deletable===false)$('#deleteLight').disabled=true;
}
function deleteLight(object){const entry=state.lights.find(item=>item.light===object);if(!entry||entry.light.userData.deletable===false)return;detachTransforms();scene.remove(entry.light);if(entry.helper){lightHelpers.remove(entry.helper);entry.helper.dispose?.();}if(entry.light.target)scene.remove(entry.light.target);state.lights=state.lights.filter(item=>item!==entry);clearSelection();toast('\u706f\u5149\u5df2\u5220\u9664',object.name);}
function disposeAsset(asset){const geometries=new Set(),materials=new Set(),textures=new Set();[asset.instance,asset.object].filter(Boolean).forEach(root=>root.traverse(child=>{if(child.geometry)geometries.add(child.geometry);const list=Array.isArray(child.material)?child.material:[child.material];list.filter(Boolean).forEach(material=>{materials.add(material);Object.values(material).forEach(value=>{if(value?.isTexture)textures.add(value);});});}));textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());geometries.forEach(geometry=>geometry.dispose());asset.instance=null;asset.object=null;}
function openAsset(asset){if(!asset?.object)return toast('\u6a21\u578b\u5c1a\u672a\u5c31\u7eea',asset?.status||'');try{loadAsset(asset);}catch(error){asset.status='\u6253\u5f00\u5931\u8d25\uff1a'+error.message;renderAssets();toast('\u6a21\u578b\u6253\u5f00\u5931\u8d25',error.message);}}
function deleteAsset(asset){if(state.recording||state.batchRunning)return toast('\u6682\u65f6\u65e0\u6cd5\u5220\u9664','\u8bf7\u7b49\u5f85\u5f55\u5236\u6216\u6279\u91cf\u6e32\u67d3\u7ed3\u675f');const index=state.assets.indexOf(asset),wasCurrent=asset.id===state.currentAssetId;if(index<0)return;state.assets.splice(index,1);if(wasCurrent){detachTransforms();modelRoot.clear();state.currentModel=null;state.currentAssetId=null;state.selectedObject=null;selectionBox.visible=false;}disposeAsset(asset);const next=wasCurrent?state.assets[Math.min(index,state.assets.length-1)]:null;if(next)openAsset(next);else{renderAssets();renderSceneTree();renderInspector();}toast('\u6a21\u578b\u5df2\u5220\u9664',asset.name);}
function renderAssets(){
  dom.assets.innerHTML=state.assets.map(asset=>`<article class="asset-card ${asset.selected?'selected':''} ${state.currentAssetId===asset.id?'current':''}" data-id="${asset.id}" tabindex="0" title="??????"><input class="asset-check" type="checkbox" ${asset.selected?'checked':''}><div class="asset-thumb">${asset.preview?`<img src="${asset.preview}" alt="${asset.name} ??">`:`<span>${asset.icon}</span>`}</div><div class="asset-info"><strong>${asset.name}</strong><span><i></i>${asset.status}</span></div><button class="asset-delete" title="????" aria-label="????"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8v9m4-9v9M5 5h14M9 5l1-2h4l1 2m2 0-1 15H8L7 5"/></svg></button></article>`).join('');
  dom.assets.querySelectorAll('.asset-card').forEach(card=>{const asset=state.assets.find(item=>item.id===card.dataset.id),open=()=>openAsset(asset);card.addEventListener('click',event=>{if(event.target.closest('input,button'))return;open();});card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}});card.querySelector('input').addEventListener('change',event=>{asset.selected=event.target.checked;renderAssets();});card.querySelector('.asset-delete').addEventListener('click',()=>deleteAsset(asset));});
  const count=state.assets.filter(asset=>asset.selected).length;dom.assetCount.textContent=count;dom.selectedCount.textContent=count;dom.queueTotal.textContent=count;dom.selectAll.checked=Boolean(state.assets.length)&&count===state.assets.length;dom.queueEta.textContent=count?`?? ${count*Number(dom.duration.value)} ?`:'???????';
}
function persistPresets(){localStorage.setItem('luma-presets',JSON.stringify(state.customPresets));}
function downloadJson(data,name){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
function importPresetFile(file){file.text().then(text=>{const data=JSON.parse(text),items=Array.isArray(data)?data:[data];items.filter(item=>item&&Array.isArray(item.lights)).forEach(item=>state.customPresets.push({...item,name:item.name||'\u672a\u547d\u540d\u9884\u8bbe',description:item.description||''}));persistPresets();renderPresets();toast('\u9884\u8bbe\u5df2\u5bfc\u5165','\u5df2\u6dfb\u52a0 '+items.length+' \u4e2a\u65b9\u6848');}).catch(error=>toast('\u5bfc\u5165\u5931\u8d25',error.message));}
function renderPresets(){
  const presets=[...builtInPresets,...state.customPresets];
  const count=$$('.preset-count')[0];if(count)count.textContent=String(presets.length);
  dom.presetList.replaceChildren();
  presets.forEach((preset,index)=>{
    const card=document.createElement('div');card.className='preset-card'+(state.presetName===preset.name?' active':'');
    const apply=document.createElement('button');apply.className='preset-apply';apply.type='button';
    const content=document.createElement('div');const name=document.createElement('strong');name.textContent=preset.name;const description=document.createElement('small');description.textContent=preset.description||String.fromCodePoint(0x65e0,0x63cf,0x8ff0);content.append(name,description);
    const selected=document.createElement('em');selected.textContent=state.presetName===preset.name?'\u2713':'';apply.append(content,selected);apply.onclick=()=>applyPreset(preset);card.append(apply);
    if(index>=builtInPresets.length){
      const actions=document.createElement('div');actions.className='preset-card-actions';
      const remove=document.createElement('button');remove.type='button';remove.className='preset-delete';remove.title=String.fromCodePoint(0x5220,0x9664,0x9884,0x8bbe);remove.setAttribute('aria-label',remove.title);remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8v9m4-9v9M5 5h14M9 5l1-2h4l1 2m2 0-1 15H8L7 5"/></svg>';
      remove.onclick=event=>{event.stopPropagation();state.customPresets.splice(index-builtInPresets.length,1);persistPresets();renderPresets();};actions.append(remove);card.append(actions);
    }
    dom.presetList.append(card);
  });
}
function resourceFileName(url){try{return decodeURIComponent(url).split(/[\\/]/).pop().split(/[?#]/)[0].toLowerCase();}catch{return url.split(/[\\/]/).pop().split(/[?#]/)[0].toLowerCase();}}
function createResourceManager(files){const manager=new THREE.LoadingManager(),resources=new Map();files.forEach(file=>resources.set(file.name.toLowerCase(),URL.createObjectURL(file)));manager.setURLModifier(url=>resources.get(resourceFileName(url))||url);return manager;}
function configureImportedObject(object){object.traverse(child=>{if(!child.isMesh)return;child.castShadow=true;child.receiveShadow=true;});object.userData.topology=inspectMeshTopology(object);return object;}
async function parseModel(file,resourceFiles=[]){
  const extension=file.name.split('.').pop().toLowerCase(),manager=createResourceManager(resourceFiles);
  if(extension==='glb'){const buffer=await file.arrayBuffer();return await new Promise((resolve,reject)=>new GLTFLoader(manager).parse(buffer,'',gltf=>resolve(configureImportedObject(gltf.scene)),reject));}
  if(extension==='gltf'){const source=await file.text();return await new Promise((resolve,reject)=>new GLTFLoader(manager).parse(source,'',gltf=>resolve(configureImportedObject(gltf.scene)),reject));}
  if(extension==='obj'){const source=await file.text(),loader=new OBJLoader(manager),mtlFile=resourceFiles.find(item=>/\.mtl$/i.test(item.name));if(mtlFile){const materials=new MTLLoader(manager).parse(await mtlFile.text(),'');materials.preload();loader.setMaterials(materials);}return attachObjTopology(configureImportedObject(loader.parse(source)),source);}
  if(extension==='fbx')return configureImportedObject(new FBXLoader(manager).parse(await file.arrayBuffer(),''));
  throw new Error('\u4e0d\u652f\u6301\u7684\u6a21\u578b\u683c\u5f0f');
}
async function uploadModels(files){
  const modelFiles=files.filter(file=>/\.(glb|gltf|obj|fbx)$/i.test(file.name)),resources=files.filter(file=>!modelFiles.includes(file));
  resources.forEach(file=>{const index=state.textureFiles.findIndex(item=>item.name.toLowerCase()===file.name.toLowerCase());if(index>=0)state.textureFiles[index]=file;else state.textureFiles.push(file);});
  if(!modelFiles.length){if(resources.length)toast('\u8d44\u6e90\u6587\u4ef6\u5df2\u52a0\u5165','\u8bf7\u5c06\u6a21\u578b\u4e0e\u8d34\u56fe\u6587\u4ef6\u4e00\u8d77\u9009\u62e9');return;}
  const total=modelFiles.length;let imported=0,failed=0;
  for(const [index,file] of modelFiles.entries()){
    const placeholder=addAsset(file.name.replace(/\.[^.]+$/,''),new THREE.Group(),'...',false);
    placeholder.imported=true;
    placeholder.status='\u89e3\u6790\u4e2d '+(index+1)+'/'+total;
    renderAssets();
    try{
      placeholder.object=await parseModel(file,state.textureFiles);
      placeholder.topology=placeholder.object.userData.topology||inspectMeshTopology(placeholder.object);
      placeholder.icon='\u25eb';
      placeholder.status=(file.size/1024/1024).toFixed(1)+' MB \u00b7 '+topologyLabel(placeholder.topology);
      openAsset(placeholder);
      imported++;
    }catch(error){
      placeholder.status='\u52a0\u8f7d\u5931\u8d25\uff1a'+error.message;
      placeholder.icon='!';
      failed++;
    }
    renderAssets();
  }
  toast('\u6279\u91cf\u5bfc\u5165\u5b8c\u6210','\u6210\u529f '+imported+' \u4e2a'+(failed?'\uff0c\u5931\u8d25 '+failed+' \u4e2a':''));
}
async function applyTextureToCurrentModel(file){
  if(!state.currentModel)return toast('\u8bf7\u5148\u9009\u62e9\u6a21\u578b','\u8d34\u56fe\u4f1a\u5e94\u7528\u5230\u5f53\u524d\u6a21\u578b');
  const url=URL.createObjectURL(file),texture=await new Promise((resolve,reject)=>new THREE.TextureLoader().load(url,resolve,undefined,reject));texture.colorSpace=THREE.SRGBColorSpace;
  const applyMap=material=>{if(!material)return;material.map=texture;material.color?.set(0xffffff);material.needsUpdate=true;};
  state.currentModel.traverse(child=>{if(!child.isMesh)return;const base=child.userData.baseMaterial;Array.isArray(base)?base.forEach(applyMap):applyMap(base);});
  state.displayMode='material';syncDisplayModeButtons();applyDisplayMode('material');URL.revokeObjectURL(url);
  toast('\u8d34\u56fe\u5df2\u5e94\u7528','\u5df2\u66f4\u65b0\u5f53\u524d\u6a21\u578b\u7684\u57fa\u7840\u989c\u8272\u8d34\u56fe');
}
function ratioConfig(){return{'16:9':[1280,720],'9:16':[720,1280],'4:3':[960,720],'1:1':[720,720],'free':[960,540]}[dom.ratio.value]||[960,540];}
function setPreviewQuality(enabled){
  if(enabled){
    foundationLight.intensity=.82; foundationKeyLight.intensity=1.15; foundationRimLight.intensity=.42;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.35)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap;
    state.currentModel?.traverse(child=>{if(child.isMesh)child.castShadow=true;});
  }else{
    foundationLight.intensity=2.2; foundationKeyLight.intensity=0; foundationRimLight.intensity=0;
    renderer.setPixelRatio(Math.min(devicePixelRatio,.72)); renderer.shadowMap.enabled=false;
    state.currentModel?.traverse(child=>{if(child.isMesh)child.castShadow=false;});
  }
  resize();
}
function updateFrameRatio(reset=false){
  const wrap=dom.wrap.getBoundingClientRect();
  if(!wrap.width||!wrap.height)return;
  const ratio=dom.ratio.value;
  const presets={'16:9':.72,'9:16':.34,'4:3':.62,'1:1':.52};
  if(reset){state.frame.scale=1;state.frame.x=.5;state.frame.y=.49;}
  if(ratio==='free'){
    const width=state.frame.freeWidth||Math.max(220,Math.round(wrap.width*.64));
    const height=state.frame.freeHeight||Math.max(140,Math.round(width*9/16));
    state.frame.freeWidth=width;state.frame.freeHeight=height;
    dom.frame.style.width=`${width}px`;dom.frame.style.height=`${height}px`;
  }else{
    const width=Math.min(wrap.width*.92,Math.max(180,wrap.width*(presets[ratio]||.72)*state.frame.scale));
    const [targetWidth,targetHeight]=ratioConfig();
    dom.frame.style.width=`${width}px`;dom.frame.style.height=`${width*targetHeight/targetWidth}px`;
  }
  dom.frame.style.left=`${state.frame.x*100}%`;dom.frame.style.top=`${state.frame.y*100}%`;
  dom.frame.style.transform='translate(-50%, -50%)';
  dom.ratioLabel.textContent=ratio==='free'?`${Math.round(dom.frame.offsetWidth)} × ${Math.round(dom.frame.offsetHeight)}`:ratio;
}
function enterFraming(){if(state.recordStage!=='idle')return;state.recordStage='framing';dom.frame.classList.add('visible');dom.record.classList.add('framing');dom.record.querySelector('b').textContent='\u5f00\u59cb\u5f55\u5236';dom.record.querySelector('small').textContent='\u8c03\u6574\u5f55\u5236\u8303\u56f4\u540e\u5f00\u59cb';updateFrameRatio();}
function exitFraming(){if(state.recording)return;state.recordStage='idle';dom.frame.classList.remove('visible','recording');dom.record.classList.remove('framing','recording');dom.record.querySelector('b').textContent='\u51c6\u5907\u5f55\u5236';dom.record.querySelector('small').textContent='\u663e\u793a\u5e76\u8c03\u6574\u5f55\u5236\u8303\u56f4';}
function mimeType(){return['video/webm;codecs=vp8','video/webm;codecs=vp9','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||'';}
function addDownload(name,blob){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${name}.webm`;link.textContent=`Download ${name}.webm`;dom.downloads.append(link);link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return url;}
async function recordAsset(asset,batch=false){
  if(asset.id!==state.currentAssetId)loadAsset(asset);
  await new Promise(resolve=>setTimeout(resolve,160));
  const savedTransform={position:modelRoot.position.clone(),quaternion:modelRoot.quaternion.clone(),scale:modelRoot.scale.clone()},[width,height]=ratioConfig(),viewport=dom.root.getBoundingClientRect(),frameRect=dom.frame.getBoundingClientRect(),fullWidth=dom.root.clientWidth,fullHeight=dom.root.clientHeight,cropX=Math.max(0,Math.min(fullWidth-1,frameRect.left-viewport.left)),cropY=Math.max(0,Math.min(fullHeight-1,frameRect.top-viewport.top)),cropWidth=Math.max(1,Math.min(fullWidth-cropX,frameRect.width)),cropHeight=Math.max(1,Math.min(fullHeight-cropY,frameRect.height)),duration=Number(dom.duration.value)*1000;
  const recordingRenderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  recordingRenderer.setClearColor(0x0e0e10, 1);
  const previousBackground=scene.background; scene.background=backdropTexture;
  recordingRenderer.setSize(width,height,false);recordingRenderer.setPixelRatio(1);recordingRenderer.shadowMap.enabled=true;recordingRenderer.shadowMap.type=THREE.PCFSoftShadowMap;recordingRenderer.outputColorSpace=THREE.SRGBColorSpace;recordingRenderer.toneMapping=renderer.toneMapping;recordingRenderer.toneMappingExposure=renderer.toneMappingExposure;
  const recordCamera=camera.clone();recordCamera.clearViewOffset();recordCamera.aspect=fullWidth/fullHeight;recordCamera.setViewOffset(fullWidth,fullHeight,cropX,cropY,cropWidth,cropHeight);recordCamera.updateProjectionMatrix();recordCamera.updateMatrixWorld();
  recordingRenderer.render(scene,recordCamera);
  const stream=recordingRenderer.domElement.captureStream(0),track=stream.getVideoTracks()[0],recorder=new MediaRecorder(stream,{mimeType:mimeType(),videoBitsPerSecond:12_000_000}),chunks=[];
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  const result=new Promise((resolve,reject)=>{recorder.onerror=event=>reject(event.error);recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}));});
const visibility={helpers:lightHelpers.visible,grid:grid.visible,axes:worldAxes.visible,selection:selectionBox.visible,controls:controls.enabled,preview:state.previewEnabled,lightIntensities:state.lights.map(({light})=>light.intensity),lightVisibility:state.lights.map(({light})=>light.visible)};
state.lights.forEach(({light})=>{if(light.userData.previewIntensity===undefined)light.userData.previewIntensity=light.intensity;light.intensity=light.userData.previewIntensity;light.visible=true;});lightHelpers.visible=false;grid.visible=false;worldAxes.visible=false;selectionBox.visible=false;controls.enabled=false;
  state.recording={start:0,duration,renderer:recordingRenderer,camera:recordCamera,recorder,track,stopping:false,rotate:$('#rotationMode').value==='single',visibility,savedTransform,rotationOffset:new THREE.Quaternion(),stopTimer:null,captureTimer:null};
  state.recordStage='recording';dom.workspace.classList.add('recording-active');dom.frame.classList.add('visible','recording');dom.record.classList.remove('framing');dom.record.classList.add('recording');
  dom.record.querySelector('b').textContent=batch?`??? ? ${asset.name}`:'???';dom.record.querySelector('small').textContent='??????';
  try{recorder.start();const task=state.recording;task.start=performance.now();track.requestFrame?.();task.captureTimer=setInterval(()=>track.requestFrame?.(),1000/state.fps);task.stopTimer=setTimeout(()=>{if(!state.recording||state.recording!==task||task.stopping)return;task.stopping=true;clearInterval(task.captureTimer);task.renderer.render(scene,task.camera);track.requestFrame?.();recorder.requestData();recorder.stop();},duration);return await result;}
  finally{
    if(state.recording?.stopTimer)clearTimeout(state.recording.stopTimer);if(state.recording?.captureTimer)clearInterval(state.recording.captureTimer);dom.workspace.classList.remove('recording-active');state.recording=null;modelRoot.position.copy(savedTransform.position);modelRoot.quaternion.copy(savedTransform.quaternion);modelRoot.scale.copy(savedTransform.scale);updateModelBasis();
state.lights.forEach(({light},index)=>{if(visibility.lightIntensities[index]!==undefined)light.intensity=visibility.lightIntensities[index];if(visibility.lightVisibility[index]!==undefined)light.visible=visibility.lightVisibility[index];});lightHelpers.visible=visibility.helpers;
    scene.background=previousBackground;recordingRenderer.dispose();state.transformDragging=false;grid.visible=visibility.grid;worldAxes.visible=visibility.axes;selectionBox.visible=visibility.selection;controls.enabled=true;updateContextHelpers();updateSelectionBox();refreshTransforms();controls.enabled=true;renderSceneTree();renderInspector();
  }
}
async function startSingleRecording(){if(state.recording||state.batchRunning)return;if(state.recordStage==='idle'){enterFraming();return;}const asset=state.assets.find(a=>a.id===state.currentAssetId);if(!asset)return toast('\u8bf7\u5148\u9009\u62e9\u6a21\u578b','\u4ece\u53f3\u4fa7\u8d44\u4ea7\u5217\u8868\u9009\u62e9\u4e00\u4e2a\u6a21\u578b');try{const blob=await recordAsset(asset);addDownload(`${asset.name}_${state.presetName}_${dom.ratio.value.replace(':','x')}`,blob);toast('\u5f55\u5236\u5b8c\u6210',`${asset.name} \u5df2\u5b8c\u6210 360\u00b0 \u89c6\u9891\u5f55\u5236`);}catch(error){toast('\u5f55\u5236\u5931\u8d25',error.message);}finally{exitFraming();}}
async function startBatch(){if(state.batchRunning||state.recording)return;const assets=state.assets.filter(a=>a.selected&&a.object);if(!assets.length)return toast('\u6ca1\u6709\u6279\u91cf\u4efb\u52a1','\u8bf7\u5148\u52fe\u9009\u81f3\u5c11\u4e00\u4e2a\u6a21\u578b');state.batchRunning=true;dom.downloads.innerHTML='';dom.queueDone.textContent='0';dom.queueProgress.style.width='0';dom.queueStatus.textContent='\u6e32\u67d3\u4e2d';for(let index=0;index<assets.length;index++){dom.queueEta.textContent=`\u6b63\u5728\u5904\u7406 ${assets[index].name}`;try{const blob=await recordAsset(assets[index],true);addDownload(`${assets[index].name}_${state.presetName}_${dom.ratio.value.replace(':','x')}`,blob);}catch(error){console.error(error);}dom.queueDone.textContent=String(index+1);dom.queueProgress.style.width=`${(index+1)/assets.length*100}%`;}state.batchRunning=false;dom.queueStatus.textContent='\u5168\u90e8\u5b8c\u6210';dom.queueEta.textContent='\u89c6\u9891\u53ef\u4ee5\u4e0b\u8f7d';exitFraming();toast('\u6279\u91cf\u6e32\u67d3\u5b8c\u6210',`\u5df2\u751f\u6210 ${assets.length} \u4e2a\u89c6\u9891\u6587\u4ef6`);}
function toast(title,message){dom.toast.innerHTML=`<strong>✓　${title}</strong><small>${message}</small>`;dom.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>dom.toast.classList.remove('show'),3200);}

function setupFrameInteraction(){let drag=null;dom.frame.addEventListener('pointerdown',event=>{if(state.recordStage!=='framing'||event.target=== $('#closeFrame'))return;event.preventDefault();const rect=dom.frame.getBoundingClientRect(),wrap=dom.wrap.getBoundingClientRect();drag={startX:event.clientX,startY:event.clientY,startLeft:rect.left-wrap.left,startTop:rect.top-wrap.top,startWidth:rect.width,startHeight:rect.height,mode:event.target.dataset.resize?'resize':'move',corner:event.target.dataset.resize,wrap};dom.frame.setPointerCapture(event.pointerId);});dom.frame.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(drag.mode==='move'){const centerX=drag.startLeft+drag.startWidth/2+dx,centerY=drag.startTop+drag.startHeight/2+dy;state.frame.x=THREE.MathUtils.clamp(centerX/drag.wrap.width,.08,.92);state.frame.y=THREE.MathUtils.clamp(centerY/drag.wrap.height,.1,.9);}else if(dom.ratio.value==='free'){const left=drag.corner.includes('l'),top=drag.corner.includes('t'),newWidth=THREE.MathUtils.clamp(drag.startWidth+(left?-dx:dx),180,drag.wrap.width*.92),newHeight=THREE.MathUtils.clamp(drag.startHeight+(top?-dy:dy),120,drag.wrap.height*.92);if(left)state.frame.x=THREE.MathUtils.clamp((drag.startLeft+(drag.startWidth-newWidth))/drag.wrap.width+.5*newWidth/drag.wrap.width,.08,.92);if(top)state.frame.y=THREE.MathUtils.clamp((drag.startTop+(drag.startHeight-newHeight))/drag.wrap.height+.5*newHeight/drag.wrap.height,.1,.9);state.frame.freeWidth=newWidth;state.frame.freeHeight=newHeight;}else{const sign=drag.corner.includes('l')?-1:1,newWidth=THREE.MathUtils.clamp(drag.startWidth+dx*sign,160,drag.wrap.width*.92);state.frame.scale=newWidth/(drag.wrap.width*({'16:9':.72,'9:16':.34,'4:3':.62,'1:1':.52}[dom.ratio.value]||.72));}updateFrameRatio();});dom.frame.addEventListener('pointerup',()=>drag=null);}
function snapView(view){const pivot=modelPivot(),bounds=modelBounds(),size=bounds.getSize(new THREE.Vector3()),maxSize=Math.max(size.x,size.y,size.z,1),distance=maxSize/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.28,directions={x:[0,0,1],'-x':[0,0,-1],y:[0,1,0],'-y':[0,-1,0],z:[1,0,0],'-z':[-1,0,0]},direction=new THREE.Vector3(...directions[view]).applyQuaternion(modelRoot.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(modelRoot.quaternion);if(view==='y')up.set(0,0,-1).applyQuaternion(modelRoot.quaternion);if(view==='-y')up.set(0,0,1).applyQuaternion(modelRoot.quaternion);clearCameraPan();camera.up.copy(up);controls.target.copy(pivot);camera.position.copy(pivot).addScaledVector(direction,distance);camera.lookAt(pivot);controls.update();}
function updateViewGizmo(){const inverse=camera.quaternion.clone().invert(),center=35,radius=22;[['x',new THREE.Vector3(1,0,0)],['y',new THREE.Vector3(0,1,0)],['z',new THREE.Vector3(0,0,1)]].forEach(([axis,vector])=>{vector.applyQuaternion(inverse);const positive=dom.gizmo.querySelector(`[data-view="${axis}"]`),negative=dom.gizmo.querySelector(`[data-view="-${axis}"]`),stem=dom.gizmo.querySelector(`.stem-${axis}`),endX=center+vector.x*radius,endY=center-vector.y*radius;positive.style.left=`${endX}px`;positive.style.top=`${endY}px`;negative.style.left=`${center-vector.x*radius}px`;negative.style.top=`${center+vector.y*radius}px`;positive.style.zIndex=vector.z>.15?'1':'4';negative.style.zIndex=vector.z<-.15?'1':'4';stem.style.width=`${Math.hypot(endX-center,endY-center)}px`;stem.style.transform=`translate(${center}px,${center}px) rotate(${Math.atan2(endY-center,endX-center)}rad)`;stem.style.zIndex=vector.z>.15?'1':'2';});}
function setupViewportSelection(){
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart=null;
  renderer.domElement.addEventListener('pointerdown',event=>{if(event.button!==0)return;pointerStart={x:event.clientX,y:event.clientY};});
  renderer.domElement.addEventListener('pointerup',event=>{
    if(event.button!==0)return;
    if(!pointerStart||state.recording||state.transformDragging||moveTransform.axis||rotateTransform.axis)return;
    if(Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>5)return;
    const rect=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);
    const meshes=[];state.currentModel?.traverse(child=>{if(child.isMesh)meshes.push(child);});
    if(raycaster.intersectObjects(meshes,false).length)selectObject(state.currentModel);else clearSelection();
  });
}
function setupViewportPan(){renderer.domElement.addEventListener('contextmenu',event=>event.preventDefault());}
function resize(){const{clientWidth:width,clientHeight:height}=dom.root;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;applyCameraViewOffset();}
new ResizeObserver(resize).observe(dom.root);
function animate(time){requestAnimationFrame(animate);const task=state.recording;if(!task){controls.update();state.frames++;if(time-state.fpsTime>700){const fps=$('#fpsText');if(fps)fps.textContent=`${Math.round(state.frames*1000/(time-state.fpsTime))} FPS`;state.frames=0;state.fpsTime=time;}if(state.frames%3===0&&state.previewEnabled)state.lights.forEach(({helper})=>helper?.update?.());updateViewGizmo();}if(state.previewPlaying&&!task){const duration=Number(dom.duration.value)*1000;state.previewProgress=(state.previewProgress+Math.max(0,time-state.previewLastTime)/duration)%1;state.previewLastTime=time;const base=previewTransform(),rotation=new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP,state.previewProgress*Math.PI*2);modelRoot.quaternion.copy(base.quaternion).multiply(rotation);modelRoot.position.copy(base.position);modelRoot.scale.copy(base.scale);updateModelBasis();updateTimelineUI();}else{state.previewLastTime=time;}if(task){const progress=Math.min(Math.max(0,time-task.start)/task.duration,1);if(task.rotate){task.rotationOffset.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,progress*Math.PI*2);modelRoot.quaternion.copy(task.savedTransform.quaternion).multiply(task.rotationOffset);}task.renderer.render(scene,task.camera);}else renderer.render(scene,camera);}
requestAnimationFrame(animate);

$('#sceneSearch').addEventListener('input',renderSceneTree);
dom.input.addEventListener('change',async event=>{const files=[...event.target.files];event.target.value='';await uploadModels(files);});
const uploadButton=dom.input.closest('.upload-button');
['dragenter','dragover'].forEach(type=>uploadButton.addEventListener(type,event=>{event.preventDefault();uploadButton.classList.add('dragging');}));
['dragleave','drop'].forEach(type=>uploadButton.addEventListener(type,event=>{event.preventDefault();uploadButton.classList.remove('dragging');}));
uploadButton.addEventListener('drop',async event=>{const files=[...event.dataTransfer.files];if(files.length)await uploadModels(files);});
$('#textureInput').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{await applyTextureToCurrentModel(file);}catch(error){toast('\u8d34\u56fe\u52a0\u8f7d\u5931\u8d25',error.message);}finally{event.target.value='';}});
dom.selectAll.addEventListener('change',event=>{state.assets.forEach(asset=>asset.selected=event.target.checked);renderAssets();});
$('#displayModes').addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;event.preventDefault();event.stopPropagation();applyDisplayMode(button.dataset.mode);});
$('#wireWidthInput').addEventListener('input',event=>{state.wireWidth=Number(event.target.value);rebuildWireframe();});
$('#wireOpacityInput').addEventListener('input',event=>{state.wireOpacity=Number(event.target.value);rebuildWireframe();});
function timelineFrameCount(){return Math.max(1,Math.round((Number(dom.duration.value)||8)*state.fps));}
function renderTimelineRuler(){const total=timelineFrameCount(),ticks=10,marks=[];for(let index=0;index<=ticks;index++){const frame=Math.round(total*index/ticks);marks.push('<span style=\"left:'+index/ticks*100+'%\"><b>'+frame+'</b></span>');}dom.timelineRuler.innerHTML=marks.join('');dom.timelineEndFrame.textContent=String(total);}
function updateTimelineUI(){const total=timelineFrameCount(),current=Math.min(total,Math.round(state.previewProgress*total));dom.timelineProgress.value=String(Math.round(state.previewProgress*1000));dom.timelinePlayhead.style.left=(state.previewProgress*100)+'%';dom.timelineTime.textContent=`${current} / ${total} 帧`;if(dom.currentFrameInput)dom.currentFrameInput.value=String(current);dom.timelinePlay.textContent=state.previewPlaying?'||':'>';dom.timelinePlay.setAttribute('aria-pressed',String(state.previewPlaying));}
function previewTransform(){if(!state.previewStartTransform)state.previewStartTransform={position:modelRoot.position.clone(),quaternion:modelRoot.quaternion.clone(),scale:modelRoot.scale.clone()};return state.previewStartTransform;}
function setPreviewFrame(frame){const total=timelineFrameCount();state.previewProgress=THREE.MathUtils.clamp(frame/total,0,1);const base=previewTransform(),rotation=new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP,state.previewProgress*Math.PI*2);modelRoot.position.copy(base.position);modelRoot.quaternion.copy(base.quaternion).multiply(rotation);modelRoot.scale.copy(base.scale);updateModelBasis();updateTimelineUI();}
function togglePreviewPlayback(){if(!state.currentModel)return;if(!state.previewPlaying)previewTransform();state.previewPlaying=!state.previewPlaying;state.previewLastTime=performance.now();updateTimelineUI();}
dom.timelinePlay.onclick=togglePreviewPlayback;dom.timelinePrev.onclick=()=>{state.previewPlaying=false;setPreviewFrame(Math.round(state.previewProgress*timelineFrameCount())-1);};dom.timelineNext.onclick=()=>{state.previewPlaying=false;setPreviewFrame(Math.round(state.previewProgress*timelineFrameCount())+1);};dom.timelineProgress.addEventListener('input',event=>setPreviewFrame(Number(event.target.value)/1000*timelineFrameCount()));dom.currentFrameInput?.addEventListener('change',event=>{state.previewPlaying=false;const value=Number(event.target.value);setPreviewFrame(Number.isFinite(value)?Math.round(value):0);});dom.currentFrameInput?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.target.blur();}});
$('#resetCamera').onclick=resetModelView;$('#toggleGrid').onclick=()=>{const visible=!grid.visible;grid.visible=visible;worldAxes.visible=visible;$('#toggleGrid').classList.toggle('active',visible);};
$('#toggleLeft').onclick=()=>dom.workspace.classList.toggle('left-collapsed');$('#toggleRight').onclick=()=>dom.workspace.classList.toggle('right-collapsed');
function toggleTool(type){state.activeTool=type;$('#moveTool').classList.toggle('active',type==='move');$('#rotateTool').classList.toggle('active',type==='rotate');refreshTransforms();}
$('#moveTool').onclick=()=>toggleTool('move');$('#rotateTool').onclick=()=>toggleTool('rotate');
window.addEventListener('keydown',event=>{if(event.ctrlKey&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redoScene():undoScene();return;}if(event.ctrlKey&&event.key.toLowerCase()==='y'){event.preventDefault();redoScene();return;}if(event.target.matches('input,select,textarea'))return;if(event.code==='Space'){event.preventDefault();togglePreviewPlayback();return;}if(event.code==='Space'){event.preventDefault();togglePreviewPlayback();return;}if(event.key.toLowerCase()==='w'){event.preventDefault();toggleTool('move');}if(event.key.toLowerCase()==='e'){event.preventDefault();toggleTool('rotate');}if(event.key==='Escape'){dom.lightPopover.classList.remove('open');if(state.recordStage==='framing')exitFraming();else clearSelection();}});
function openLightMenu(){dom.lightPopover.classList.toggle('open');}
$('#addLightButton').onclick=openLightMenu;$('#closeLightMenu').onclick=()=>dom.lightPopover.classList.remove('open');
$$('.light-option').forEach(button=>button.onclick=()=>{const type=button.dataset.lightType,index=state.lights.filter(item=>item.light.userData.type===type).length+1,typeName={spot:'\u805a\u5149\u706f',point:'\u70b9\u5149\u6e90',directional:'\u65b9\u5411\u5149',ambient:'\u73af\u5883\u5149'}[type],light=createLight(type,{name:`${typeName} ${index}`,position:type==='ambient'?[0,0,0]:[2.5,3.5,2.5],level:type==='ambient'?25:65});selectObject(light);dom.lightPopover.classList.remove('open');toast(`\u5df2\u6dfb\u52a0 ${typeName}`,type==='ambient'?'\u53ef\u5728\u5de6\u4fa7\u8c03\u6574\u73af\u5883\u4eae\u5ea6\u4e0e\u989c\u8272':'\u4f7f\u7528 W \u79fb\u52a8\u3001E \u65cb\u8f6c\uff0c\u4e24\u4e2a\u5de5\u5177\u53ef\u540c\u65f6\u5f00\u542f');});
void 0;
$('#savePreset').onclick=()=>{const name=prompt('\u9884\u8bbe\u540d\u79f0','\u6211\u7684\u706f\u5149\u9884\u8bbe');if(!name)return;const description=prompt('\u9884\u8bbe\u63cf\u8ff0\uff08\u53ef\u7559\u7a7a\uff09','')||'';state.customPresets.push(serializePreset(name.trim(),description));persistPresets();state.presetName=name.trim();renderPresets();toast('\u9884\u8bbe\u5df2\u4fdd\u5b58',name.trim());};$('#importPreset').onclick=()=>$('#presetFileInput').click();$('#presetFileInput').onchange=event=>{const file=event.target.files[0];if(file)importPresetFile(file);event.target.value='';};function presetExportFileName(name){const safeName=String(name||'presets').trim().replace(/[<>:\"/\\|?*\u0000-\u001f]/g,'-').replace(/\s+/g,' ').replace(/[. ]+$/,'')||'presets';return 'luma-light-'+safeName+'.json';}
$('#exportPreset').onclick=()=>downloadJson(state.customPresets,presetExportFileName(state.presetName));
dom.duration.addEventListener('input',()=>{dom.durationOut.textContent=dom.duration.value+' \u79d2';renderTimelineRuler();updateTimelineUI();renderAssets();});dom.fps.addEventListener('change',()=>{state.fps=Number(dom.fps.value);renderTimelineRuler();updateTimelineUI();});dom.preview.onclick=()=>{state.previewEnabled=!state.previewEnabled;dom.preview.classList.toggle('active',state.previewEnabled);dom.preview.setAttribute('aria-pressed',String(state.previewEnabled));dom.preview.textContent=state.previewEnabled?'\u5b9e\u65f6\u9884\u89c8\u5f00':'\u5b9e\u65f6\u9884\u89c8\u5173';state.lights.forEach(({light})=>{if(light.userData.previewIntensity===undefined)light.userData.previewIntensity=light.intensity;light.intensity=state.previewEnabled?light.userData.previewIntensity:0;});setPreviewQuality(state.previewEnabled);};dom.ratio.addEventListener('change',()=>updateFrameRatio(true));dom.record.onclick=startSingleRecording;dom.queue.onclick=startBatch;$('#closeFrame').onclick=event=>{event.stopPropagation();exitFraming();};
dom.gizmo.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>snapView(button.dataset.view));
$('#undoButton').onclick=undoScene;$('#redoButton').onclick=redoScene;
updateTimelineUI();renderTimelineRuler();updateTimelineUI();setupFrameInteraction();setupViewportSelection();setupViewportPan();setupInspectorResize();resize();setPreviewQuality(true);applyPreset(builtInPresets[0]);loadAsset(state.assets[0]);renderAssets();renderPresets();updateFrameRatio(true);


function modelBounds(){return new THREE.Box3().setFromObject(modelRoot);}
function modelCenter(){return modelBounds().getCenter(new THREE.Vector3());}
function saveCurrentCameraState(){const asset=state.assets.find(item=>item.id===state.currentAssetId);if(!asset||state.recording)return;asset.cameraState={position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),up:camera.up.toArray(),target:controls.target.toArray(),pan:{...state.cameraPan},fov:camera.fov};}
function restoreAssetCameraState(asset){const saved=asset?.cameraState;if(!saved)return false;camera.position.fromArray(saved.position);camera.quaternion.fromArray(saved.quaternion);camera.up.fromArray(saved.up);camera.fov=saved.fov;controls.target.fromArray(saved.target);state.cameraPan={...saved.pan};camera.updateProjectionMatrix();applyCameraViewOffset();controls.update();return true;}
function modelPivot(){return state.currentModel?modelCenter():modelRoot.getWorldPosition(new THREE.Vector3());}
function applyCameraViewOffset(){const width=dom.root.clientWidth,height=dom.root.clientHeight;if(!width||!height)return;const rect=dom.root.getBoundingClientRect(),visibleLeft=Math.max(rect.left,0),visibleRight=Math.min(rect.right,window.innerWidth),viewportCenterOffset=visibleRight>visibleLeft?(visibleLeft+visibleRight-rect.left-rect.right)/2:0,panX=state.cameraPan.x+viewportCenterOffset;if(Math.abs(panX)<.01&&Math.abs(state.cameraPan.y)<.01){camera.clearViewOffset();camera.updateProjectionMatrix();return;}camera.setViewOffset(width,height,-panX,-state.cameraPan.y,width,height);}
function clearCameraPan(){state.cameraPan.x=0;state.cameraPan.y=0;applyCameraViewOffset();}
function syncOrbitPivotToModel(preserveView=false){const pivot=modelPivot(),delta=pivot.clone().sub(controls.target);if(preserveView)camera.position.add(delta);controls.target.copy(pivot);controls.update();}
function updateModelBasis(){const pivot=modelPivot();grid.position.set(pivot.x,pivot.y+.002,pivot.z);worldAxes.position.copy(pivot);selectionBox.setFromObject(modelRoot);rebuildWireframe();}



function setupInspectorResize(){
  let resizeState=null;
  dom.inspector.addEventListener('pointerdown',event=>{
    const rect=dom.inspector.getBoundingClientRect();
    if(event.clientY-rect.top>30)return;
    event.preventDefault();event.stopPropagation();resizeState={startY:event.clientY,startHeight:rect.height};dom.inspector.setPointerCapture(event.pointerId);
  });
  dom.inspector.addEventListener('pointermove',event=>{if(!resizeState)return;const next=Math.max(240,resizeState.startHeight+(resizeState.startY-event.clientY));dom.inspector.style.flexBasis=next+'px';dom.inspector.style.height=next+'px';});
  const finish=event=>{if(!resizeState)return;resizeState=null;try{dom.inspector.releasePointerCapture(event.pointerId);}catch{}};
  dom.inspector.addEventListener('pointerup',finish);dom.inspector.addEventListener('pointercancel',finish);
}
