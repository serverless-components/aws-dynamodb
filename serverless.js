const { mergeDeepRight, pick, equals } = require('ramda')
const AWS = require('aws-sdk')
const { Component } = require('@serverless/core')
const { createTable, deleteTable, describeTable, updateTable, configChanged, validate, getStreamArn } = require('./utils')

const outputsList = ['name', 'arn', 'region', 'streamArn']

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

  region: 'us-east-1',
  name: false,
  stream: false,
  streamViewType: 'NEW_IMAGE'
}

const setTableName = (component, inputs, config) => {
  const generatedName = inputs.name
    ? `${inputs.name}-${component.context.resourceId()}`
    : component.context.resourceId()

  const hasDeployedBefore = 'nameInput' in component.state
  const givenNameHasNotChanged =
    component.state.nameInput && component.state.nameInput === inputs.name
  const bothLastAndCurrentDeployHaveNoNameDefined = !component.state.nameInput && !inputs.name

  config.name =
    hasDeployedBefore && (givenNameHasNotChanged || bothLastAndCurrentDeployHaveNoNameDefined)
      ? component.state.name
      : generatedName

  component.state.nameInput = inputs.name || false
}

class AwsDynamoDb extends Component {
  async default(inputs = {}) {
    this.context.status('Deploying')
    const config = mergeDeepRight(defaults, inputs)

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

    setTableName(this, inputs, config)

    const prevTable = await describeTable({ dynamodb, name: this.state.name })
    if (!prevTable) {
      validate.streamViewType(inputs)
      this.context.status('Creating')
      this.context.debug(`Table ${config.name} does not exist. Creating...`)

      const { tableArn, streamArn } = await createTable({ dynamodb, ...config })
      config.arn = tableArn
      config.streamArn = streamArn
    } else {
      validate.streamViewType(inputs)
      validate.streamViewTypeUpdate(this, prevTable, inputs)
      this.context.debug(`Table ${config.name} already exists. Comparing config changes...`)

      config.arn = prevTable.arn
      config.streamArn = prevTable.streamArn 
      config.streamEnabled = inputs.stream 
      config.streamViewType = inputs.streamViewType 
  
      if (configChanged(prevTable, config)) {
        this.context.status('Updating')
        this.context.debug(`Config changed for table ${config.name}. Updating...`)
   
        if (!equals(prevTable.name, config.name)) {
          // If "delete: false", don't delete the table
          if (config.delete === false) {
            throw new Error(`You're attempting to change your table name from ${this.state.name} to ${config.name} which will result in you deleting your table, but you've specified the "delete" input to "false" which prevents your original table from being deleted.`)
          }
    
          await deleteTable({ dynamodb, name: prevTable.name })
          config.arn = await createTable({ dynamodb, ...config })
        } else {
          const { streamArn } = await updateTable({ prevTable, dynamodb, ...config })
          config.streamArn = streamArn
        }
      }
    }

    this.context.debug(
      `Table ${config.name} was successfully deployed to the ${config.region} region.`
    )

    this.state.arn = config.arn
    this.state.name = config.name
    this.state.stream = config.streamArn
    this.state.streamViewType = config.streamViewType
    this.state.region = config.region
    this.state.delete = config.delete === false ? config.delete : true
    await this.save()

    const outputs = pick(outputsList, config)
    return outputs
  }

  async remove(inputs = {}) {
    this.context.status('Removing')

    // If "delete: false", don't delete the table, and warn instead
    if (this.state.delete === false) {
      this.context.debug(`Skipping table removal because "delete" is set to "false".`)
      return {}
    }

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
