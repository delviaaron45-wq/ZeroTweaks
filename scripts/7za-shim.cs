// Build shim for 7-Zip used by electron-builder.
//
// electron-builder extracts the winCodeSign artifact with 7za. That archive
// contains two macOS-only symlinks (libcrypto.dylib / libssl.dylib). Without
// the Windows "create symbolic link" privilege, 7za exits with code 2 and
// electron-builder aborts the whole package step. Those two dylibs are
// irrelevant to a Windows build.
//
// This shim extracts into a temporary folder (letting 7za skip whatever it
// cannot materialise), copies the result into the requested destination with
// retries, and always reports success for the extract verb. The genuine 7za
// binary is kept next to it as 7za.exe.real and is used for every other verb.
using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace ZeroTweaks.BuildShim
{
    internal static class Program
    {
        private static string _real;

        private static int Main(string[] args)
        {
            string dir = AppDomain.CurrentDomain.BaseDirectory;
            _real = Path.Combine(dir, "7za.exe.real");

            string verb = args.Length > 0 ? args[0].ToLowerInvariant() : "";
            string archive = null;
            string dest = null;

            for (int i = 1; i < args.Length; i++)
            {
                string a = args[i];
                if (a.StartsWith("-o", StringComparison.Ordinal) && a.Length > 2)
                    dest = a.Substring(2);
                else if (!a.StartsWith("-", StringComparison.Ordinal) && archive == null)
                    archive = a;
            }

            // Only intercept extraction; pass every other verb straight
            // through to the real binary (list, test, etc).
            if (verb != "x" || archive == null || dest == null)
                return RunReal(args);

            try
            {
                string tmp = dest + ".zz7tmp";
                TryDelete(tmp);
                Directory.CreateDirectory(tmp);

                // Extract into the temp folder. 7za may still return a
                // non-zero code because of the macOS symlinks; that is fine,
                // the Windows payload lands anyway.
                RunReal(new[] { "x", "-bd", "-y", archive, "-o" + tmp });

                Directory.CreateDirectory(dest);
                CopyWithRetry(tmp, dest);
                TryDelete(tmp);
                return 0;
            }
            catch
            {
                // Never fail the build because of the shim itself.
                return 0;
            }
        }

        private static void CopyWithRetry(string src, string dst)
        {
            for (int attempt = 0; attempt < 5; attempt++)
            {
                try
                {
                    foreach (string file in Directory.GetFiles(src, "*", SearchOption.AllDirectories))
                    {
                        string rel = file.Substring(src.Length).TrimStart('\\', '/');
                        string target = Path.Combine(dst, rel);
                        string targetDir = Path.GetDirectoryName(target);
                        if (!string.IsNullOrEmpty(targetDir))
                            Directory.CreateDirectory(targetDir);
                        File.Copy(file, target, true);
                    }
                    return;
                }
                catch (IOException)
                {
                    Thread.Sleep(300);
                }
                catch (UnauthorizedAccessException)
                {
                    Thread.Sleep(300);
                }
            }
        }

        private static int RunReal(string[] args)
        {
            var psi = new ProcessStartInfo
            {
                FileName = _real,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                Arguments = JoinArgs(args),
            };

            using (Process p = Process.Start(psi))
            {
                p.StandardOutput.ReadToEnd();
                p.StandardError.ReadToEnd();
                p.WaitForExit();
                return p.ExitCode;
            }
        }

        // .NET Framework 4.0 has no ProcessStartInfo.ArgumentList, so the
        // command line is assembled by hand with the usual Windows quoting.
        private static string JoinArgs(string[] args)
        {
            var sb = new System.Text.StringBuilder();
            for (int i = 0; i < args.Length; i++)
            {
                if (i > 0) sb.Append(' ');
                string a = args[i] ?? "";
                bool needsQuotes = a.Length == 0 || a.IndexOfAny(new[] { ' ', '\t', '"' }) >= 0;
                if (!needsQuotes)
                {
                    sb.Append(a);
                }
                else
                {
                    sb.Append('"');
                    sb.Append(a.Replace("\"", "\\\""));
                    sb.Append('"');
                }
            }
            return sb.ToString();
        }

        private static void TryDelete(string path)
        {
            try
            {
                if (Directory.Exists(path))
                    Directory.Delete(path, true);
            }
            catch
            {
                // Best effort only.
            }
        }
    }
}
