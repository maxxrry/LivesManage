# RNF-19 (D-44): programa respaldar.sh todos los días a las 23:00. Si el PC estaba apagado, corre al iniciar sesión.
# Se ejecuta una vez: powershell -ExecutionPolicy Bypass -File scripts\programar-respaldo.ps1
$script = Join-Path $PSScriptRoot 'respaldar.sh'
$bash = 'C:\Program Files\Git\bin\bash.exe'
if (-not (Test-Path $bash)) { throw "Falta Git Bash: $bash" }
# conhost --headless: para que no aparezca una ventana negra a esa hora.
$accion = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument "--headless `"$bash`" `"$script`""
$cuando = New-ScheduledTaskTrigger -Daily -At 23:00
# Los reintentos cubren el caso de que MySQL todavía esté arrancando.
$ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10)
Register-ScheduledTask -TaskName 'LivesManage respaldo diario' -Action $accion -Trigger $cuando -Settings $ajustes -Force | Out-Null
Write-Output 'Listo: respaldo diario programado a las 23:00.'
