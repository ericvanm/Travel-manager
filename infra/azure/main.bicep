@description('Environment name (dev, staging, prod).')
param environment string

@description('Azure region for regional resources.')
param location string = resourceGroup().location

@description('Short application name used in resource naming.')
param appName string = 'travelmgr'

@secure()
@description('PostgreSQL administrator password.')
param postgresAdminPassword string

@secure()
@description('Application session signing secret (SECRET env var).')
param appSecret string

@description('PostgreSQL administrator login name.')
param postgresAdminLogin string = 'travelmgradmin'

@description('When false, skips the Container App (use for first pass before ACR image exists).')
param deployContainerApp bool = true

@description('Container image including registry (required when deployContainerApp is true).')
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Frontend URL for password-reset links (Static Web App).')
param frontendUrl string = 'https://localhost'

@description('Public CORS origins for the API (comma-separated).')
param corsOrigins string = 'https://localhost'

@description('Region for Static Web Apps (limited SKUs/regions; may differ from main location).')
param staticWebAppLocation string = 'westus2'

@description('Enable OpenAI-backed features on the API.')
param useOpenAi string = 'false'

var namePrefix = '${appName}-${environment}'
var acrName = toLower(replace('${appName}${environment}acr', '-', ''))
var keyVaultName = take(replace('${namePrefix}-kv', '_', '-'), 24)

module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'log-analytics-${environment}'
  params: {
    location: location
    namePrefix: namePrefix
  }
}

module identity 'modules/identity.bicep' = {
  name: 'identity-${environment}'
  params: {
    location: location
    namePrefix: namePrefix
  }
}

module acr 'modules/acr.bicep' = {
  name: 'acr-${environment}'
  params: {
    location: location
    acrName: acrName
    acrPullPrincipalId: identity.outputs.principalId
  }
}

module postgresql 'modules/postgresql.bicep' = {
  name: 'postgresql-${environment}'
  params: {
    location: location
    namePrefix: namePrefix
    administratorLogin: postgresAdminLogin
    administratorPassword: postgresAdminPassword
  }
}

module staticWebApp 'modules/static-web-app.bicep' = {
  name: 'static-web-app-${environment}'
  params: {
    location: staticWebAppLocation
    namePrefix: namePrefix
  }
}

module keyVault 'modules/key-vault.bicep' = {
  name: 'key-vault-${environment}'
  params: {
    location: location
    keyVaultName: keyVaultName
    managedIdentityPrincipalId: identity.outputs.principalId
    appSecret: appSecret
    databaseUrl: postgresql.outputs.connectionString
  }
}

module containerApps 'modules/container-apps.bicep' = if (deployContainerApp) {
  name: 'container-apps-${environment}'
  params: {
    location: location
    namePrefix: namePrefix
    logAnalyticsCustomerId: logAnalytics.outputs.customerId
    logAnalyticsSharedKey: logAnalytics.outputs.sharedKey
    managedIdentityId: identity.outputs.id
    acrLoginServer: acr.outputs.loginServer
    keyVaultUri: keyVault.outputs.vaultUri
    containerImage: containerImage
    corsOrigins: corsOrigins
    frontendUrl: frontendUrl
    useOpenAi: useOpenAi
  }
}

output acrLoginServer string = acr.outputs.loginServer
output acrName string = acr.outputs.name
output apiUrl string = deployContainerApp ? containerApps!.outputs.apiUrl : ''
output apiFqdn string = deployContainerApp ? containerApps!.outputs.fqdn : ''
output staticWebAppDefaultHostname string = staticWebApp.outputs.defaultHostname
output staticWebAppUrl string = 'https://${staticWebApp.outputs.defaultHostname}'
output staticWebAppName string = staticWebApp.outputs.name
output keyVaultName string = keyVault.outputs.name
output postgresFqdn string = postgresql.outputs.fqdn
output managedIdentityClientId string = identity.outputs.clientId
output resourceGroupName string = resourceGroup().name
