# AWS Iam Role

Easily provision AWS DynamoDB tables using [Serverless Components](https://github.com/serverless/components).

&nbsp;

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)

&nbsp;


### 1. Install

```shell
$ npm install -g @serverless/components
```

### 2. Create

Just create a `serverless.yml` file

```shell
$ touch serverless.yml
```


### 3. Configure

```yml
# serverless.yml

name: my-app

myTable:
  component: "@serverless/aws-dynamodb"
  inputs:
    name: myTable
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

### 4. Deploy

```shell
table (master)$ components

  myTable › outputs:
  name:  'myTable'
  arn:  'arn:aws:dynamodb:us-east-1:552760238299:table/myTable'


  5s › dev › my-app › done

table (master)$
```

&nbsp;

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.

