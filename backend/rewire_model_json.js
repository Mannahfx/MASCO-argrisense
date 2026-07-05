import fs from 'fs';

function rewireModelJson(filePath) {
  console.log(`Rewiring model layers in: ${filePath}`);
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const modelJson = JSON.parse(fileContent);

    if (!modelJson.modelTopology || !modelJson.modelTopology.model_config || !modelJson.modelTopology.model_config.config || !modelJson.modelTopology.model_config.config.layers) {
      console.log('JSON structure does not match expected Keras model topology.');
      return;
    }

    const layers = modelJson.modelTopology.model_config.config.layers;
    const layersToRemove = new Set();

    // The 9 multiply layers are: 'multiply' and 'multiply_1' through 'multiply_8'
    const multiplyLayerNames = ['multiply', 'multiply_1', 'multiply_2', 'multiply_3', 'multiply_4', 'multiply_5', 'multiply_6', 'multiply_7', 'multiply_8'];

    for (const multName of multiplyLayerNames) {
      const multiplyLayer = layers.find(l => l.name === multName);
      if (!multiplyLayer) {
        console.log(`Warning: Multiply layer ${multName} not found.`);
        continue;
      }

      // The input of multiply is the intermediate ReLU layer
      const reluName = multiplyLayer.inbound_nodes[0][0][0];
      const reluLayer = layers.find(l => l.name === reluName);
      if (!reluLayer) {
        console.log(`Warning: ReLU layer ${reluName} not found.`);
        continue;
      }

      // The input of ReLU is the add layer
      const addName = reluLayer.inbound_nodes[0][0][0];
      const addLayer = layers.find(l => l.name === addName);
      if (!addLayer) {
        console.log(`Warning: Add layer ${addName} not found.`);
        continue;
      }

      // The input of add is the Conv2D layer
      const convName = addLayer.inbound_nodes[0][0][0];
      console.log(`Rewiring ${multName} -> direct input from ${convName} (bypassing ${addName} and ${reluName})`);

      // Update multiply layer config
      multiplyLayer.class_name = 'HardSigmoidLayer';
      multiplyLayer.inbound_nodes = [[ [convName, 0, 0, {}] ]];
      // Clear out unused config fields from Multiply layer that might conflict with custom layer
      multiplyLayer.config = {
        name: multName,
        trainable: false,
        dtype: multiplyLayer.dtype
      };

      // Mark add and relu layers for removal
      layersToRemove.add(addName);
      layersToRemove.add(reluName);
    }

    // Filter out the deleted layers
    const originalCount = layers.length;
    modelJson.modelTopology.model_config.config.layers = layers.filter(l => !layersToRemove.has(l.name));
    const newCount = modelJson.modelTopology.model_config.config.layers.length;

    fs.writeFileSync(filePath, JSON.stringify(modelJson, null, 2), 'utf8');
    console.log(`Successfully rewired layers. Removed ${originalCount - newCount} intermediate layers (from ${originalCount} to ${newCount}).`);

  } catch (error) {
    console.error(`Error rewiring ${filePath}:`, error);
  }
}

// Rewire both directories
const paths = [
  'C:\\Users\\DOMINION\\Desktop\\FMN agrisense folder\\fmn-agrisense\\public\\cassava_tfjs_model\\model.json',
  'C:\\Users\\DOMINION\\Desktop\\FMN agrisense folder\\fmn patched\\fmn-agrisense\\public\\cassava_tfjs_model\\model.json'
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    rewireModelJson(p);
  } else {
    console.log(`File not found: ${p}`);
  }
}
