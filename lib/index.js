var URL = require('url')
var memoizee = require('memoizee')
var swagger = require('swagger-client')
var swaggerTools = require('swagger-tools').specs.v1

var utils = require('./utils')
var primitives = require('./primitives')

function primitive (schema) {
  schema = utils.objectify(schema)

  var type = schema.type
  var format = schema.format
  var value = primitives[type + '_' + format] || primitives[type]

  if (typeof schema.example === 'undefined') {
    return value || 'Unknown Type: ' + schema.type
  }

  return schema.example
}

// 用来实现响应参数 获取$ref 和example
function sampleFromSchema (schema) {
  schema = utils.objectify(schema)

  var type = schema.type
  var properties = schema.properties
  var additionalProperties = schema.additionalProperties
  var items = schema.items
  // 确定类型
  if (!type) {
    if (properties) {
      type = 'object'
    } else if (items) {
      type = 'array'
    } else {
      return
    }
  }

  if (type === 'object') {
    var props = utils.objectify(properties)
    var obj = {}
    for (var name in props) {
      // hik 规范
      if (name === 'code') {
        obj.code = '0'
      } else {
        obj[name] = sampleFromSchema(props[name])
      }
    }

    if (additionalProperties === true) {
      obj.additionalProp1 = {}
    } else if (additionalProperties) {
      var additionalProps = utils.objectify(additionalProperties)
      var additionalPropVal = sampleFromSchema(additionalProps)

      for (var i = 1; i < 4; i++) {
        obj['additionalProp' + i] = additionalPropVal
      }
    }
    return obj
  }

  if (type === 'array') {
    return [sampleFromSchema(items)]
  }
  // ? what's meaning
  if (schema['enum']) {
    if (schema['default']) return schema['default']
    return utils.normalizeArray(schema['enum'])[0]
  }

  if (type === 'file') {
    return
  }

  return primitive(schema)
}

var memoizedSampleFromSchema = memoizee(sampleFromSchema)

function getSampleSchema (schema) {
  return JSON.stringify(memoizedSampleFromSchema(schema), null, 2)
}

/**
 * 处理 1.x 文档中，array 类型下 items.type 无法解析 model 的问题
 *
 * { a: { type: 'array', items: { type: 'Pet' } }, models: { Pet: {} } }
 * =>
 * { a: { type: 'array', items: { $ref: 'Pet' } }, models: { Pet: {} } }
 *
 * @param {*} obj
 * @param {*} models
 */
function renameTypeKey (obj, models) {
  models = models || {}
  if (!obj || (obj && typeof obj !== 'object')) return
  Object.keys(obj).forEach((key) => {
    const value = obj[key]
    if (value && typeof value === 'object') {
      renameTypeKey(value, models)
    }

    if (
      key === 'type' &&
      value === 'array' &&
      obj.items &&
      obj.items.type &&
      models[obj.items.type]
    ) {
      obj.items.$ref = obj.items.type
      delete obj.items.type
    }
  })
}

// 获取接口参数
/*
 * @params {api} obj 单个接口
 * return ParamsMap {
 *    bodyParamsType: string;
 *    bodyParams: Params[];
 *    queryParams: Params[];
 *  }
 */
/**
 * @description: parse api params
 * @param {*} api obj 单个接口
 * @param {*} version swagger version
 * @return {*} params
 */
