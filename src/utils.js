'use strict';

const { isEmpty } = require('ramda');

function log(msg) {
  return console.log(msg);
}

async function createTable({
  dynamodb,
  name,
  attributeDefinitions,
  keySchema,
  globalSecondaryIndexes,
  localSecondaryIndexes,
}) {
  const res = await dynamodb
    .createTable({
      TableName: name,
      AttributeDefinitions: attributeDefinitions,
      KeySchema: keySchema,
      GlobalSecondaryIndexes: globalSecondaryIndexes.length ? globalSecondaryIndexes : undefined,
      LocalSecondaryIndexes: localSecondaryIndexes.length ? localSecondaryIndexes : undefined,
      BillingMode: 'PAY_PER_REQUEST',
    })
    .promise();
  return res.TableDescription.TableArn;
}

async function describeTable({ dynamodb, name }) {
  try {
    const data = await dynamodb.describeTable({ TableName: name }).promise();
    return {
      arn: data.Table.TableArn,
      name: data.Table.TableName,
      attributeDefinitions: data.Table.AttributeDefinitions,
      keySchema: data.Table.KeySchema,
      globalSecondaryIndexes: data.Table.GlobalSecondaryIndexes,
    };
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      return null;
    }
  }
  return null;
}

async function updateTable({
  dynamodb,
  prevGlobalSecondaryIndexes,
  globalSecondaryIndexes,
  name,
  attributeDefinitions,
}) {
  // find a globalSecondaryIndex that is not in any previous globalSecondaryIndex
  const toCreate = globalSecondaryIndexes.filter(
    (globalSecondardyIndex) =>
      prevGlobalSecondaryIndexes.findIndex(
        (element) => element.IndexName === globalSecondardyIndex.IndexName
      ) === -1
  );

  // If previous globalSecondaryIndex has an item that is not now present, then delete
  const toDelete = prevGlobalSecondaryIndexes
    .filter(
      (prevGlobalSecondaryIndex) =>
        globalSecondaryIndexes.findIndex(
          (element) => element.IndexName === prevGlobalSecondaryIndex.IndexName
        ) === -1
    )
    .map(({ IndexName }) => ({ IndexName }));

  // Only take the first item since only one delete and create can be done at a time
  const indexUpdates = {};
  if (toCreate.length) {
    indexUpdates.Create = toCreate[0];
    if (toCreate.length > 1) {
      console.log(
        `Only ${toCreate[0].IndexName} will be created since a limitation of Dynamodb is that only one Gloabl secondary index can be created during an upate.
          Run this operation after the index has been created on AWS to create the additional indexes`
      );
    }
  }
  if (toDelete.length) {
    indexUpdates.Delete = toDelete[0];
    if (toDelete.length > 1) {
      console.log(
        `Only ${toDelete[0].IndexName} will be deleted since a limitation of Dynamodb is that only one Gloabl secondary index can be deleted during an upate.
          Run this operation after the index has been deleted on AWS to delete the additional indexes`
      );
    }
  }
  const res = await dynamodb
    .updateTable({
      TableName: name,
      AttributeDefinitions: attributeDefinitions,
      BillingMode: 'PAY_PER_REQUEST',
      GlobalSecondaryIndexUpdates: !isEmpty(indexUpdates) ? [indexUpdates] : undefined,
    })
    .promise();

  return res.TableDescription.TableArn;
}

async function deleteTable({ dynamodb, name }) {
  let res = false;
  try {
    res = await dynamodb
      .deleteTable({
        TableName: name,
      })
      .promise();
  } catch (error) {
    console.log('AWS remove error', error);
    if (error.code !== 'ResourceNotFoundException') {
      throw error;
    }
  }
  return !!res;
}

async function updateTimeToLive({dynamodb, name, timeToLiveSpecification= {}}) {
  return await dynamodb.waitFor('tableExists', { TableName: name}, async function(err, data) {
    if (err) throw err;
    return await dynamodb
      .updateTimeToLive({
        TableName: name,
        TimeToLiveSpecification: {
          AttributeName: timeToLiveSpecification.AttributeName,
          Enabled: timeToLiveSpecification.Enabled,
        }
      }).promise();
  }).promise();
}

module.exports = {
  log,
  createTable,
  describeTable,
  updateTable,
  deleteTable,
  updateTimeToLive,
};
