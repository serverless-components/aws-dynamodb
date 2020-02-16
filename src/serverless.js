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
  name: false,
  region: 'us-east-1'
}

class AwsDynamoDb extends Component {
  async deploy(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)
    config.name = this.name

    // Throw error on domain change
    if (this.state.name && this.state.name !== config.name) {
      throw new Error(
        `Changing the name from ${this.state.name} to ${config.name} will delete your database.  Please remove it manually, change the name, then re-deploy.`
      )
    }

    // Throw error on region change
    if (this.state.region && this.state.region !== config.region) {
      throw new Error(
        `Changing the region from ${this.state.region} to ${config.region} will delete your database.  Please remove it manually, change the region, then re-deploy.`
      )
    }

    log(`Starting deployment of table ${config.name} in the ${config.region} region.`)

    const dynamodb = new AWS.DynamoDB({
      region: config.region,
      credentials: this.credentials.aws
    })

    console.log(
      `Checking if table ${config.name} already exists in the ${config.region} region.`
    )

    const prevTable = await describeTable({ dynamodb, name: config.name })

    if (!prevTable) {
      log(`Table ${config.name} does not exist. Creating...`)

      config.arn = await createTable({ dynamodb, ...config })
    } else {
      log(`Table ${config.name} already exists. Updating...`)
      const prevGlobalSecondaryIndexes = prevTable.globalSecondaryIndexes || []
      await updateTable.call(this, { dynamodb, prevGlobalSecondaryIndexes, ...config })
    }

    log(`Table ${config.name} was successfully deployed to the ${config.region} region.`)

    this.state.arn = config.arn
    this.state.name = config.name
    this.state.region = config.region
    this.state.delete = config.delete === false ? config.delete : true

    const outputs = pick(outputsList, config)
    return outputs
  }

  async remove(inputs = {}) {
    console.log('Removing')

    // If "delete: false", don't delete the table, and warn instead
    if (this.state.delete === false) {
      console.log(`Skipping table removal because "delete" is set to "false".`)
      return {}
    }

    const { name, region } = this.state

    if (!name) {
      console.log(`Aborting removal. Table name not found in state.`)
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
