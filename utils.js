const { not, equals, pick } = require('ramda')

const validate = {
  stream: (inputs) => {
    if (!inputs.streamViewType) {
      return
    }

    const validStreamTypes = ['NEW_IMAGE', 'OLD_IMAGE', 'NEW_AND_OLD_IMAGES', 'KEYS_ONLY']
    if (!validStreamTypes.includes(inputs.streamViewType)) {
      throw Error(`${inputs.streamViewType} is not a valid streamViewType.`)
    }
  },

  streamViewType: (comp, previousTable, inputs) => {
    if (!previousTable.streamArn || !inputs.streamViewType) {
      return
    }

    if (comp.state.stream && inputs.stream && comp.state.streamViewType !== inputs.streamViewType) {
      throw Error(`You cannot change the view type of an existing DynamoDB stream.`)
    }
  }
}

async function createTable({ dynamodb, name, attributeDefinitions, keySchema, stream, streamViewType = false }) {
  const res = await dynamodb
    .createTable({
      TableName: name,
      AttributeDefinitions: attributeDefinitions,
      KeySchema: keySchema,
      BillingMode: 'PAY_PER_REQUEST',
      ...(stream && {
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: streamViewType
        }
      })
    })
    .promise()
  return {
    tableArn: res.TableDescription.TableArn,
    streamArn: res.TableDescription.LatestStreamArn || false
  }
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
      streamArn: data.Table.LatestStreamArn,
      streamEnabled: data.Table.StreamSpecification 
        ? data.Table.StreamSpecification.StreamEnabled 
        : false,
      streamViewType: data.Table.StreamSpecification 
        ? data.Table.StreamSpecification.StreamViewType
        : false
    }
  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      res = null
    }
  } finally {
    return res
  }
}

async function updateTable({prevTable, dynamodb, name, attributeDefinitions, stream, streamViewType }) {
  const enableStream = prevTable.streamArn && !stream
        ? false
        : true

  const res = await dynamodb
    .updateTable({
      TableName: name,
      AttributeDefinitions: attributeDefinitions,
      BillingMode: 'PAY_PER_REQUEST',
      StreamSpecification: {
        ...(enableStream
          ? {
              StreamEnabled: true,
              StreamViewType: streamViewType
            }
          : {
              StreamEnabled: false
            })
      }
    })
    .promise()

  return {
    tableArn: res.TableDescription.TableArn,
    streamArn: res.TableDescription.LatestStreamArn || false
  }
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
  const prevInputs = pick(['name', 'attributeDefinitions', 'streamArn', 'streamViewType', 'streamEnabled'], prevTable)
  const inputs = pick(['name', 'attributeDefinitions', 'streamArn', 'streamViewType', 'streamEnabled'], table)

  return not(equals(inputs, prevInputs))
}

async function getStreamArn ({dynamodb, name, config}) {
  if (!config.streamEnabled) {
    return false
  }

  const maxTries = 5
  let tries = 0

  const getStreamArn = async () => { 
    if (tries > maxTries) {
      throw Error(`There was a problem getting the arn for your DynamoDB stream. Please try again.`)
    }

    const {streamArn } = await describeTable({ dynamodb, name})
    if (!streamArn && tries <= maxTries) {
        tries++
        const sleep = ms => new Promise(r => setTimeout(r,ms))
        await sleep(3000)
        return await getStreamArn()
    }
    return streamArn
  }

  return await getStreamArn()
}

module.exports = {
  createTable,
  describeTable,
  updateTable,
  deleteTable,
  configChanged,
  validate,
  getStreamArn
}
