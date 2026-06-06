param baseName string
param location string
param tags object

var environmentName = '${baseName}-aca-env'

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {}
}

output environmentId string = environment.id
output environmentName string = environment.name
