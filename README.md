[![Serverless Components](https://s3.amazonaws.com/public.assets.serverless.com/images/readme_serverless_components.gif)](http://serverless.com)

<br/>

<p align="center">
  <b><a href="https://github.com/serverless-components/aws-dynamodb/tree/v1">Click Here for Version 1.0</a></b>
</p>

<br/>

**AWS DynamoDB Component** ⎯⎯⎯ The easiest way to deploy & manage AWS DynamoDB tables, powered by [Serverless Components](https://github.com/serverless/components/tree/cloud).

<br/>

- [x] **Minimal Configuration** - With built-in sane defaults.
- [x] **Fast Deployments** - Create & update tables in seconds.
- [x] **Team Collaboration** - Share your table outputs with your team's components.
- [x] **Easy Management** - Easily manage and monitor your tables with the Serverless Dashboard.

<br/>

Check out the **[Serverless Fullstack Application](https://github.com/serverless-components/fullstack-app)** for a ready-to-use boilerplate and overall great example of how to use this Component.

<br/>

<img src="/assets/deploy-demo.gif" height="250" align="right">

1. [**Install**](#1-install)
2. [**Initialize**](#2-initialize)
3. [**Deploy**](#3-deploy)
4. [**Configure**](#4-configure)
5. [**Develop**](#5-develop)
6. [**Monitor**](#6-monitor)
7. [**Remove**](#7-remove)

&nbsp;

### 1. Install

To get started with component, install the latest version of the Serverless Framework:

```
$ npm install -g serverless
```

After installation, make sure you connect your AWS account by setting a provider in the org setting page on the [Serverless Dashboard](https://app.serverless.com).

### 2. Initialize

The easiest way to start using the `aws-dynamodb` component is by initializing the `aws-dynamodb-starter` template. Just run this command:

```
$ serverless init aws-dynamodb-starter
$ cd aws-dynamodb-starter
```

### 3. Deploy

Once you have the directory set up, you're now ready to deploy. Just run the following command from within the directory containing the `serverless.yml` file:

```
$ serverless deploy
```

Your first deployment might take a little while, but subsequent deployment would just take few seconds. For more information on what's going on during deployment, you could specify the `--debug` flag, which would view deployment logs in realtime:

```
$ serverless deploy --debug
```

### 4. Configure

The `aws-dynamodb` component requires minimal configuration with built-in sane defaults. Here's a complete reference of the `serverless.yml` file for the `aws-dynamodb` component:

```yml
component: aws-dynamodb          # (required) name of the component. In that case, it's aws-dynamodb.
name: my-table                   # (required) name of your instance.
org: serverlessinc               # (optional) serverless dashboard org. default is the first org you created during signup.
app: myApp                       # (optional) serverless dashboard app. default is the same as the name property.
stage: dev                       # (optional) serverless dashboard stage. default is dev.

inputs:
  name: my-table
  attributeDefinitions:
    - AttributeName: id
      AttributeType: S
    - AttributeName: attribute1
      AttributeType: N
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
        ProjectionType: 'ALL'
  region: us-east-1
```

Once you've chosen your configuration, run `serverless deploy` again (or simply just `serverless`) to deploy your changes. Please keep in mind that `localSecondaryIndexes` cannot be updated after first deployment. This is an AWS limitation. Also note that this component exclusively uses the [Pay Per Request](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BillingModeSummary.html) pricing, which scales on demand like any serverless offering.

### 5. Develop

Instead of having to run `serverless deploy` everytime you make changes you wanna test, you could enable dev mode, which allows the CLI to watch for changes in your configuration file, and deploy instantly on save.

To enable dev mode, just run the following command:

```
$ serverless dev
```

### 6. Monitor

Anytime you need to know more about your running `aws-dynamodb` instance, you can run the following command to view the most critical info.

```
$ serverless info
```

This is especially helpful when you want to know the outputs of your instances so that you can reference them in another instance. It also shows you the status of your instance, when it was last deployed, and how many times it was deployed. You will also see a url where you'll be able to view more info about your instance on the Serverless Dashboard.

To digg even deeper, you can pass the `--debug` flag to view the state of your component instance in case the deployment failed for any reason.

```
$ serverless info --debug
```

### 7. Remove

If you wanna tear down your entire `aws-dynamodb` infrastructure that was created during deployment, just run the following command in the directory containing the `serverless.yml` file.

```
$ serverless remove
```

The `aws-dynamodb` component will then use all the data it needs from the built-in state storage system to delete only the relavent cloud resources that it created. Just like deployment, you could also specify a `--debug` flag for realtime logs from the website component running in the cloud.

```
$ serverless remove --debug
```
