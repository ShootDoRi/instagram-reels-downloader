!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "앱 데이터와 Instagram 로그인 세션을 삭제할까요?" IDNO keepAppData
  RMDir /r "$APPDATA\Instagram 릴스 다운로더"
  RMDir /r "$APPDATA\instagram-reels-downloader"
  RMDir /r "$LOCALAPPDATA\Instagram 릴스 다운로더"
  RMDir /r "$LOCALAPPDATA\instagram-reels-downloader"
  keepAppData:
!macroend
