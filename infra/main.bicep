targetScope = 'resourceGroup'

@description('Base name for all resources (lowercase alphanumeric, min 5 chars)')
@minLength(5)
@maxLength(20)
param baseName string = 'agentsentry'

@description('Azure region for API, ACR, App Insights, Container Apps (use centralindia for India)')
param location string = 'centralindia'

@description('Azure region for Static Web App (SWA not available in India — use southeastasia)')
param swaLocation string = 'southeastasia'

@description('Container image tag to deploy to Container Apps')
param imageTag string = 'latest'

@description('When false, only ACR/App Insights/ACA environment are deployed (image build comes next)')
param deployApplication bool = true

@description('Tags applied to all resources')
param tags object = {
  project: 'AgentSentry'
  component: 'mission-control'
}

var acrName = '${baseName}acr'

module appInsights 'modules/appInsights.bicep' = {
  name: 'appInsights'
  params: {
    baseName: baseName
    location: location
    tags: tags
  }
}

module registry 'modules/containerRegistry.bicep' = {
  name: 'containerRegistry'
  params: {
    baseName: baseName
    location: location
    tags: tags
  }
}

module managedEnvironment 'modules/managedEnvironment.bicep' = {
  name: 'managedEnvironment'
  params: {
    baseName: baseName
    location: location
    tags: tags
  }
}

module containerApp 'modules/containerApp.bicep' = if (deployApplication) {
  name: 'containerApp'
  params: {
    baseName: baseName
    location: location
    tags: tags
    containerImage: '${registry.outputs.loginServer}/agentsentry-api:${imageTag}'
    registryLoginServer: registry.outputs.loginServer
    registryName: acrName
    managedEnvironmentId: managedEnvironment.outputs.environmentId
    applicationInsightsConnectionString: appInsights.outputs.connectionString
  }
}

module staticWebApp 'modules/staticWebApp.bicep' = if (deployApplication) {
  name: 'staticWebApp'
  params: {
    baseName: baseName
    location: swaLocation
    tags: tags
    apiOrigin: containerApp!.outputs.fqdn
    applicationInsightsConnectionString: appInsights.outputs.connectionString
  }
}

output applicationInsightsConnectionString string = appInsights.outputs.connectionString
output applicationInsightsInstrumentationKey string = appInsights.outputs.instrumentationKey
output containerAppFqdn string = deployApplication ? containerApp!.outputs.fqdn : ''
output containerAppName string = deployApplication ? containerApp!.outputs.containerAppName : '${baseName}-api'
output acrLoginServer string = registry.outputs.loginServer
output acrName string = acrName
output staticWebAppHostname string = deployApplication ? staticWebApp!.outputs.defaultHostname : ''
output staticWebAppName string = deployApplication ? staticWebApp!.outputs.staticWebAppName : '${baseName}-mc'
output backendLocation string = location
output swaLocation string = swaLocation
