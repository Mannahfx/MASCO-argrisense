const CLASS_MAP = { 0:'cbb', 1:'cbsd', 2:'cgm', 3:'cmd', 4:'healthy' }
let _model = null

export async function loadModel() {
  if (_model) return _model
  
  const tf = window.tf
  if (tf) {
    try {
      class HardSilu extends tf.serialization.Serializable {
        static get className() { return 'hardSilu' }
        apply(x) {
          return tf.tidy(() => x.mul(tf.clipByValue(x.add(3), 0, 6)).div(6))
        }
        getConfig() { return {} }
      }
      tf.serialization.registerClass(HardSilu)
    } catch (e) {
      console.log('hardSilu registration skipped/already registered:', e)
    }

    try {
      class PatchedGlobalAveragePooling2D extends tf.layers.Layer {
        static get className() { return 'GlobalAveragePooling2D' }
        constructor(config) {
          super(config || {})
          this.keepdims = config.keepdims === true
          this.dataFormat = config.data_format || 'channels_last'
        }
        computeOutputShape(inputShape) {
          if (this.keepdims) {
            return [inputShape[0], 1, 1, inputShape[3]]
          }
          return [inputShape[0], inputShape[3]]
        }
        call(inputs, kwargs) {
          return tf.tidy(() => {
            const input = Array.isArray(inputs) ? inputs[0] : inputs
            const axes = this.dataFormat === 'channels_last' ? [1, 2] : [2, 3]
            return input.mean(axes, this.keepdims)
          })
        }
        getConfig() {
          const config = super.getConfig()
          config.keepdims = this.keepdims
          config.data_format = this.dataFormat
          return config
        }
      }
      tf.serialization.registerClass(PatchedGlobalAveragePooling2D)
    } catch (e) {
      console.log('GlobalAveragePooling2D registration skipped/error:', e)
    }

    try {
      class HardSigmoidLayer extends tf.layers.Layer {
        static get className() { return 'HardSigmoidLayer' }
        constructor(config) {
          super(config || {})
        }
        computeOutputShape(inputShape) { return inputShape }
        call(inputs, kwargs) {
          return tf.tidy(() => {
            const x = Array.isArray(inputs) ? inputs[0] : inputs
            return tf.clipByValue(tf.div(tf.add(x, 3), 6), 0, 1)
          })
        }
        getConfig() { return super.getConfig() }
      }
      tf.serialization.registerClass(HardSigmoidLayer)
    } catch (e) {
      console.log('HardSigmoidLayer registration skipped/error:', e)
    }

    try {
      class Rescaling extends tf.layers.Layer {
        static get className() { return 'Rescaling' }
        constructor(config) {
          super(config || {})
          this.scale = config.scale || 1
          this.offset = config.offset || 0
        }
        computeOutputShape(inputShape) { return inputShape }
        call(inputs, kwargs) {
          return tf.tidy(() => {
            const x = Array.isArray(inputs) ? inputs[0] : inputs
            return x.mul(this.scale).add(this.offset)
          })
        }
        getConfig() {
          const config = super.getConfig()
          config.scale = this.scale
          config.offset = this.offset
          return config
        }
      }
      tf.serialization.registerClass(Rescaling)
    } catch (e) {
      console.log('Rescaling registration skipped/error:', e)
    }
  }

  _model = await window.tf.loadLayersModel('/cassava_tfjs_model/model.json', { strict: false })
  return _model
}

export async function runAI(file) {
  const tf = window.tf
  const model = await loadModel()
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 224; canvas.height = 224
        canvas.getContext('2d').drawImage(img, 0, 0, 224, 224)
        const tensor = tf.browser.fromPixels(canvas).toFloat().expandDims(0)
        const out = model.predict(tensor)
        const scores = Array.from(out.dataSync())
        tensor.dispose()
        out.dispose()
        URL.revokeObjectURL(img.src)
        const top = scores.indexOf(Math.max(...scores))
        resolve({
          diseaseId: CLASS_MAP[top] || 'healthy',
          confidence: Math.round(scores[top] * 100),
          scores,
          allScores: Object.fromEntries(Object.entries(CLASS_MAP).map(([i,id])=>[id, Math.round(scores[i]*100)]))
        })
      } catch(e) { reject(e) }
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
