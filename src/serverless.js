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
  name: false,
  region: 'us-east-1'
}

const setTableName = (component, inputs, config) => {
  const generatedName = inputs.name || Math.random().toString(36).substring(6)

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
  async deploy(inputs = {}) {
    const config = mergeDeepRight(defaults, inputs)

    console.log(
      `Starting deployment of table ${config.name} in the ${config.region} region.`
    )

    const dynamodb = new AWS.DynamoDB({
      region: config.region,
      credentials: this.credentials.aws
    })

    console.log(
      `Checking if table ${config.name} already exists in the ${config.region} region.`
    )

    setTableName(this, inputs, config)

    const prevTable = await describeTable({ dynamodb, name: this.state.name })

    if (!prevTable) {
      console.log(`Table ${config.name} does not exist. Creating...`)

      config.arn = await createTable({ dynamodb, ...config })
    } else {
      console.log(`Table ${config.name} already exists. Comparing config changes...`)

      config.arn = prevTable.arn

      if (configChanged(prevTable, config)) {
        console.log(`Config changed for table ${config.name}. Updating...`)

        if (!equals(prevTable.name, config.name)) {
          // If "delete: false", don't delete the table
          if (config.delete === false) {
            throw new Error(`You're attempting to change your table name from ${this.state.name} to ${config.name} which will result in you deleting your table, but you've specified the "delete" input to "false" which prevents your original table from being deleted.`)
          }
          await deleteTable({ dynamodb, name: prevTable.name })
          config.arn = await createTable({ dynamodb, ...config })
        } else {
          await updateTable({ dynamodb, ...config })
        }
      }
    }

    console.log(
      `Table ${config.name} was successfully deployed to the ${config.region} region.`
    )

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
