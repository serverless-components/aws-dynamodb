const { mergeDeepRight, pick, equals } = require('ramda')
const AWS = require('aws-sdk')
const { Component } = require('@serverless/core')
const { createTable, deleteTable, describeTable, updateTable, configChanged } = require('./utils')

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
  provisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1
  },
  region: 'us-east-1'
}

class AwsDynamoDb extends Component {
  async default(inputs = {}) {
    this.context.status('Deploying')
    const config = mergeDeepRight(defaults, inputs)

    config.name = this.state.name || this.context.resourceId()

    this.context.debug(
      `Starting deployment of table ${config.name} in the ${config.region} region.`
    )

    const dynamodb = new AWS.DynamoDB({
      region: config.region,
      credentials: this.context.credentials.aws
    })

    this.context.debug(
      `Checking if table ${config.name} already exists in the ${config.region} region.`
    )

    const prevTable = await describeTable({ dynamodb, name: config.name })

    if (!prevTable) {
      this.context.status('Creating')
      this.context.debug(`Table ${config.name} does not exist. Creating...`)

      config.arn = await createTable({ dynamodb, ...config })
    } else {
      this.context.debug(`Table ${config.name} already exists. Comparing config changes...`)

      config.arn = prevTable.arn

      if (configChanged(prevTable, config)) {
        this.context.status('Updating')
        this.context.debug(`Config changed for table ${config.name}. Updating...`)

        if (!equals(prevTable.name, config.name)) {
          await deleteTable({ dynamodb, name: prevTable.name })
          config.arn = await createTable({ dynamodb, ...config })
        } else {
          await updateTable({ dynamodb, ...config })
        }
      }
    }

    this.context.debug(
      `Table ${config.name} was successfully deployed to the ${config.region} region.`
    )

    this.state.arn = config.arn
    this.state.name = config.name
    this.state.region = config.region
    await this.save()

    const outputs = pick(outputsList, config)

    return outputs
  }

  async remove() {
    this.context.status('Removing')

    const { name, region } = this.state

    if (!name) {
      this.context.debug(`Aborting removal. Table name not found in state.`)
      return
    }

    const dynamodb = new AWS.DynamoDB({
      region,
      credentials: this.context.credentials.aws
    })

    this.context.debug(`Removing table ${name} from the ${region} region.`)

    await deleteTable({ dynamodb, name })

    const outputs = pick(outputsList, this.state)

    this.context.debug(`Table ${name} was successfully removed from the ${region} region.`)

    this.state = {}
    await this.save()

    return outputs
  }
}

module.exports = AwsDynamoDb
