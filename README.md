# Swagger Parser LanMock

基于[swagger-parser-mock](https://www.npmjs.com/package/swagger-parser-mock)实现的一个简单的 Swagger 文档解析器，支持生成演示数据与数据实体类

## Features

- 支持 OpenAPI Specification ([1.2](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/1.2.md) & [2.0](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md) & [3.X](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md))
- 支持为 Parameters 与 Responses 生成演示数据
- 支持根据 Schema 生成数据实体类（JavaScript/Objective-C）
- 支持生成传参数据

## API

### swaggerParserLanMock(url, opts)

- 参数说明见 [swagger-js](https://github.com/Languiyuan/swagger-parser-mock)

```js
const swaggerParserLanMock = require('swagger-parser-lanmock')
const specs = swaggerParserLanMock('http://petstore.swagger.io/v2/swagger.json')

specs.then(docs => {
  const api = docs.paths['/store/order']['post']
  const example = api.responses['200'].example
  console.log(JSON.parse(example))
  // =>
  /**
   * { id: '@integer(60, 100)',
   *   petId: '@integer(60, 100)',
   *   quantity: '@integer(60, 100)',
   *   shipDate: '@datetime',
   *   status: 'placed',
   *   complete: '@boolean' }
   */
})
```

### getJavaScriptEntities(schema)

```js
const swaggerParserLanMock = require('swagger-parser-lanmock')
const {
  getJavaScriptEntities,
  getObjectiveCEntities
} = require('swagger-parser-mock/lib/entity')
const specs = swaggerParserLanMock('http://petstore.swagger.io/v2/swagger.json')

specs.then(docs => {
  const api = docs.paths['/store/order']['post']
  const orderEntity = getJavaScriptEntities(api.responses['200'])[0]
  console.log(orderEntity)
  // =>
  /**
   * class Order {
   *   constructor() {
   *     this.id = 0;
   *     this.petId = 0;
   *     this.quantity = 0;
   *     this.shipDate = '';
   *     this.status = '';
   *     this.complete = false;
   *   }
   * }
   */
})
```

### getObjectiveCEntities(schema)

```js
// ...
specs.then(docs => {
  const api = docs.paths['/store/order']['post']
  const orderEntity = getObjectiveCEntities(api.responses['200'])[0]
  console.log(orderEntity)
  // =>
  /**
   * @interface Order : NSObject
   * @property (nonatomic, strong) NSNumber *id;
   * @property (nonatomic, strong) NSNumber *petId;
   * @property (nonatomic, strong) NSNumber *quantity;
   * @property (nonatomic, copy) NSString *shipDate;
   * @property (nonatomic, copy) NSString *status;
   * @property (nonatomic, assign) BOOL complete;
   * @end
   */
})
```

## License

MIT
