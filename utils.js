const { not, equals, pick, isEmpty } = require('ramda')

async function createTable({
  dynamodb,
  name,
  attributeDefinitions,
  keySchema,
  globalSecondaryIndexes,
  localSecondaryIndexes
}) {
  const res = await dynamodb
    .createTable({
      TableName: name,
      AttributeDefinitions: attributeDefinitions,
      KeySchema: keySchema,
      GlobalSecondaryIndexes: globalSecondaryIndexes.length ? globalSecondaryIndexes : undefined,
      LocalSecondaryIndexes: localSecondaryIndexes,
      BillingMode: 'PAY_PER_REQUEST'
    })
    .promise()
  return res.TableDescription.TableArn
}

async function describeTable({ dynamodb, name }) {
  let res

  try {
    const data = await dynamodb.describeTable({ TableName: name }).promise()
    res = {
      arn: data.Table.TableArn,
      name: data.Table.TableName,
      attributeDefinitions: data.Table.AttributeDefinitions,
      keySchema: data.Table.KeySchema,
      globalSecondaryIndexes: data.Table.GlobalSecondaryIndexes
    }
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      res = null
    }
  } finally {
    return res
  }
}

async function updateTable({
  dynamodb,
  prevGlobalSecondaryIndexes,
  globalSecondaryIndexes,
  name,
  attributeDefinitions
}) {
  // find a globalSecondaryIndex that is not in any previous globalSecondaryIndex
  const toCreate = globalSecondaryIndexes.filter(
    (globalSecondaryIndex) =>
      prevGlobalSecondaryIndexes.findIndex(
        (element) => element.IndexName === globalSecondaryIndex.IndexName
      ) === -1
  )

  // If previous globalSecondaryIndex has an item that is not now present, then delete
  const toDelete = prevGlobalSecondaryIndexes
    .filter(
      (prevGlobalSecondaryIndex) =>
        globalSecondaryIndexes.findIndex(
          (element) => element.IndexName === prevGlobalSecondaryIndex.IndexName
        ) === -1
    )
    .map(({ IndexName }) => ({ IndexName }))

  // Only take the first item since only one delete and create can be done at a time
  const indexUpdates = {}
  if (toCreate.length) {
    indexUpdates.Create = toCreate[0]
    if (toCreate.length > 1) {
      this.context.debug(
        `Only ${toCreate[0].IndexName} will be created since a limitation of Dynamodb is that only one Gloabl secondary index can be created during an upate.
        Run this operation after the index has been created on AWS to create the additional indexes`
      )
    }
  }
  if (toDelete.length) {
    indexUpdates.Delete = toDelete[0]
    if (toDelete.length > 1) {
      this.context.debug(
        `Only ${toDelete[0].IndexName} will be deleted since a limitation of Dynamodb is that only one Gloabl secondary index can be deleted during an upate.
        Run this operation after the index has been deleted on AWS to delete the additional indexes`
      )
    }
  }

  const res = await dynamodb
    .updateTable({
      TableName: name,
      AttributeDefinitions: attributeDefinitions,
      BillingMode: 'PAY_PER_REQUEST',
      GlobalSecondaryIndexUpdates: !isEmpty(indexUpdates) ? [indexUpdates] : undefined
    })
    .promise()

  return res.TableDescription.TableArn
}

async function deleteTable({ dynamodb, name }) {
  let res = false
  try {
    res = await dynamodb
      .deleteTable({
        TableName: name
      })
      .promise()
  } catch (error) {
    if (error.code !== 'ResourceNotFoundException') {
      throw error
    }
  }
  return !!res
}

function configChanged(prevTable, table) {
  const prevInputs = pick(['name', 'attributeDefinitions', 'globalSecondaryIndexes'], prevTable)
  const inputs = pick(['name', 'attributeDefinitions', 'globalSecondaryIndexes'], table)

  return not(equals(inputs, prevInputs))
}

module.exports = {
  createTable,
  describeTable,
  updateTable,
  deleteTable,
  configChanged
}
