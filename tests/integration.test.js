const { sleep, generateId, getCredentials, getServerlessSdk, getTable } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(30000)

const name = `aws-dynamodb-integration-tests-${generateId()}`

// the yaml file we're testing against
const instanceYaml = {
  org: 'serverlessinc',
  app: 'myApp',
  component: 'aws-dynamodb@dev',
  name,
  stage: 'dev',
  inputs: {
    deletionPolicy: 'delete',
    attributeDefinitions: [
      {
        AttributeName: 'attribute1',
        AttributeType: 'S'
      },
      {
        AttributeName: 'attribute2',
        AttributeType: 'N'
      }
    ],
    keySchema: [
      {
        AttributeName: 'attribute1',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'attribute2',
        KeyType: 'RANGE'
      }
    ], // local secondary indexes can only be added on table creation
    localSecondaryIndexes: [
      {
        IndexName: 'myLocalSecondaryIndex',
        Projection: {
          ProjectionType: 'KEYS_ONLY'
        },
        KeySchema: [
          {
            AttributeName: 'attribute1',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'attribute2',
            KeyType: 'RANGE'
          }
        ]
      }
    ]
  }
}

// get aws credentials from env
const credentials = getCredentials()

// get serverless access key from env and construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

// clean up the instance after tests
afterAll(async () => {
  await sdk.remove(instanceYaml, credentials)
})

it('should successfully deploy dynamodb table and local index', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials)

  await sleep(5000)

  const res = await getTable(credentials, name)

  expect(instance.outputs.name).toBeDefined()
  expect(instance.outputs.arn).toBeDefined()
  expect(res.Table.AttributeDefinitions.length).toEqual(2)
  expect(res.Table.KeySchema.length).toEqual(2)
  expect(res.Table.LocalSecondaryIndexes.length).toEqual(1)
})

// global secondary indexes take really long time to create.
// it causes the test to timeout and the remove operation to fail
// because another process is still in place

// as a result it
// it.skip('should successfully add global index', async () => {
//   instanceYaml.inputs.globalSecondaryIndexes = [
//     {
//       IndexName: 'myGlobalSecondaryIndex',
//       Projection: {
//         ProjectionType: 'KEYS_ONLY'
//       },
//       KeySchema: [
//         {
//           AttributeName: 'attribute1',
//           KeyType: 'HASH'
//         },
//         {
//           AttributeName: 'attribute2',
//           KeyType: 'RANGE'
//         }
//       ]
//     }
//   ]

//   await sdk.deploy(instanceYaml, credentials)

//   await sleep(5000)

//   const res = await getTable(credentials, name)

//   expect(res.Table.GlobalSecondaryIndexes.length).toEqual(1)
// })

it('should successfully remove dynamodb table', async () => {
  await sdk.remove(instanceYaml, credentials)

  await sleep(5000)

  // make sure table was actually removed
  let table
  try {
    table = await getTable(credentials, name)
  } catch (e) {
    if (e.code !== 'ResourceNotFoundException') {
      throw e
    }
  }

  expect(table).toBeUndefined()
})
