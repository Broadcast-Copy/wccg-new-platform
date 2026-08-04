' run-hidden.vbs - launches the given command line with no visible window.
' Used by WCCG scheduled tasks to stop the conhost console from flashing on
' screen every time a PowerShell-based task fires. Window mode 0 = hidden.
Set shell = CreateObject("WScript.Shell")
cmd = ""
For i = 0 To WScript.Arguments.Count - 1
  arg = WScript.Arguments(i)
  If InStr(arg, " ") > 0 Then arg = """" & arg & """"
  cmd = cmd & arg & " "
Next
shell.Run cmd, 0, False
