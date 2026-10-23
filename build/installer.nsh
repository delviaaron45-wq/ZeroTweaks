; ZeroTweaks NSIS Installer Script
; Custom installer page for admin elevation confirmation

!include "MUI2.nsh"
!include "LogicLib.nsh"

; NOTE: electron-builder injects MUI_ICON / MUI_UNICON itself (from
; win.icon / nsis.installerIcon), so re-defining them here caused the
; "!define: MUI_ICON already defined!" build error. Do not add them back.

; Custom page for admin check
Page custom adminCheckPageCreate adminCheckPageLeave
Page directory
Page instfiles

UninstPage uninstConfirm
UninstPage instfiles

Function adminCheckPageCreate
  !insertmacro MUI_HEADER_TEXT "Administrator Rights Required" "ZeroTweaks requires administrator privileges to modify system settings."
  
  nsDialogs::Create 1018
  Pop $0
  
  ${If} $0 == error
    Abort
  ${EndIf}
  
  ${NSD_CreateLabel} 0 0 100% 12u "ZeroTweaks needs administrator access to:"
  Pop $0
  
  ${NSD_CreateLabel} 10u 20u 100% 12u "• Modify system registry (HKLM)"
  Pop $0
  ${NSD_CreateLabel} 10u 35u 100% 12u "• Manage system services"
  Pop $0
  ${NSD_CreateLabel} 10u 50u 100% 12u "• Configure power plans and timers"
  Pop $0
  ${NSD_CreateLabel} 10u 65u 100% 12u "• Create system restore points"
  Pop $0
  
  ${NSD_CreateLabel} 0 85u 100% 12u "The installer will request elevation automatically."
  Pop $0
  
  nsDialogs::Show
FunctionEnd

Function adminCheckPageLeave
  ; Check if running as admin
  UserInfo::GetAccountType
  Pop $0
  StrCmp $0 "Admin" 0 NotAdmin
  ; Already admin, continue
  Return
  
  ; NOTE: NSIS requires either no return-check, or a return-check followed by
  ; a destination label. A bare trailing "IDOK" is a usage error, so these use
  ; the simple form: show the message box and fall through to Abort/Quit.
  NotAdmin:
  MessageBox MB_OK|MB_ICONSTOP "This installer requires administrator privileges.$\n$\nPlease run as Administrator."
  Abort
FunctionEnd

; Custom uninstaller admin check.
; electron-builder already defines un.onInit (templates/nsis/uninstaller.nsh),
; so redefining it here caused "Function named un.onInit already exists!".
; The supported hook is the customUnInit macro, inserted inside their un.onInit.
!macro customUnInit
  UserInfo::GetAccountType
  Pop $0
  StrCmp $0 "Admin" 0 NotAdminUninstall
  Goto DoneUnAdminCheck

  NotAdminUninstall:
  MessageBox MB_OK|MB_ICONSTOP "Uninstaller requires administrator privileges.$\n$\nPlease run as Administrator."
  Quit

  DoneUnAdminCheck:
!macroend