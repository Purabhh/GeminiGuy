# window-icon.ps1 - gives the Mochee app window its real .ico in the taskbar.
#
# A Chrome --app window's taskbar button uses the page's 16px favicon, which
# Windows stretches into a blurry blob. Sending WM_SETICON does NOT help (Chrome
# ignores it for display). What works: give the window its own AppUserModelID
# plus RelaunchIconResource / RelaunchCommand / RelaunchDisplayNameResource,
# the same properties Chrome sets for installed web apps. The taskbar then
# draws mochee.ico at full resolution, and pinning the running window pins
# a proper "Mochee" entry that relaunches through the .vbs. The shortcuts
# carry the same AppUserModelID so the window groups under them.
#
# launch.bat starts this hidden after opening the window. It tags every app
# window (including ones opened later by a reattach) and exits once they close.
param(
  [string]$IconPath = (Join-Path $PSScriptRoot 'mochee.ico'),
  [string]$Launcher = (Join-Path $PSScriptRoot 'mochee.vbs'),
  [string]$AppId = 'PurabhApps.mochee',
  [string]$AppName = 'Mochee',
  [string]$ProfileMatch = 'mochee-chrome-profile'
)
$ErrorActionPreference = 'SilentlyContinue'

Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
[StructLayout(LayoutKind.Sequential, Pack = 4)]
public struct PROPERTYKEY { public Guid fmtid; public uint pid; }
[StructLayout(LayoutKind.Explicit)]
public struct PROPVARIANT { [FieldOffset(0)] public ushort vt; [FieldOffset(8)] public IntPtr p; }
[ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IPropertyStore {
  int GetCount(out uint c); int GetAt(uint i, out PROPERTYKEY k);
  int GetValue(ref PROPERTYKEY k, out PROPVARIANT v); int SetValue(ref PROPERTYKEY k, ref PROPVARIANT v); int Commit();
}
public static class AppWin {
  [DllImport("shell32.dll")] static extern int SHGetPropertyStoreForWindow(IntPtr h, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IPropertyStore s);
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  static readonly Guid AppUserModel = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3");

  public static List<IntPtr> Windows(HashSet<uint> pids) {
    var found = new List<IntPtr>();
    EnumWindows((h, l) => {
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (!pids.Contains(pid) || !IsWindowVisible(h) || GetWindow(h, 4) != IntPtr.Zero) return true; // 4 = GW_OWNER
      var c = new StringBuilder(64); GetClassName(h, c, 64);
      if (c.ToString().StartsWith("Chrome_WidgetWin")) found.Add(h);
      return true;
    }, IntPtr.Zero);
    return found;
  }
  static void Set(IPropertyStore s, uint pid, string val) {
    var k = new PROPERTYKEY { fmtid = AppUserModel, pid = pid };
    var v = new PROPVARIANT { vt = 31, p = Marshal.StringToCoTaskMemUni(val) };  // VT_LPWSTR
    s.SetValue(ref k, ref v);
  }
  // Relaunch properties first, ID last (the order Windows documents).
  public static bool Tag(IntPtr h, string id, string icon, string cmd, string name) {
    var iid = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"); IPropertyStore s;
    if (SHGetPropertyStoreForWindow(h, ref iid, out s) != 0) return false;
    Set(s, 2, cmd); Set(s, 3, icon); Set(s, 4, name); Set(s, 5, id);
    s.Commit();
    return true;
  }
}
'@

if (-not (Test-Path $IconPath)) { exit 1 }
$icon = (Resolve-Path $IconPath).Path + ',0'
$cmd = '"' + (Join-Path $env:WINDIR 'System32\wscript.exe') + '" "' + (Resolve-Path $Launcher).Path + '"'

$tagged = New-Object 'System.Collections.Generic.HashSet[long]'
$seen = $false
$misses = 0
$started = Get-Date
while ($true) {
  $pids = New-Object 'System.Collections.Generic.HashSet[uint32]'
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" |
    Where-Object { $_.CommandLine -match $ProfileMatch } |
    ForEach-Object { [void]$pids.Add([uint32]$_.ProcessId) }
  $wins = if ($pids.Count) { [AppWin]::Windows($pids) } else { @() }
  if ($wins.Count) {
    $seen = $true; $misses = 0
    foreach ($w in $wins) {
      if (-not $tagged.Contains([long]$w) -and [AppWin]::Tag($w, $AppId, $icon, $cmd, $AppName)) { [void]$tagged.Add([long]$w) }
    }
  } else {
    $misses++
    if (($seen -and $misses -ge 3) -or (-not $seen -and ((Get-Date) - $started).TotalSeconds -gt 30)) { break }
  }
  Start-Sleep -Milliseconds $(if (((Get-Date) - $started).TotalSeconds -lt 20) { 500 } else { 2000 })
}
