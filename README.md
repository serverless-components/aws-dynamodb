# AwsDynamoDb

A serverless component that provisions a DynamoDB table.

## Usage

### Declarative

```yml

name: my-aws-table
stage: dev

AwsDynamoDb@0.1.1::my-table:
  name: my-table
  attributeDefinitions:
    - AttributeName: id
      AttributeType: S
  keySchema:
    - AttributeName: id
      KeyType: HASH
  provisionedThroughput:
    ReadCapacityUnits: 1
    WriteCapacityUnits: 1
  region: us-east-1
```

### Programatic

```js
npm i --save @serverless/aws-dynamodb
```

```js

const table = await this.load('@serverless/aws-dynamodb')

const inputs = {
  name: 'my-table',
  attributeDefinitions: [
    {
      AttributeName: 'id',
      AttributeType: 'S'
    }
  ],
  keySchema: [
    {
      AttributeName: 'id',
      KeyType: 'HASH'
    }
  ],
  provisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  },
  region: 'us-east-1'
}

await table(inputs)

```

```
