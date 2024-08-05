function isObject (obj) {
  return !!obj && typeof obj === 'object'
}

function objectify (thing) {
  if (!isObject(thing)) return {}
  return thing
}

function normalizeArray (arr) {
  if (Array.isArray(arr)) return arr
  return [arr]
}

function isFunc (thing) {
  return typeof (thing) === 'function'
}

function inferSchema (thing) {
  if (thing.schema) {
    thing = thing.schema
  }

  if (thing.properties) {
    thing.type = 'object'
  }

  return thing
}

function _get (object, path, defaultValue = undefined) {
  // 将路径字符串转换为路径数组
  const pathArray = path.split('.')

  // 遍历路径数组以获取深层属性
  let result = object
  for (let key of pathArray) {
    if (result && typeof result === 'object') {
      result = result[key]
    } else {
      result = undefined
      break
    }
  }

  // 返回结果或默认值
  return result !== undefined ? result : defaultValue
}

module.exports = {
  isObject: isObject,
  objectify: objectify,
  isFunc: isFunc,
  inferSchema: inferSchema,
  normalizeArray: normalizeArray,
  _get: _get
}
