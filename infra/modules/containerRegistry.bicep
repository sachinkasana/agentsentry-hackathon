@minLength(5)
param baseName string
param location string
param tags object

var registryName = '${baseName}acr'

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
  }
}

output registryName string = registry.name
output loginServer string = registry.properties.loginServer
output registryId string = registry.id