function getApiParams (api, version) {
  const res = {
    bodyParamsType: 'object', // default type
    bodyParams: [],
    queryParams: []
  }

  if (version === 'v2') {
    api.parameters && api.parameters.forEach((item) => {
      if (item.in === 'body') {
        if (utils._get(item, 'schema.type') === 'array') {
          res.bodyParamsType = 'array'
        } else if (utils._get(item, 'schema.type') === 'object') {
          const properties = utils._get(item, 'schema.properties', {})
          for (let key in properties) {
            res.bodyParams.push({
              name: key,
              type: [
                properties[key].type.includes('int')
                  ? 'number'
                  : properties[key].type
              ],
              required: false
            })
          }
        }
      }
      if (item.in === 'query') {
        res.queryParams.push({
          name: item.name,
          type: [item.type.includes('int') ? 'number' : item.type],
          requierd: item.requierd
        })
      }
    })
  }

  if (version === 'v3') {
    // parse query
    if (api.hasOwnProperty('parameters') && api.parameters.length) {
      api.parameters.forEach((item) => {
        res.queryParams.push({
          name: item.name,
          type: [item.schema.type],
          required: item.required
        })
      })
    }

    // parse body
    const content = utils._get(api, 'requestBody?.content')
    if (content) {
      const [contentType] = Object.keys(content)
      const bodyData = utils._get(content, `${contentType}.schema`, {})
      if (bodyData.type === 'array') {
        res.bodyParamsType = 'array'
      } else if (bodyData.type === 'object') {
        const properties = bodyData.properties

        for (let key in properties) {
          res.bodyParams.push({
            name: key,
            type: [
              properties[key].type.includes('int')
                ? 'number'
                : properties[key].type
            ],
            required: bodyData.required.includes(key)
          })
        }
      }
    }

    // if (api?.requestBody?.content?.["application/json"]?.schema) {
    //   const bodyData = api?.requestBody?.content?.["application/json"]?.schema;
    //   if (bodyData.type === "array") {
    //     res.bodyParamsType = "array";
    //   } else if (bodyData.type === "object") {
    //     const properties = bodyData.properties;

    //     for (let key in properties) {
    //       res.bodyParams.push({
    //         name: key,
    //         type: [
    //           properties[key].type.includes("int")
    //             ? "number"
    //             : properties[key].type,
    //         ],
    //         required: bodyData.required.includes(key),
    //       });
    //     }
    //   }
    // }

    // if (api?.requestBody?.content?.["*/*"]?.schema) {
    //   const bodyData = api?.requestBody?.content?.["*/*"]?.schema;
    //   if (bodyData.type === "array") {
    //     res.bodyParamsType = "array";
    //   } else if (bodyData.type === "object") {
    //     const properties = bodyData.properties;

    //     for (let key in properties) {
    //       properties[key];
    //       res.bodyParams.push({
    //         name: key,
    //         type: [
    //           properties[key].type.includes("int")
    //             ? "number"
    //             : properties[key].type,
    //         ],
    //         required: bodyData.required.includes(key),
    //       });
    //     }
    //   }
    // }
  }

  return res
}

var parser = (module.exports = function (url, opts) {
  opts = opts || {}

  if (typeof url === 'string') {
    opts.url = url
  } else {
    opts = url
  }

  return swagger(opts).then(function (res) {
    var spec = res.spec
    // feat: 支持所有3版本
    var isOAS3 = spec.openapi && /^3\./.test(spec.openapi)
    if (spec.swaggerVersion) {
      // v1
      var paths = spec.apis.map(function (api) {
        var baseUrl = res.url
        if (!/\.json$/.test(baseUrl)) {
          baseUrl += '/'
        }
        opts.url = URL.resolve(baseUrl, api.path.replace(/^\//, ''))
        return swagger(opts)
      })
      return Promise.all(paths).then(function (apis) {
        var specs = apis.map(function (o) {
          return o.spec
        })
        return new Promise(function (resolve, reject) {
          for (let spec of specs) {
            renameTypeKey(spec, spec.models)
          }
          swaggerTools.convert(spec, specs, true, function (error, docs) {
            if (error) return reject(error)
            resolve(parser({ spec: docs }))
          })
        })
      })
    } else {
      for (var path in spec.paths) {
        for (var method in spec.paths[path]) {
          var api = spec.paths[path][method]
          // 获取参数
          try {
            const params = getApiParams(api, isOAS3 ? 'v3' : 'v2')
            api.params = params
          } catch (error) {}

          var schema
          for (var code in api.responses) {
            var response = api.responses[code]
            if (isOAS3) {
              try {
                const keys = Object.keys(response.content)
                schema =
                  response.content &&
                  response.content[keys[0]] &&
                  utils.inferSchema(response.content[keys[0]])
              } catch (error) {
                schema = null
              }
              response.example = schema ? getSampleSchema(schema) : null
            } else {
              schema = utils.inferSchema(response)
              response.example = schema ? getSampleSchema(schema) : null
            }
          }
          if (!api.parameters) continue
          for (var parameter of api.parameters) {
            schema = utils.inferSchema(parameter)
            parameter.example = schema ? getSampleSchema(schema) : null
          }
        }
      }
    }
    return spec
  })
})
