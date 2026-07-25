using 'main.bicep'

param environment = 'dev'
param location = 'francecentral'
param deployContainerApp = false
param useOpenAi = 'false'

// Overridden at deploy time by deploy-infra-p1.ps1 (placeholders satisfy BCP258).
param postgresAdminPassword = 'replace-via-cli'
param appSecret = 'replace-via-cli'
