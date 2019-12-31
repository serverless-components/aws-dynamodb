# aws-dynamodb

Easily provision AWS DynamoDB tables using [Serverless Components](https://github.com/serverless/components).

&nbsp;

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)

&nbsp;

### 1. Install

```shell
$ npm install -g serverless
```

### 2. Create

Just create a `serverless.yml` file

```shell
$ touch serverless.yml
$ touch .env      # your AWS api keys
```

```
# .env
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```

### 3. Configure

```yml
# serverless.yml

myTable:
  component: '@serverless/aws-dynamodb'
  inputs:
    name: nameOfTable # optional
    attributeDefinitions:
      - AttributeName: id
        AttributeType: S
    keySchema:
      - AttributeName: id
        KeyType: HASH
    region: us-east-1
```

With globalSecondaryIndexes and/or localSecondaryIndexes

```yml
# serverless.yml

myTable:
  component: '@serverless/aws-dynamodb'
  inputs:
    name: nameOfTable # optional
    attributeDefinitions:
      - AttributeName: id
        AttributeType: S
      - AttributeName: attribute1
        AttributeType: N
      - AttributeName: attribute2
        AttributeType: S
    keySchema:
      - AttributeName: id
        KeyType: HASH
      - AttributeName: attribute1
        KeyType: RANGE
    localSecondaryIndexes:
      - IndexName: 'myLocalSecondaryIndex'
        KeySchema:
         - AttributeName: id
           KeyType: HASH
         - AttributeName: attribute2
           KeyType: RANGE
        Projection:
           ProjectionType: 'KEYS_ONLY'
    globalSecondaryIndexes:
      - IndexName: 'myGlobalSecondaryIndex'
        KeySchema:
         - AttributeName: attribute2
           KeyType: HASH
        Projection:
           ProjectionType: 'KEYS_ONLY'
    region: us-east-1
```

The following applies to indexes:

 1. LocalIndexes can only be created upon table creation. There is no way to update them and/or create them other than at table creation.
 2. GlobalSecondaryIndexes can be created and removed during and after table creation. During an update, only one create and delete can happen at a time.
 3. This component uses [PAY_PER_REQUEST](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BillingModeSummary.html), which makes any throughput update redundant, including for GlobalSecondaryIndexes.

### 4. Deploy

```shell
$ serverless
```

&nbsp;

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
