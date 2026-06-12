/**
 * Proof of Concept: VMDetect Bypass Stub
 * 
 * Target: app.asar.unpacked/VMDetect.exe
 * Compile: csc /target:exe /out:VMDetect.exe fake-vmdetect.cs
 * 
 * When executed by the parent Electron application, it returns a hardcoded 
 * "all-clear" JSON response to bypass client-side virtualization restrictions.
 */

using System;

class FakeVMDetect {
    static void Main(string[] args) {
        // Output the exact JSON schema the Electron main process expects
        Console.WriteLine("{\"result\": \"ok\", \"status\": 0}");
    }
}
