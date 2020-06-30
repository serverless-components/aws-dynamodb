const { mergeDeepRight, pick } = require('ramda')
const AWS = require('aws-sdk')
const { Component } = require('@serverless/core')
const { log, createTable, deleteTable, describeTable, updateTable } = require('./utils')

const outputsList = ['name', 'arn', 'region']

const defaults = {
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
  globalSecondaryIndexes: [],
  localSecondaryIndexes: [],
  name: null,
  region: 'us-east-1',
  deletionPolicy: 'delete'
}

class AwsDynamoDb extends Component {
  async deploy(inputs = {}) {
    // this error message assumes that the user is running via the CLI though...
    if (Object.keys(this.credentials.aws).length === 0) {
      const msg = 'Credentials not found. Make sure you have a .env file in the cwd. - Docs: https://git.io/JvArp'
      throw new Error(msg)
    }

    const config = mergeDeepRight(defaults, inputs)
    config.name = config.name || this.name

    // If first deploy and no name is found, set default name..
    if (!config.name && !this.state.name) {
      config.name =
        `dynamodb-table-${ 
        Math.random()
          .toString(36)
          .substring(6)}`
      this.state.name = config.name
    }
    // If first deploy, and a name is set...
    else if (config.name && !this.state.name) {
      this.state.name = config.name
    }
    // If subequent deploy, and name is different from a previously used name, throw error.
    else if (config.name && this.state.name && config.name !== this.state.name) {
      throw new Error(
        'You cannot change the name of your DynamoDB table once it has been deployed (or this will deploy a new table).  Please remove this Component Instance first by running "serverless remove", then redeploy it with "serverless deploy".'
      )
    }

    console.log(`Starting deployment of table ${config.name} in the ${config.region} region.`)

    const dynamodb = new AWS.DynamoDB({
      region: config.region,
      credentials: this.credentials.aws
    })

    console.log(`Checking if table ${config.name} already exists in the ${config.region} region.`)

    const prevTable = await describeTable({ dynamodb, name: config.name })

    if (!prevTable) {
      log(`Table ${config.name} does not exist. Creating...`)

      config.arn = await createTable({ dynamodb, ...config })
    } else {
      console.log(`Table ${config.name} already exists. Comparing config changes...`)

      // Check region
      if (config.region && this.state.region && config.region !== this.state.region) {
        throw new Error(
          'You cannot change the region of a DynamoDB Table.  Please remove it and redeploy in your desired region.'
        )
      }

      config.arn = prevTable.arn

      const prevGlobalSecondaryIndexes = prevTable.globalSecondaryIndexes || []
      await updateTable.call(this, { dynamodb, prevGlobalSecondaryIndexes, ...config })
    }

    log(`Table ${config.name} was successfully deployed to the ${config.region} region.`)

    this.state.arn = config.arn
    this.state.name = config.name
    this.state.region = config.region
    this.state.deletionPolicy = config.deletionPolicy

    const outputs = pick(outputsList, config)

    // Add indexes to outputs as objects, which are easier to reference as serverless variables
    if (config.globalSecondaryIndexes) {
      outputs.indexes = outputs.indexes || {}
      config.globalSecondaryIndexes.forEach((index) => {
        outputs.indexes[index.IndexName] = {
          name: index.IndexName,
          arn: `${outputs.arn}/index/${index.IndexName}`
        }
      })
    }

    if (config.localSecondaryIndexes) {
      outputs.indexes = outputs.indexes || {}
      config.localSecondaryIndexes.forEach((index) => {
        outputs.indexes[index.IndexName] = {
          name: index.IndexName,
          arn: `${outputs.arn}/index/${index.IndexName}`
        }
      })
    }

    return outputs
  }

  /**
   * Remove
   */
  async remove(inputs = {}) {
    console.log('Removing')

    // If "delete: false", don't delete the table, and warn instead
    if (this.state.deletionPolicy && this.state.deletionPolicy === 'retain') {
      console.log('Skipping table removal because "deletionPolicy" is set to "retain".')
      this.state = {}
      return {}
    }

    const { name, region } = this.state

    if (!name) {
      console.log('Aborting removal. Table name not found in state.')
      return
    }

    const dynamodb = new AWS.DynamoDB({
      region,
      credentials: this.credentials.aws
    })

    console.log(`Removing table ${name} from the ${region} region.`)

    await deleteTable({ dynamodb, name })

    const outputs = pick(outputsList, this.state)

    console.log(`Table ${name} was successfully removed from the ${region} region.`)

    this.state = {}
    return outputs
  }
}

module.exports = AwsDynamoDb
