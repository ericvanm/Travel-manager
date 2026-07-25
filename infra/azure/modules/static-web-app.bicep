param location string
param namePrefix string

var staticSiteName = toLower(replace('${namePrefix}web', '-', ''))

resource staticSite 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticSiteName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

output defaultHostname string = staticSite.properties.defaultHostname
output name string = staticSite.name
