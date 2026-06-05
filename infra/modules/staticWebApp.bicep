param baseName string
param location string
param tags object
param apiOrigin string
@secure()
param applicationInsightsConnectionString string

// SWA is deployed via GitHub Actions + deployment token (no repo link in Bicep).
var staticWebAppName = '${baseName}-mc'

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

resource appSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING: applicationInsightsConnectionString
    AGENTSENTRY_API_ORIGIN: 'https://${apiOrigin}'
  }
}

output defaultHostname string = staticWebApp.properties.defaultHostname
output staticWebAppName string = staticWebApp.name
