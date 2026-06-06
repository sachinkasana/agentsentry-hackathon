# Scales the AgentSentry Container App to zero replicas (stops compute billing).
param(
    [string]$ResourceGroup = "ms-ai-hackathon",
    [string]$ContainerAppName = "agentsentry-api"
)

$ErrorActionPreference = "Stop"
$apiVersion = "2024-03-01"

Connect-AzAccount -Identity | Out-Null
$subscriptionId = (Get-AzContext).Subscription.Id
$token = (Get-AzAccessToken -ResourceUrl "https://management.azure.com").Token

$baseUri = "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.App/containerApps/$ContainerAppName"
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type"  = "application/json"
}

$patchBody = @{
    properties = @{
        template = @{
            scale = @{
                minReplicas = 0
                maxReplicas = 0
            }
        }
    }
} | ConvertTo-Json -Depth 8

Write-Output "Scaling $ContainerAppName to 0 replicas in $ResourceGroup..."
Invoke-RestMethod -Uri "$baseUri`?api-version=$apiVersion" -Headers $headers -Method Patch -Body $patchBody | Out-Null
Write-Output "Container App scaled to zero."
