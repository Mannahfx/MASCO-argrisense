import fs from 'fs';

function fixKeras3ToTFJS(filePath) {
  console.log('Fixing Keras 3 -> TF.js compatibility for:', filePath);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const modelJson = JSON.parse(fileContent);

  const layers = modelJson.modelTopology.model_config.config.layers;

  // ========== FIX 1: Flatten Keras 3 dtype configs to simple strings ==========
  let dtypeFixCount = 0;
  for (const layer of layers) {
    if (layer.config && layer.config.dtype && typeof layer.config.dtype === 'object') {
      if (layer.config.dtype.config && layer.config.dtype.config.name) {
        layer.config.dtype = layer.config.dtype.config.name;
        dtypeFixCount++;
      }
    }
  }
  console.log('  Fixed', dtypeFixCount, 'dtype configs');

  // ========== FIX 2: Flatten Keras 3 initializer configs ==========
  let initFixCount = 0;
  const initializerKeys = ['kernel_initializer', 'bias_initializer', 'beta_initializer', 
    'gamma_initializer', 'moving_mean_initializer', 'moving_variance_initializer',
    'depthwise_initializer', 'pointwise_initializer'];
  
  function flattenInitializer(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj.module && obj.class_name) {
      // Keras 3 style: {module:"keras.initializers", class_name:"GlorotUniform", config:{seed:null}}
      const result = { class_name: obj.class_name, config: obj.config || {} };
      return result;
    }
    return obj;
  }

  for (const layer of layers) {
    if (!layer.config) continue;
    for (const key of initializerKeys) {
      if (layer.config[key] && typeof layer.config[key] === 'object' && layer.config[key].module) {
        layer.config[key] = flattenInitializer(layer.config[key]);
        initFixCount++;
      }
    }
    // Also fix regularizer and constraint keys
    for (const key of ['kernel_regularizer', 'bias_regularizer', 'activity_regularizer', 
      'kernel_constraint', 'bias_constraint', 'depthwise_regularizer', 'depthwise_constraint',
      'pointwise_regularizer', 'pointwise_constraint']) {
      if (layer.config[key] && typeof layer.config[key] === 'object' && layer.config[key].module) {
        layer.config[key] = flattenInitializer(layer.config[key]);
        initFixCount++;
      }
    }
  }
  console.log('  Fixed', initFixCount, 'initializer/regularizer configs');

  // ========== FIX 3: Rename weight names in weightsManifest ==========
  // TF.js DepthwiseConv2D expects weight named "depthwise_kernel" not "kernel"
  // TF.js Conv2D expects "kernel" (that one is fine)
  // TF.js BatchNormalization expects "gamma", "beta", "moving_mean", "moving_variance" (fine)
  // TF.js Dense expects "kernel" and "bias" (fine)
  // But we need to add ":0" suffix for TF.js variable matching
  
  // Build a map of layer name -> class_name for renaming
  const layerClassMap = {};
  for (const l of layers) {
    layerClassMap[l.name] = l.class_name;
  }

  let weightRenameCount = 0;
  if (modelJson.weightsManifest) {
    for (const group of modelJson.weightsManifest) {
      for (const w of group.weights) {
        const parts = w.name.split('/');
        if (parts.length === 2) {
          const layerName = parts[0];
          const varName = parts[1];
          const layerClass = layerClassMap[layerName];
          
          // For DepthwiseConv2D, rename "kernel" to "depthwise_kernel"
          if (layerClass === 'DepthwiseConv2D' && varName === 'kernel') {
            w.name = layerName + '/depthwise_kernel';
            weightRenameCount++;
          }
        }
      }
    }
  }
  console.log('  Renamed', weightRenameCount, 'depthwise weight names');

  // ========== FIX 4: Fix Rescaling layer (Keras 3 uses Rescaling, TF.js may not support it) ==========
  // Check if there's a Rescaling layer and handle it
  const rescalingLayer = layers.find(l => l.class_name === 'Rescaling');
  if (rescalingLayer) {
    console.log('  Found Rescaling layer:', rescalingLayer.name, 'scale:', rescalingLayer.config.scale);
    // TF.js doesn't have a built-in Rescaling layer, but some versions do
    // We'll keep it and register it on the client side if needed
  }

  fs.writeFileSync(filePath, JSON.stringify(modelJson), 'utf8');
  console.log('  Done! File saved.');
}

const paths = [
  'C:\\Users\\DOMINION\\Desktop\\FMN agrisense folder\\fmn-agrisense\\public\\cassava_tfjs_model\\model.json',
  'C:\\Users\\DOMINION\\Desktop\\FMN agrisense folder\\fmn patched\\fmn-agrisense\\public\\cassava_tfjs_model\\model.json'
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    fixKeras3ToTFJS(p);
  } else {
    console.log('File not found:', p);
  }
}
