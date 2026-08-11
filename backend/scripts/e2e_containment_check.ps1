$base='http://localhost:3000/api'
$mgr='nazhif'
$pass='demo_password_only'
function jbody($o){ $o | ConvertTo-Json -Depth 10 }
function post($path,$body,$hdr){ Invoke-RestMethod -Uri ($base+$path) -Method Post -Body (jbody $body) -ContentType 'application/json' -Headers $hdr }
function get($path,$hdr){ Invoke-RestMethod -Uri ($base+$path) -Method Get -Headers $hdr }
function patch($path,$body,$hdr){ Invoke-RestMethod -Uri ($base+$path) -Method Patch -Body (jbody $body) -ContentType 'application/json' -Headers $hdr }
try {
  $login = post '/auth/login' @{ username=$mgr; password=$pass } @{}
  $mgrHdr = @{ Authorization = "Bearer $($login.data.token)"; 'Content-Type'='application/json' }
  $users = get '/users' $mgrHdr
  $assignee = $users.data | Where-Object { $_.role -eq 'worker' } | Select-Object -First 1
  if (-not $assignee) { Write-Error 'No worker found'; exit 1 }
  Write-Output "Found worker: $($assignee.username) (id $($assignee.id))"
  $cases = @('Segregated / On Hold','Not Yet Segregated')
  foreach ($containment in $cases) {
    $create = post '/defects' @{ product_id=1; batch_id=6; detected_at_stage='Sealing'; defect_type='Loose Sealing'; problem_level='Hold for Review'; description="Temp E2E $containment"; qty_affected=10; containment_status=$containment } $mgrHdr
    $def = $create.data
    Write-Output "`nCreated defect id=$($def.id) containment=$containment qty_on_hold at creation=$($def.qty_on_hold)"
    patch ("/defects/$($def.id)/start-review") @{} $mgrHdr | Out-Null
    $assign = post ("/corrective-actions/defects/$($def.id)/assign") @{ action_type='product_handling'; task='E2E handle'; assigned_to=$assignee.id; assigned_by=$login.data.user.id; due_date='2026-12-31'; priority='medium'; evidence_required=$false } $mgrHdr
    $action = $assign.data
    Write-Output "Assigned CA id=$($action.id)"
    $workerLogin = post '/auth/login' @{ username=$assignee.username; password=$pass } @{}
    $workerHdr = @{ Authorization = "Bearer $($workerLogin.data.token)"; 'Content-Type'='application/json' }
    $actionRes = get ("/corrective-actions/$($action.id)") $workerHdr
    $act = $actionRes.data
    Write-Output "Fetched CA: qty_affected=$($act.qty_affected) defect_containment_status=$($act.defect_containment_status) qty_on_hold_stored=$($act.qty_on_hold)"
    $affected = [int]($act.qty_affected)
    $relabelled = 4
    $computed = ( $act.defect_containment_status -eq 'No Hold Needed' ) ? 0 : ($affected - $relabelled)
    Write-Output "Computed on-hold before submit (with relabelled=4): $computed"
    patch ("/corrective-actions/$($action.id)/start") @{} $workerHdr | Out-Null
    patch ("/corrective-actions/$($action.id)/complete") @{ investigation_finding='e2e'; action_taken='e2e'; qty_relabelled=$relabelled; qty_repacked=0; qty_reworked=0; qty_discarded=0; qty_released=0; qty_on_hold=$computed } $workerHdr | Out-Null
    $after = get ("/defects/$($def.id)") $mgrHdr
    Write-Output "After CA complete defect qty_on_hold=$($after.data.qty_on_hold)"
  }
  Write-Output '\nE2E checks done'
} catch { Write-Error $_.Exception.Message; exit 2 }
