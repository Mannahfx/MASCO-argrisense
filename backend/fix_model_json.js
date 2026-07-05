import fs from 'fs';
import path from 'path';

function extractKerasHistory(arg) {
  if (!arg) return [];
  if (Array.isArray(arg)) {
    return arg.flatMap(extractKerasHistory);
  }
  if (typeof arg === 'object') {
    if (arg.class_name === '__keras_tensor__' && arg.config && arg.config.keras_history) {
      const hist = arg.config.keras_history; // [layer_name, node_index, tensor_index]
      return [[hist[0], hist[1], hist[2], {}]];
    }
    // Search recursively in object properties
    return Object.values(arg).flatMap(extractKerasHistory);
  }
  return [];
}

function fixModelJson(filePath) {
  console.log(`Processing file: ${filePath}`);
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const modelJson = JSON.parse(fileContent);

    if (!modelJson.modelTopology || !modelJson.modelTopology.model_config || !modelJson.modelTopology.model_config.config || !modelJson.modelTopology.model_config.config.layers) {
      console.log('JSON structure does not match expected Keras model topology.');
      return;
    }

    const layers = modelJson.modelTopology.model_config.config.layers;
    let fixedCount = 0;

    for (const layer of layers) {
      if (layer.inbound_nodes) {
        let needsFix = false;
        
        // Check if any inbound_node in the array is not an array
        for (const node of layer.inbound_nodes) {
          if (!Array.isArray(node)) {
            needsFix = true;
            break;
          }
        }

        if (needsFix) {
          layer.inbound_nodes = layer.inbound_nodes.map(node => {
            if (Array.isArray(node)) {
              return node;
            }
            return extractKerasHistory(node);
          });
          fixedCount++;
        }
      }
    }

    if (fixedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(modelJson, null, 2), 'utf8');
      console.log(`Successfully fixed ${fixedCount} layers in ${filePath}`);
    } else {
      console.log(`No fixes needed for ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Fix both directories
const paths = [
  'C:\\Users\\DOMINION\\Desktop\\FMN agrisense folder\\fmn-agrisense\\public\\cassava_tfjs_model\\model.json',
  'C:\\Users\\DOMINION\\Desktop\\FMN agrisense folder\\fmn patched\\fmn-agrisense\\public\\cassava_tfjs_model\\model.json'
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    fixModelJson(p);
  } else {
    console.log(`File not found: ${p}`);
  }
}
